from __future__ import annotations

from flask import Response, jsonify

from .config import GEMINI_API_KEY, app


def _current_gemini_key() -> str:
    return GEMINI_API_KEY

@app.route("/api/health", methods=["GET"])
def health() -> tuple[Response, int]:
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "vantage-backend"}), 200


@app.route("/api/status", methods=["GET"])
def status() -> tuple[Response, int]:
    """Report configured integrations without exposing secrets."""
    gemini_key = _current_gemini_key()
    return jsonify({
        "backend": "online",
        "services": {
            "gemini": {
                "configured": bool(gemini_key),
                "keyFormatOk": bool(gemini_key and (gemini_key.startswith("AQ.") or gemini_key.startswith("AIzaSy"))),
                "status": "configured" if gemini_key else "fallback_mode",
            },
            "firebase": {"configured": False, "status": "not_configured"},
            "googleMaps": {"configured": False, "status": "not_configured"},
            "weather": {"configured": False, "status": "local_static_data"},
            "textToSpeech": {"configured": False, "status": "browser_api_fallback"},
        },
    }), 200
