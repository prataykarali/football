from __future__ import annotations

import json
import logging
from datetime import datetime
from json import JSONDecodeError
from pathlib import Path

from flask import Response, jsonify, request

from .config import app

logger = logging.getLogger(__name__)

LEADERBOARD_FILE = Path(__file__).resolve().parent.parent / "leaderboard.json"

_DEFAULT_LEADERBOARD = [
    {"id": "p1", "name": "KolkataFan2am", "score": 140, "streak": 4, "correctCount": 12},
    {"id": "p2", "name": "MessiMagic10", "score": 125, "streak": 2, "correctCount": 11},
    {"id": "p3", "name": "TacticalGuru", "score": 110, "streak": 0, "correctCount": 9},
    {"id": "p4", "name": "NightOwl_ARG", "score": 95, "streak": 1, "correctCount": 8},
    {"id": "p5", "name": "You (Fan)", "score": 0, "streak": 0, "correctCount": 0},
]


def _safe_int(value, default: int = 0) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(0, number)


def _normalise_player(player: dict) -> dict:
    return {
        "id": str(player.get("id", ""))[:64],
        "name": str(player.get("name", "Fan"))[:80],
        "score": _safe_int(player.get("score")),
        "streak": _safe_int(player.get("streak")),
        "correctCount": _safe_int(player.get("correctCount")),
    }


def _load_leaderboard():
    if LEADERBOARD_FILE.exists():
        try:
            with LEADERBOARD_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return [_normalise_player(player) for player in data if isinstance(player, dict)]
            logger.warning("Leaderboard file did not contain a list; using defaults.")
        except (OSError, JSONDecodeError) as exc:
            logger.warning("Could not read leaderboard file %s: %s", LEADERBOARD_FILE, exc)
    return [dict(player) for player in _DEFAULT_LEADERBOARD]


def _save_leaderboard(data):
    try:
        LEADERBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LEADERBOARD_FILE.open("w", encoding="utf-8") as f:
            json.dump([_normalise_player(player) for player in data], f)
    except OSError as exc:
        logger.warning("Could not write leaderboard file %s: %s", LEADERBOARD_FILE, exc)

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard() -> Response:
    """Get the current leaderboard with simulated live score drift for AI players."""
    leaderboard = _load_leaderboard()
    # Simulate other players being active: apply a small deterministic bump
    # based on current minute so scores drift realistically without being random
    minute_seed = datetime.utcnow().minute
    ai_bumps = [minute_seed % 3, minute_seed % 5, (minute_seed + 2) % 4, (minute_seed + 1) % 3]
    for idx, pid in enumerate(["p1", "p2", "p3", "p4"]):
        player = next((p for p in leaderboard if p["id"] == pid), None)
        if player:
            bump = ai_bumps[idx]
            player["score"] = _safe_int(player.get("score")) + bump
            if bump > 0:
                player["correctCount"] = _safe_int(player.get("correctCount")) + (1 if bump >= 3 else 0)
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(leaderboard)

@app.route("/api/leaderboard/update", methods=["POST"])
def update_leaderboard() -> tuple[Response, int]:
    """Update a player's score in the real-time leaderboard."""
    data = request.get_json(silent=True) or {}
    player_id = data.get("id")
    score = data.get("score")
    streak = data.get("streak")
    correct_count = data.get("correctCount")

    if not player_id:
        return jsonify({"error": "id is required"}), 400
    if not isinstance(player_id, str) or len(player_id) > 64:
        return jsonify({"error": "id is invalid"}), 400

    leaderboard = _load_leaderboard()
    for p in leaderboard:
        if p["id"] == player_id:
            if score is not None:
                p["score"] = _safe_int(score)
            if streak is not None:
                p["streak"] = _safe_int(streak)
            if correct_count is not None:
                p["correctCount"] = _safe_int(correct_count)
            break

    # Sort by score descending
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    _save_leaderboard(leaderboard)
    return jsonify({"status": "ok", "leaderboard": leaderboard}), 200


# ---------------------------------------------------------------------------
# Health-check
