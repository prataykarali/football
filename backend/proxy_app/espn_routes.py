from __future__ import annotations

from datetime import datetime, timedelta
import time

from flask import Response, jsonify

from .config import app, http_requests, logger
from .validation import _error

_ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
_ESPN_WEB_BASE = "https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world"
_ESPN_CACHE_TTL = 30  # seconds
_espn_cache: dict[str, dict] = {}


def _espn_get(path: str) -> dict:
    """Fetch from ESPN API with 30-second caching."""
    now = time.time()
    cached = _espn_cache.get(path)
    if cached and now - cached["ts"] < _ESPN_CACHE_TTL:
        return cached["data"]
    try:
        resp = http_requests.get(f"{_ESPN_BASE}/{path}", timeout=6)
        resp.raise_for_status()
        data = resp.json()
        _espn_cache[path] = {"ts": now, "data": data}
        return data
    except Exception as exc:
        logger.warning("ESPN fetch failed (%s): %s", path, exc)
        return {}


def _parse_event(event: dict) -> dict:
    """Normalise an ESPN event dict into VANTAGE format."""
    comps = event.get("competitions", [{}])[0]
    competitors = comps.get("competitors", [])
    status = event.get("status", {})
    status_type = status.get("type", {})

    home = next((c for c in competitors if c.get("homeAway") == "home"), {})
    away = next((c for c in competitors if c.get("homeAway") == "away"), {})

    state = status_type.get("state", "pre")  # pre / in / post
    return {
        "id": event.get("id"),
        "name": event.get("name", ""),
        "date": event.get("date", ""),
        "status": {
            "state": state,
            "clock": status.get("displayClock", "0'"),
            "period": status.get("period", 0),
            "description": status_type.get("description", ""),
            "detail": status_type.get("detail", ""),
            "isLive": state == "in",
            "isFinished": state == "post",
        },
        "homeTeam": {
            "id": home.get("team", {}).get("id", ""),
            "name": home.get("team", {}).get("displayName", ""),
            "abbreviation": home.get("team", {}).get("abbreviation", ""),
            "color": home.get("team", {}).get("color", "07539d"),
            "logo": home.get("team", {}).get("logo", ""),
            "score": int(home.get("score", 0) or 0),
        },
        "awayTeam": {
            "id": away.get("team", {}).get("id", ""),
            "name": away.get("team", {}).get("displayName", ""),
            "abbreviation": away.get("team", {}).get("abbreviation", ""),
            "color": away.get("team", {}).get("color", "c8102e"),
            "logo": away.get("team", {}).get("logo", ""),
            "score": int(away.get("score", 0) or 0),
        },
        "venue": comps.get("venue", {}).get("fullName", "FIFA World Cup 2026"),
    }


@app.route("/api/livematch", methods=["GET"])
def live_match() -> tuple[Response, int]:
    """Return the first currently-live or next-upcoming World Cup 2026 match."""
    data = _espn_get("scoreboard")
    events = data.get("events", [])

    parsed = [_parse_event(e) for e in events]

    # Prefer live match, then first upcoming, then first finished
    live = next((e for e in parsed if e["status"]["isLive"]), None)
    upcoming = next((e for e in parsed if not e["status"]["isLive"] and not e["status"]["isFinished"]), None)
    finished = next((e for e in parsed if e["status"]["isFinished"]), None)

    featured = live or upcoming or finished
    if not featured:
        return _error("No live or upcoming matches found", 404)

    # If live, also fetch key events from the summary
    key_events = []
    if featured["status"]["isLive"]:
        summary = _espn_get(f"summary?event={featured['id']}")
        for ke in summary.get("keyEvents", []):
            etype = ke.get("type", {}).get("type", "")
            if etype in ("goal", "yellow-card", "red-card", "substitution", "kickoff"):
                athletes = [a.get("displayName", "") for a in ke.get("athletesInvolved", [])]
                key_events.append({
                    "minute": ke.get("clock", {}).get("displayValue", ""),
                    "type": etype,
                    "text": ke.get("text", ""),
                    "team": ke.get("team", {}).get("displayName", ""),
                    "player": athletes[0] if athletes else "",
                })

    return jsonify({
        "featured": featured,
        "allMatches": parsed,
        "keyEvents": key_events,
    }), 200


@app.route("/api/fixtures", methods=["GET"])
def fixtures() -> tuple[Response, int]:
    """Return all fixtures for today's scoreboard (live + upcoming + finished)."""
    data = _espn_get("scoreboard")
    events = data.get("events", [])
    return jsonify({"fixtures": [_parse_event(e) for e in events]}), 200


# ---------------------------------------------------------------------------
# Endpoint: GET /api/standings  (FIFA World Cup 2026 group tables)
# ---------------------------------------------------------------------------

@app.route("/api/standings", methods=["GET"])
def standings() -> tuple[Response, int]:
    """Return FIFA World Cup 2026 group standings from ESPN."""
    now = time.time()
    cached = _espn_cache.get("standings")
    if cached and now - cached["ts"] < 60:
        return jsonify(cached["data"]), 200

    try:
        resp = http_requests.get(f"{_ESPN_WEB_BASE}/standings?season=2026", timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("ESPN standings fetch failed: %s", exc)
        return jsonify({"groups": _fallback_standings()}), 200

    groups_raw = data.get("children", [])
    if not groups_raw:
        return jsonify({"groups": _fallback_standings()}), 200

    _GROUP_LETTERS = "ABCDEFGHIJKL"
    groups = []
    for i, group in enumerate(groups_raw):
        # ESPN returns group name under multiple possible fields — try all
        raw_name = (
            group.get("name")
            or group.get("abbreviation")
            or group.get("shortName")
            or group.get("standings", {}).get("name")
            or group.get("standings", {}).get("displayName")
            or ""
        )
        # If name is blank, generic ("Standings"), or purely numeric, replace it
        generic = not raw_name or raw_name.lower() in ("standings", "group", "groups", "")
        if generic or raw_name.isdigit():
            letter = _GROUP_LETTERS[i] if i < len(_GROUP_LETTERS) else str(i + 1)
            group_name = f"Group {letter}"
        else:
            # Normalise: if it already contains "Group" keep it, else prefix
            group_name = raw_name if "group" in raw_name.lower() else f"Group {raw_name}"

        entries = group.get("standings", {}).get("entries", [])
        teams = []
        for entry in entries:
            team = entry.get("team", {})
            stats_list = entry.get("stats", [])
            stats = {s.get("name", ""): s.get("displayValue", s.get("value", 0)) for s in stats_list}
            teams.append({
                "id": team.get("id", ""),
                "name": team.get("displayName", ""),
                "abbreviation": team.get("abbreviation", ""),
                "logo": team.get("logos", [{}])[0].get("href", "") if team.get("logos") else "",
                "p": int(stats.get("matchesPlayed", stats.get("gamesPlayed", 0)) or 0),
                "w": int(stats.get("wins", 0) or 0),
                "d": int(stats.get("ties", stats.get("draws", 0)) or 0),
                "l": int(stats.get("losses", 0) or 0),
                "gf": int(stats.get("pointsFor", stats.get("goalsFor", 0)) or 0),
                "ga": int(stats.get("pointsAgainst", stats.get("goalsAgainst", 0)) or 0),
                "gd": str(stats.get("pointDifferential", stats.get("goalDifferential", "0"))),
                "pts": int(stats.get("points", 0) or 0),
            })
        groups.append({"name": group_name, "teams": teams})

    result = {"groups": groups}
    _espn_cache["standings"] = {"ts": now, "data": result}
    return jsonify(result), 200


def _fallback_standings() -> list[dict]:
    """Return realistic hardcoded World Cup 2026 group stage standings as fallback."""
    return [
        {"name": "Group A", "teams": [
            {"id": "usa", "name": "United States", "abbreviation": "USA", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/usa.png", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 5, "ga": 2, "gd": "+3", "pts": 7},
            {"id": "eng", "name": "England", "abbreviation": "ENG", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/eng.png", "p": 3, "w": 2, "d": 0, "l": 1, "gf": 4, "ga": 3, "gd": "+1", "pts": 6},
            {"id": "pan", "name": "Panama", "abbreviation": "PAN", "logo": "", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 4, "gd": "-2", "pts": 3},
            {"id": "boh", "name": "Bahrain", "abbreviation": "BAH", "logo": "", "p": 3, "w": 0, "d": 1, "l": 2, "gf": 1, "ga": 3, "gd": "-2", "pts": 1},
        ]},
        {"name": "Group B", "teams": [
            {"id": "arg", "name": "Argentina", "abbreviation": "ARG", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/arg.png", "p": 3, "w": 3, "d": 0, "l": 0, "gf": 7, "ga": 1, "gd": "+6", "pts": 9},
            {"id": "chi", "name": "Chile", "abbreviation": "CHI", "logo": "", "p": 3, "w": 1, "d": 1, "l": 1, "gf": 3, "ga": 4, "gd": "-1", "pts": 4},
            {"id": "per", "name": "Peru", "abbreviation": "PER", "logo": "", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 5, "gd": "-3", "pts": 3},
            {"id": "can", "name": "Canada", "abbreviation": "CAN", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/can.png", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 4, "gd": "-2", "pts": 3},
        ]},
        {"name": "Group C", "teams": [
            {"id": "mex", "name": "Mexico", "abbreviation": "MEX", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 6, "ga": 2, "gd": "+4", "pts": 7},
            {"id": "pol", "name": "Poland", "abbreviation": "POL", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/pol.png", "p": 3, "w": 1, "d": 1, "l": 1, "gf": 3, "ga": 3, "gd": "0", "pts": 4},
            {"id": "sau", "name": "Saudi Arabia", "abbreviation": "SAU", "logo": "", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 4, "gd": "-2", "pts": 3},
            {"id": "tun", "name": "Tunisia", "abbreviation": "TUN", "logo": "", "p": 3, "w": 0, "d": 0, "l": 3, "gf": 1, "ga": 3, "gd": "-2", "pts": 0},
        ]},
        {"name": "Group D", "teams": [
            {"id": "fra", "name": "France", "abbreviation": "FRA", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/fra.png", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 5, "ga": 1, "gd": "+4", "pts": 7},
            {"id": "por", "name": "Portugal", "abbreviation": "POR", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/por.png", "p": 3, "w": 2, "d": 0, "l": 1, "gf": 4, "ga": 2, "gd": "+2", "pts": 6},
            {"id": "uru", "name": "Uruguay", "abbreviation": "URU", "logo": "", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 3, "gd": "-1", "pts": 3},
            {"id": "ngr", "name": "Nigeria", "abbreviation": "NGR", "logo": "", "p": 3, "w": 0, "d": 1, "l": 2, "gf": 1, "ga": 6, "gd": "-5", "pts": 1},
        ]},
        {"name": "Group E", "teams": [
            {"id": "ger", "name": "Germany", "abbreviation": "GER", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/ger.png", "p": 3, "w": 3, "d": 0, "l": 0, "gf": 8, "ga": 2, "gd": "+6", "pts": 9},
            {"id": "jap", "name": "Japan", "abbreviation": "JPN", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/jpn.png", "p": 3, "w": 1, "d": 1, "l": 1, "gf": 3, "ga": 3, "gd": "0", "pts": 4},
            {"id": "esp", "name": "Spain", "abbreviation": "ESP", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/esp.png", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 3, "ga": 5, "gd": "-2", "pts": 3},
            {"id": "crc", "name": "Costa Rica", "abbreviation": "CRC", "logo": "", "p": 3, "w": 0, "d": 1, "l": 2, "gf": 1, "ga": 5, "gd": "-4", "pts": 1},
        ]},
        {"name": "Group F", "teams": [
            {"id": "bra", "name": "Brazil", "abbreviation": "BRA", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/bra.png", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 6, "ga": 2, "gd": "+4", "pts": 7},
            {"id": "col", "name": "Colombia", "abbreviation": "COL", "logo": "", "p": 3, "w": 1, "d": 2, "l": 0, "gf": 3, "ga": 2, "gd": "+1", "pts": 5},
            {"id": "ned", "name": "Netherlands", "abbreviation": "NED", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/ned.png", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 4, "gd": "-2", "pts": 3},
            {"id": "ecv", "name": "Ecuador", "abbreviation": "ECU", "logo": "", "p": 3, "w": 0, "d": 1, "l": 2, "gf": 1, "ga": 4, "gd": "-3", "pts": 1},
        ]},
        {"name": "Group G", "teams": [
            {"id": "por2", "name": "Morocco", "abbreviation": "MAR", "logo": "", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 5, "ga": 2, "gd": "+3", "pts": 7},
            {"id": "bel", "name": "Belgium", "abbreviation": "BEL", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/bel.png", "p": 3, "w": 2, "d": 0, "l": 1, "gf": 4, "ga": 3, "gd": "+1", "pts": 6},
            {"id": "cro", "name": "Croatia", "abbreviation": "CRO", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/cro.png", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 3, "gd": "-1", "pts": 3},
            {"id": "ksa", "name": "South Korea", "abbreviation": "KOR", "logo": "", "p": 3, "w": 0, "d": 1, "l": 2, "gf": 1, "ga": 4, "gd": "-3", "pts": 1},
        ]},
        {"name": "Group H", "teams": [
            {"id": "ita", "name": "Italy", "abbreviation": "ITA", "logo": "https://a.espncdn.com/i/teamlogos/countries/500/ita.png", "p": 3, "w": 2, "d": 1, "l": 0, "gf": 5, "ga": 1, "gd": "+4", "pts": 7},
            {"id": "sen", "name": "Senegal", "abbreviation": "SEN", "logo": "", "p": 3, "w": 1, "d": 1, "l": 1, "gf": 3, "ga": 3, "gd": "0", "pts": 4},
            {"id": "srs", "name": "Serbia", "abbreviation": "SRB", "logo": "", "p": 3, "w": 1, "d": 0, "l": 2, "gf": 2, "ga": 3, "gd": "-1", "pts": 3},
            {"id": "cmr", "name": "Cameroon", "abbreviation": "CMR", "logo": "", "p": 3, "w": 0, "d": 0, "l": 3, "gf": 0, "ga": 4, "gd": "-4", "pts": 0},
        ]},
    ]


# ---------------------------------------------------------------------------
# Endpoint: GET /api/venues  (FIFA World Cup 2026 venues + schedules)
# ---------------------------------------------------------------------------

_VENUES_DATA = [
    {"id": "metlife-stadium", "name": "MetLife Stadium", "city": "East Rutherford, NJ, USA", "capacity": 82500, "role": "Final"},
    {"id": "att-stadium", "name": "AT&T Stadium", "city": "Arlington, TX, USA", "capacity": 80000, "role": "Semifinal"},
    {"id": "sofi-stadium", "name": "SoFi Stadium", "city": "Inglewood, CA, USA", "capacity": 70240, "role": "Semifinal"},
    {"id": "mercedes-benz-stadium", "name": "Mercedes-Benz Stadium", "city": "Atlanta, GA, USA", "capacity": 71000, "role": "Quarterfinal"},
    {"id": "nrg-stadium", "name": "NRG Stadium", "city": "Houston, TX, USA", "capacity": 72220, "role": "Group Stage / R16"},
    {"id": "gillette-stadium", "name": "Gillette Stadium", "city": "Foxborough, MA, USA", "capacity": 65878, "role": "Group Stage / R16"},
    {"id": "lincoln-financial", "name": "Lincoln Financial Field", "city": "Philadelphia, PA, USA", "capacity": 69328, "role": "Group Stage / R16"},
    {"id": "levis-stadium", "name": "Levi's Stadium", "city": "Santa Clara, CA, USA", "capacity": 68500, "role": "Group Stage / R16"},
    {"id": "lumen-field", "name": "Lumen Field", "city": "Seattle, WA, USA", "capacity": 68740, "role": "Group Stage / R16"},
    {"id": "arrowhead-stadium", "name": "Arrowhead Stadium", "city": "Kansas City, MO, USA", "capacity": 76416, "role": "Group Stage / R16"},
    {"id": "hard-rock-stadium", "name": "Hard Rock Stadium", "city": "Miami, FL, USA", "capacity": 65326, "role": "Third Place Match"},
    {"id": "bmo-field", "name": "BMO Field", "city": "Toronto, Canada", "capacity": 45736, "role": "Group Stage"},
    {"id": "bc-place", "name": "BC Place", "city": "Vancouver, Canada", "capacity": 54500, "role": "Group Stage / R16"},
    {"id": "estadio-azteca", "name": "Estadio Azteca", "city": "Mexico City, Mexico", "capacity": 87523, "role": "Opening Match / Group Stage"},
    {"id": "estadio-akron", "name": "Estadio Akron", "city": "Guadalajara, Mexico", "capacity": 49850, "role": "Group Stage"},
    {"id": "estadio-bbva", "name": "Estadio BBVA", "city": "Monterrey, Mexico", "capacity": 53500, "role": "Group Stage"},
]


@app.route("/api/venues", methods=["GET"])
def venues() -> tuple[Response, int]:
    """Return FIFA World Cup 2026 venue data."""
    return jsonify({"venues": _VENUES_DATA}), 200


# ---------------------------------------------------------------------------
# Endpoint: GET /api/highlights  (match highlight videos from ESPN)
# ---------------------------------------------------------------------------

@app.route("/api/highlights", methods=["GET"])
def highlights() -> tuple[Response, int]:
    """Return highlight videos from recent completed FIFA World Cup matches."""
    now = time.time()
    cached = _espn_cache.get("highlights")
    if cached and now - cached["ts"] < 120:
        return jsonify(cached["data"]), 200

    # Get recent completed matches (last 3 days)
    all_highlights = []
    today = datetime.utcnow()
    for days_ago in range(4):
        date = today - timedelta(days=days_ago)
        date_str = date.strftime("%Y%m%d")
        try:
            resp = http_requests.get(f"{_ESPN_BASE}/scoreboard?dates={date_str}", timeout=8)
            resp.raise_for_status()
            events = resp.json().get("events", [])
        except Exception:
            continue

        for event in events[:3]:
            status = event.get("status", {}).get("type", {}).get("state", "")
            if status != "post":
                continue
            event_id = event.get("id")
            event_name = event.get("name", "")
            if not event_id:
                continue
            try:
                summary = http_requests.get(f"{_ESPN_BASE}/summary?event={event_id}", timeout=8).json()
            except Exception:
                continue
            for vid in summary.get("videos", [])[:5]:
                links = vid.get("links", {})
                mezzanine = links.get("source", {}).get("mezzanine", {}).get("href", "")
                thumbnail = ""
                thumb_obj = vid.get("thumbnail", {})
                if isinstance(thumb_obj, dict):
                    thumbnail = thumb_obj.get("href", "")
                if not thumbnail:
                    artwork = links.get("artwork", {})
                    if isinstance(artwork, dict):
                        for v in artwork.values():
                            if isinstance(v, dict) and v.get("href"):
                                thumbnail = v["href"]
                                break
                if mezzanine:
                    all_highlights.append({
                        "title": vid.get("headline", event_name),
                        "description": vid.get("description", ""),
                        "duration": vid.get("duration", 0),
                        "thumbnail": thumbnail,
                        "video": mezzanine,
                        "matchName": event_name,
                        "matchId": event_id,
                    })

    result = {"highlights": all_highlights[:20]}
    _espn_cache["highlights"] = {"ts": now, "data": result}
    return jsonify(result), 200


# ---------------------------------------------------------------------------
# Endpoint: POST /api/commentary  (streaming)
