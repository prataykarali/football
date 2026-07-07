"""Compatibility facade for the modular VANTAGE Flask backend."""

from __future__ import annotations

from proxy_app.config import (
    GEMINI_API_KEY,
    _ai_ok,
    _rate_buckets,
    app,
    http_requests,
)
from proxy_app.security import _apply_security_headers
from proxy_app.validation import _error, _validate_base64_frame, _validate_event, _validate_events, _validate_string

# Route modules register handlers on import.
from proxy_app import ai_routes as _ai_routes  # noqa: F401,E402
from proxy_app import espn_routes as _espn_routes  # noqa: F401,E402
from proxy_app import health_routes as _health_routes  # noqa: F401,E402
from proxy_app import leaderboard_routes as _leaderboard_routes  # noqa: F401,E402

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
