from __future__ import annotations

from flask import Response

from .config import app

SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https://upload.wikimedia.org https://a.espncdn.com https://www.espncdn.com; media-src 'self' https://*.espn.com https://*.espncdn.com; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
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
