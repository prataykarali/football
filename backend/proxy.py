"""
VANTAGE Proxy — Flask backend that mediates all Gemini API calls.

Features:
    • Commentary generation (streaming)
    • Vision-based player identification
    • Quiz / prediction question generation
    • Translation
    • Catch-up summary generation
    • Per-endpoint token-bucket rate limiting
    • Strict security headers on every response
    • Input validation with size and schema checks

Environment:
    GEMINI_API_KEY  — loaded from .env via python-dotenv
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

import google.generativeai as genai

from pulse import pulse_bp

# ---------------------------------------------------------------------------
# Configuration & Initialisation
# ---------------------------------------------------------------------------

# Load .env from the same directory as this file
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.  Add it to backend/.env")

genai.configure(api_key=GEMINI_API_KEY)

# Model handles
TEXT_MODEL = genai.GenerativeModel("gemini-2.5-flash")
VISION_MODEL = genai.GenerativeModel("gemini-2.5-flash")

# Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.register_blueprint(pulse_bp)

# Logging — never expose internals to the client
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_LANGUAGES = {
    "en", "es", "fr", "de", "it", "pt", "ar", "hi", "zh", "ja",
    "ko", "nl", "ru", "tr", "pl", "sv", "da", "no", "fi", "cs",
    "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ur",
    "id", "vi", "th", "ms", "fil", "uk", "he", "fa", "el", "ro",
    "hu", "sk", "bg", "hr", "sr", "sl", "et", "lv", "lt", "is",
    "ga", "cy", "sq", "mk", "hy", "ka", "az", "kk", "uz",
}

MAX_STRING_LENGTH = 5000
MAX_EVENTS = 50
MAX_FRAME_BYTES = 4 * 1024 * 1024  # 4 MB decoded

VALID_PACES = {"slow", "medium", "fast"}
VALID_REGISTERS = {"casual", "tactical"}

REQUIRED_EVENT_FIELDS = {"type", "minute", "player", "team"}

# ---------------------------------------------------------------------------
# Rate Limiter (in-memory token bucket per endpoint)
# ---------------------------------------------------------------------------

_rate_buckets: dict[str, list[float]] = {}
RATE_LIMIT_MAX = 10        # requests
RATE_LIMIT_WINDOW = 60.0   # seconds


def _is_rate_limited(endpoint: str) -> bool:
    """Return True if the endpoint has exceeded 10 requests/min."""
    now = time.time()
    bucket = _rate_buckets.setdefault(endpoint, [])
    # Prune timestamps older than the window
    _rate_buckets[endpoint] = [ts for ts in bucket if now - ts < RATE_LIMIT_WINDOW]
    bucket = _rate_buckets[endpoint]
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(now)
    return False


# ---------------------------------------------------------------------------
# Security Headers (applied to EVERY response)
# ---------------------------------------------------------------------------

SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-XSS-Protection": "0",
}


@app.after_request
def _apply_security_headers(response: Response) -> Response:
    """Attach hardened security headers to every outgoing response."""
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_string(value: Any, name: str, max_len: int = MAX_STRING_LENGTH) -> str | None:
    """Return an error message if *value* is not a valid string, else None."""
    if not isinstance(value, str):
        return f"{name} must be a string"
    if len(value) > max_len:
        return f"{name} exceeds maximum length ({max_len})"
    return None


def _validate_event(event: Any) -> str | None:
    """Return an error message if *event* dict is invalid, else None."""
    if not isinstance(event, dict):
        return "Each event must be an object"
    missing = REQUIRED_EVENT_FIELDS - set(event.keys())
    if missing:
        return f"Event missing required fields: {', '.join(sorted(missing))}"
    for field in REQUIRED_EVENT_FIELDS:
        if field == "minute":
            if not isinstance(event[field], (int, float)):
                return "event.minute must be a number"
        else:
            err = _validate_string(event[field], f"event.{field}", max_len=200)
            if err:
                return err
    return None


def _validate_events(events: Any) -> str | None:
    """Validate an events list."""
    if not isinstance(events, list):
        return "events must be an array"
    if len(events) == 0:
        return "events array must not be empty"
    if len(events) > MAX_EVENTS:
        return f"events array exceeds maximum length ({MAX_EVENTS})"
    for i, ev in enumerate(events):
        err = _validate_event(ev)
        if err:
            return f"events[{i}]: {err}"
    return None


def _fallback_quiz(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a valid grounded quiz if the model call fails."""
    event = events[-1]
    player = event.get("player") or event.get("team") or "the next attacker"
    event_type = str(event.get("type", "moment")).replace("_", " ")
    minute = event.get("minute", 0)
    team = event.get("team", "their team")
    return {
        "id": str(uuid.uuid4()),
        "question": f"After {player}'s {event_type} at {minute}', what happens next?",
        "options": [
            f"{team} create another chance",
            "The opponent wins possession",
            "The referee stops play",
            "The tempo slows down",
        ],
        "correctIndex": None,
        "expiresIn": 75,
        "groundedEvent": f"[{minute}'] {player} ({team}): {event_type}",
        "fallback": True,
    }


def _validate_base64_frame(frame: Any) -> str | None:
    """Validate a base64-encoded image frame."""
    if not isinstance(frame, str):
        return "frame must be a base64 string"
    if len(frame) == 0:
        return "frame must not be empty"
    # Quick length check before decoding (base64 expands ~4/3)
    if len(frame) * 3 / 4 > MAX_FRAME_BYTES:
        return f"Decoded frame exceeds maximum size ({MAX_FRAME_BYTES} bytes)"
    try:
        decoded = base64.b64decode(frame, validate=True)
    except Exception:
        return "frame is not valid base64"
    if len(decoded) > MAX_FRAME_BYTES:
        return f"Decoded frame exceeds maximum size ({MAX_FRAME_BYTES} bytes)"
    return None


def _error(message: str, status: int = 400) -> tuple[Response, int]:
    """Return a JSON error response."""
    return jsonify({"error": message}), status


# ---------------------------------------------------------------------------
# Endpoint: POST /api/commentary  (streaming)
# ---------------------------------------------------------------------------

@app.route("/api/commentary", methods=["POST"])
def commentary() -> Response | tuple[Response, int]:
    """Generate AI commentary for a football event.

    Streams Gemini-generated text back to the client in real-time.
    """
    if _is_rate_limited("commentary"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    # -- event --
    event = data.get("event")
    if event is None:
        return _error("event is required")
    err = _validate_event(event)
    if err:
        return _error(err)

    # -- language --
    language = data.get("language", "en")
    err = _validate_string(language, "language", max_len=10)
    if err:
        return _error(err)
    if language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported language: {language}")

    # -- pace / register --
    pace = data.get("pace", "medium")
    if pace not in VALID_PACES:
        return _error(f"pace must be one of: {', '.join(sorted(VALID_PACES))}")

    register = data.get("register", "casual")
    if register not in VALID_REGISTERS:
        return _error(f"register must be one of: {', '.join(sorted(VALID_REGISTERS))}")

    # -- Build prompt --
    pace_instruction = {
        "slow": "Use long, dramatic sentences with vivid descriptions.",
        "medium": "Use a balanced mix of excitement and clarity.",
        "fast": "Use short, punchy sentences. Be rapid-fire.",
    }[pace]

    register_instruction = {
        "casual": "Use casual, fan-friendly language. Add excitement and emotion.",
        "tactical": "Use precise tactical language. Reference formations, positioning, and strategy.",
    }[register]

    prompt = (
        f"You are an elite football commentator. Generate live commentary for this event.\n\n"
        f"Event type: {event['type']}\n"
        f"Minute: {event['minute']}\n"
        f"Player: {event['player']}\n"
        f"Team: {event['team']}\n"
        f"Details: {event.get('details', 'N/A')}\n\n"
        f"Language: {language}\n"
        f"Pace: {pace_instruction}\n"
        f"Style: {register_instruction}\n\n"
        f"Generate 2-4 sentences of natural, broadcast-quality commentary. "
        f"Do NOT include any metadata or labels — just the commentary itself."
    )

    def _generate():
        try:
            response = TEXT_MODEL.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as exc:
            logger.error("Gemini commentary error: %s", exc)
            yield "[Commentary generation error]"

    return Response(
        stream_with_context(_generate()),
        content_type="text/plain; charset=utf-8",
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/vision
# ---------------------------------------------------------------------------

@app.route("/api/vision", methods=["POST"])
def vision() -> tuple[Response, int]:
    """Identify a football player from a base64-encoded image frame."""
    if _is_rate_limited("vision"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    frame_b64 = data.get("frame")
    if frame_b64 is None:
        return _error("frame is required")

    err = _validate_base64_frame(frame_b64)
    if err:
        return _error(err)

    prompt = (
        "You are a football player identification expert. "
        "Analyse the image and identify the football player shown.\n\n"
        "Respond ONLY with valid JSON in this exact schema (no markdown fences):\n"
        "{\n"
        '  "player": "<full name>",\n'
        '  "confidence": <0.0-1.0>,\n'
        '  "position": "<playing position>",\n'
        '  "nationality": "<country>",\n'
        '  "stats": {"goals": <int>, "assists": <int>, "passes": <int>},\n'
        '  "funFact": "<one interesting fact>"\n'
        "}\n\n"
        "If you cannot identify the player, set confidence to 0.0 and player to \"Unknown\"."
    )

    try:
        decoded = base64.b64decode(frame_b64)
        image_part = {"mime_type": "image/jpeg", "data": decoded}
        response = VISION_MODEL.generate_content([prompt, image_part])
        raw_text = response.text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)

        # Confidence gating
        confidence = float(result.get("confidence", 0.0))
        if confidence < 0.7:
            result["isUncertain"] = True

        return jsonify(result), 200

    except json.JSONDecodeError:
        logger.error("Gemini vision returned non-JSON: %s", raw_text[:200])
        return _error("Failed to parse player identification result", 502)
    except Exception as exc:
        logger.error("Gemini vision error: %s", exc)
        return _error("Player identification failed", 502)


# ---------------------------------------------------------------------------
# Endpoint: POST /api/quiz
# ---------------------------------------------------------------------------

@app.route("/api/quiz", methods=["POST"])
def quiz() -> tuple[Response, int]:
    """Generate a prediction / quiz question based on match events."""
    if _is_rate_limited("quiz"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    events = data.get("events")
    if events is None:
        return _error("events is required")

    err = _validate_events(events)
    if err:
        return _error(err)

    events_text = "\n".join(
        f"- [{ev['minute']}'] {ev['player']} ({ev['team']}): {ev['type']}"
        for ev in events
    )

    prompt = (
        "You are a football quiz master. Based on these match events, "
        "generate ONE engaging prediction question for fans watching live.\n\n"
        f"Match events so far:\n{events_text}\n\n"
        "Respond ONLY with valid JSON (no markdown fences):\n"
        "{\n"
        '  "question": "<the prediction question>",\n'
        '  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],\n'
        '  "correctIndex": null,\n'
        '  "expiresIn": <seconds until question expires, 30-120>,\n'
        '  "groundedEvent": "<the event this question relates to>"\n'
        "}\n\n"
        "correctIndex should be null because this is a prediction (answer unknown). "
        "Make options mutually exclusive and plausible."
    )

    try:
        response = TEXT_MODEL.generate_content(prompt)
        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)
        result["id"] = str(uuid.uuid4())

        return jsonify(result), 200

    except json.JSONDecodeError:
        logger.error("Gemini quiz returned non-JSON: %s", raw_text[:200])
        return jsonify(_fallback_quiz(events)), 200
    except Exception as exc:
        logger.error("Gemini quiz error: %s", exc)
        return jsonify(_fallback_quiz(events)), 200


# ---------------------------------------------------------------------------
# Endpoint: POST /api/translate
# ---------------------------------------------------------------------------

@app.route("/api/translate", methods=["POST"])
def translate() -> tuple[Response, int]:
    """Translate text to a target language using Gemini."""
    if _is_rate_limited("translate"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    text = data.get("text")
    if text is None:
        return _error("text is required")
    err = _validate_string(text, "text")
    if err:
        return _error(err)

    target_language = data.get("targetLanguage")
    if target_language is None:
        return _error("targetLanguage is required")
    err = _validate_string(target_language, "targetLanguage", max_len=10)
    if err:
        return _error(err)
    if target_language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported target language: {target_language}")

    prompt = (
        f"Translate the following text to {target_language}. "
        f"Return ONLY the translated text, nothing else.\n\n"
        f"Text: {text}"
    )

    try:
        response = TEXT_MODEL.generate_content(prompt)
        translated = response.text.strip()
        return jsonify({"translatedText": translated}), 200
    except Exception as exc:
        logger.error("Gemini translate error: %s", exc)
        return _error("Translation failed", 502)


# ---------------------------------------------------------------------------
# Endpoint: POST /api/catchup
# ---------------------------------------------------------------------------

@app.route("/api/catchup", methods=["POST"])
def catchup() -> tuple[Response, int]:
    """Generate a catch-up summary of match events for late-joining fans."""
    if _is_rate_limited("catchup"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    events = data.get("events")
    if events is None:
        return _error("events is required")
    err = _validate_events(events)
    if err:
        return _error(err)

    language = data.get("language", "en")
    err = _validate_string(language, "language", max_len=10)
    if err:
        return _error(err)
    if language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported language: {language}")

    events_text = "\n".join(
        f"- [{ev['minute']}'] {ev['player']} ({ev['team']}): {ev['type']}"
        for ev in events
    )

    prompt = (
        "You are a football match summariser. A fan has just tuned in. "
        "Generate a concise, exciting catch-up summary.\n\n"
        f"Match events:\n{events_text}\n\n"
        f"Language: {language}\n\n"
        "Respond ONLY with valid JSON (no markdown fences):\n"
        "{\n"
        '  "summary": "<2-4 sentence catch-up summary>",\n'
        '  "keyMoments": [\n'
        '    {"minute": <int>, "description": "<what happened>"}\n'
        "  ]\n"
        "}\n\n"
        "Include only the most important moments in keyMoments (max 5)."
    )

    try:
        response = TEXT_MODEL.generate_content(prompt)
        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)
        return jsonify(result), 200

    except json.JSONDecodeError:
        logger.error("Gemini catchup returned non-JSON: %s", raw_text[:200])
        return _error("Failed to parse catch-up summary", 502)
    except Exception as exc:
        logger.error("Gemini catchup error: %s", exc)
        return _error("Catch-up generation failed", 502)


# ---------------------------------------------------------------------------
# Leaderboard Sync (Simulated Real-Time Database)
# ---------------------------------------------------------------------------
LEADERBOARD_FILE = Path(__file__).resolve().parent / "leaderboard.json"

def _load_leaderboard():
    if LEADERBOARD_FILE.exists():
        try:
            with open(LEADERBOARD_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return [
        {"id": "p1", "name": "KolkataFan2am", "score": 140, "streak": 4, "correctCount": 12},
        {"id": "p2", "name": "MessiMagic10", "score": 125, "streak": 2, "correctCount": 11},
        {"id": "p3", "name": "TacticalGuru", "score": 110, "streak": 0, "correctCount": 9},
        {"id": "p4", "name": "NightOwl_ARG", "score": 95, "streak": 1, "correctCount": 8},
        {"id": "p5", "name": "You (Fan)", "score": 0, "streak": 0, "correctCount": 0}
    ]

def _save_leaderboard(data):
    try:
        with open(LEADERBOARD_FILE, "w") as f:
            json.dump(data, f)
    except Exception:
        pass

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard() -> Response:
    """Get the current live real-time synced leaderboard."""
    return jsonify(_load_leaderboard())

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

    leaderboard = _load_leaderboard()
    for p in leaderboard:
        if p["id"] == player_id:
            if score is not None:
                p["score"] = score
            if streak is not None:
                p["streak"] = streak
            if correct_count is not None:
                p["correctCount"] = correct_count
            break

    # Sort by score descending
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    _save_leaderboard(leaderboard)
    return jsonify({"status": "ok", "leaderboard": leaderboard}), 200


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health() -> tuple[Response, int]:
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "vantage-backend"}), 200


@app.route("/api/status", methods=["GET"])
def status() -> tuple[Response, int]:
    """Report configured integrations without exposing secrets."""
    gemini_key_format_ok = GEMINI_API_KEY.startswith("AIza") and len(GEMINI_API_KEY) >= 30
    return jsonify({
        "backend": "online",
        "services": {
            "gemini": {
                "configured": bool(GEMINI_API_KEY),
                "keyFormatOk": gemini_key_format_ok,
                "status": "configured" if gemini_key_format_ok else "invalid_key_format",
            },
            "firebase": {"configured": False, "status": "not_configured"},
            "googleMaps": {"configured": False, "status": "not_configured"},
            "weather": {"configured": False, "status": "local_static_data"},
            "textToSpeech": {"configured": False, "status": "browser_api_fallback"},
        },
    }), 200


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
