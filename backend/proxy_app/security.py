from __future__ import annotations

from flask import Response

from .config import app

# CSP allows the third-party media the app legitimately needs — YouTube/Twitch
# stream + highlight embeds, YouTube thumbnails, ESPN logos, Wikimedia stadium
# photos, Google Fonts — while keeping scripts/connections same-origin.
# `frame-ancestors` lets Hugging Face Spaces embed the app in its "App" tab
# iframe; X-Frame-Options: DENY is intentionally omitted because it would break
# that embed (frame-ancestors is the modern, more expressive replacement).
_CSP = (
    "default-src 'self'; "
    "img-src 'self' data: https:; "
    "media-src 'self' blob: https:; "
    "connect-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com "
    "https://player.twitch.tv https://*.twitch.tv; "
    "frame-ancestors 'self' https://huggingface.co https://*.hf.space;"
)

SECURITY_HEADERS = {
    "Content-Security-Policy": _CSP,
    "X-Content-Type-Options": "nosniff",
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
