from __future__ import annotations

import sys

from flask import Response, jsonify

from .config import app


def _current_gemini_key() -> str:
    proxy_module = sys.modules.get("proxy")
    return str(getattr(proxy_module, "GEMINI_API_KEY", "")) if proxy_module else ""

@app.route("/api/health", methods=["GET"])
def health() -> tuple[Response, int]:
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "vantage-backend"}), 200


@app.route("/api/status", methods=["GET"])
def status() -> tuple[Response, int]:
    """Report configured integrations without exposing secrets."""
    return jsonify({
        "backend": "online",
        "services": {
            "gemini": {
                "configured": bool(_current_gemini_key()),
                "keyFormatOk": bool(_current_gemini_key() and (_current_gemini_key().startswith("AQ.") or _current_gemini_key().startswith("AIzaSy"))),
                "status": "configured" if _current_gemini_key() else "fallback_mode",
            },
            "firebase": {"configured": False, "status": "not_configured"},
            "googleMaps": {"configured": False, "status": "not_configured"},
            "weather": {"configured": False, "status": "local_static_data"},
            "textToSpeech": {"configured": False, "status": "browser_api_fallback"},
        },
    }), 200

