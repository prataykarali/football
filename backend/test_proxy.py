"""
Tests for VANTAGE proxy.py — Flask backend.

Covers:
    • Security headers on all responses
    • Rate limiting enforcement
    • Input validation (oversized frames, bad schemas, missing fields)
    • API key never leaked in response bodies or headers
"""

from __future__ import annotations

import base64
import json
from unittest.mock import MagicMock, patch

import pytest

# Patch genai.configure and GenerativeModel BEFORE importing proxy
with patch("google.generativeai.configure"), \
     patch("google.generativeai.GenerativeModel") as _MockModel:
    # Create a mock model instance that returns a canned response
    _mock_instance = MagicMock()
    _MockModel.return_value = _mock_instance
    import proxy  # noqa: E402


@pytest.fixture()
def client():
    """Create a Flask test client with a fresh rate-limit state and mocked network calls."""
    proxy.app.config["TESTING"] = True
    proxy._rate_buckets.clear()
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": '{"question": "What happens next?", "options": ["A", "B", "C", "D"], "correctIndex": null, "expiresIn": 75, "groundedEvent": "goal"}'}]}}],
        "translatedText": "Translated text response"
    }
    mock_response.iter_lines.return_value = [
        b'data: {"candidates": [{"content": {"parts": [{"text": "Mocked stream chunk"}]}}]}'
    ]
    mock_response.headers = {}
    
    with patch("proxy.http_requests.post", return_value=mock_response), \
         patch("proxy.http_requests.get", return_value=mock_response):
        with proxy.app.test_client() as c:
            yield c


# ------------------------------------------------------------------
# Security headers
# ------------------------------------------------------------------

class TestSecurityHeaders:
    """Every response must carry the full set of security headers."""

    EXPECTED_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security": "max-age=31536000",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
        "Cross-Origin-Opener-Policy": "same-origin",
        "X-XSS-Protection": "0",
    }
    CSP_PREFIX = "default-src 'self'"

    def test_allows_hf_iframe_embedding(self, client):
        """CSP must let Hugging Face Spaces frame the app (no X-Frame-Options: DENY)."""
        resp = client.get("/api/health")
        assert resp.headers.get("X-Frame-Options") is None
        assert "frame-ancestors" in resp.headers.get("Content-Security-Policy", "")
        assert "https://www.youtube.com" in resp.headers.get("Content-Security-Policy", "")

    def test_headers_on_health(self, client):
        """Health endpoint carries all security headers."""
        resp = client.get("/api/health")
        for header, value in self.EXPECTED_HEADERS.items():
            assert resp.headers.get(header) == value, f"Missing/wrong header: {header}"
        assert resp.headers.get("Content-Security-Policy", "").startswith(self.CSP_PREFIX)

    def test_headers_on_error(self, client):
        """Even error responses carry security headers."""
        resp = client.post("/api/commentary", json={})
        for header, value in self.EXPECTED_HEADERS.items():
            assert resp.headers.get(header) == value, f"Missing/wrong header on error: {header}"
        assert resp.headers.get("Content-Security-Policy", "").startswith(self.CSP_PREFIX)

    def test_headers_on_pulse(self, client):
        """Pulse blueprint responses also carry security headers."""
        resp = client.get("/api/pulse/results/nonexistent")
        for header, value in self.EXPECTED_HEADERS.items():
            assert resp.headers.get(header) == value, f"Missing/wrong header on pulse: {header}"
        assert resp.headers.get("Content-Security-Policy", "").startswith(self.CSP_PREFIX)


# ------------------------------------------------------------------
# Rate limiting
# ------------------------------------------------------------------

class TestRateLimiting:
    """Token-bucket rate limiter should reject after 10 requests/min."""

    def test_rate_limit_triggers(self, client):
        """After 10 requests, the 11th should receive HTTP 429."""
        for i in range(10):
            resp = client.post("/api/translate", json={
                "text": "Hello",
                "targetLanguage": "es",
            })
            # The first 10 may succeed or fail for other reasons, but NOT 429
            assert resp.status_code != 429, f"Rate limited too early at request {i + 1}"

        # 11th request
        resp = client.post("/api/translate", json={
            "text": "Hello",
            "targetLanguage": "es",
        })
        assert resp.status_code == 429
        data = resp.get_json()
        assert "rate limit" in data["error"].lower()


# ------------------------------------------------------------------
# Input validation — commentary
# ------------------------------------------------------------------

class TestCommentaryValidation:
    """POST /api/commentary must reject invalid payloads."""

    def test_missing_event(self, client):
        resp = client.post("/api/commentary", json={"language": "en"})
        assert resp.status_code == 400
        assert "event" in resp.get_json()["error"].lower()

    def test_invalid_pace(self, client):
        resp = client.post("/api/commentary", json={
            "event": {"type": "goal", "minute": 10, "player": "Messi", "team": "Inter Miami"},
            "pace": "ultrafast",
        })
        assert resp.status_code == 400
        assert "pace" in resp.get_json()["error"].lower()

    def test_invalid_register(self, client):
        resp = client.post("/api/commentary", json={
            "event": {"type": "goal", "minute": 10, "player": "Messi", "team": "Inter Miami"},
            "register": "poetic",
        })
        assert resp.status_code == 400
        assert "register" in resp.get_json()["error"].lower()

    def test_unsupported_language(self, client):
        resp = client.post("/api/commentary", json={
            "event": {"type": "goal", "minute": 10, "player": "Messi", "team": "Inter Miami"},
            "language": "xx",
        })
        assert resp.status_code == 400
        assert "language" in resp.get_json()["error"].lower()

    def test_event_missing_fields(self, client):
        resp = client.post("/api/commentary", json={
            "event": {"type": "goal"},  # missing minute, player, team
        })
        assert resp.status_code == 400
        assert "missing" in resp.get_json()["error"].lower()


# ------------------------------------------------------------------
# Input validation — vision
# ------------------------------------------------------------------

class TestVisionValidation:
    """POST /api/vision must reject invalid frames."""

    def test_missing_frame(self, client):
        resp = client.post("/api/vision", json={})
        assert resp.status_code == 400
        assert "frame" in resp.get_json()["error"].lower()

    def test_invalid_base64(self, client):
        resp = client.post("/api/vision", json={"frame": "!!!not-base64!!!"})
        assert resp.status_code == 400
        assert "base64" in resp.get_json()["error"].lower()

    def test_oversized_frame(self, client):
        """A frame >4 MB (decoded) must be rejected."""
        # Create a base64 string that decodes to >4 MB
        big_data = base64.b64encode(b"\x00" * (4 * 1024 * 1024 + 1)).decode()
        resp = client.post("/api/vision", json={"frame": big_data})
        assert resp.status_code == 400
        assert "size" in resp.get_json()["error"].lower()

    def test_empty_frame(self, client):
        resp = client.post("/api/vision", json={"frame": ""})
        assert resp.status_code == 400


# ------------------------------------------------------------------
# Input validation — quiz
# ------------------------------------------------------------------

class TestQuizValidation:
    """POST /api/quiz must reject invalid event arrays."""

    def test_missing_events(self, client):
        resp = client.post("/api/quiz", json={})
        assert resp.status_code == 400
        assert "events" in resp.get_json()["error"].lower()

    def test_empty_events(self, client):
        resp = client.post("/api/quiz", json={"events": []})
        assert resp.status_code == 400
        assert "empty" in resp.get_json()["error"].lower()

    def test_invalid_event_schema(self, client):
        resp = client.post("/api/quiz", json={"events": [{"type": "goal"}]})
        assert resp.status_code == 400
        assert "missing" in resp.get_json()["error"].lower()

    def test_non_list_events(self, client):
        resp = client.post("/api/quiz", json={"events": "not a list"})
        assert resp.status_code == 400
        assert "array" in resp.get_json()["error"].lower()


# ------------------------------------------------------------------
# Input validation — translate
# ------------------------------------------------------------------

class TestTranslateValidation:
    """POST /api/translate must reject bad payloads."""

    def test_missing_text(self, client):
        resp = client.post("/api/translate", json={"targetLanguage": "es"})
        assert resp.status_code == 400

    def test_missing_target_language(self, client):
        resp = client.post("/api/translate", json={"text": "Hello"})
        assert resp.status_code == 400

    def test_unsupported_language(self, client):
        resp = client.post("/api/translate", json={"text": "Hello", "targetLanguage": "zz"})
        assert resp.status_code == 400


# ------------------------------------------------------------------
# Input validation — catchup
# ------------------------------------------------------------------

class TestCatchupValidation:
    """POST /api/catchup must reject bad payloads."""

    def test_missing_events(self, client):
        resp = client.post("/api/catchup", json={"language": "en"})
        assert resp.status_code == 400

    def test_invalid_language(self, client):
        resp = client.post("/api/catchup", json={
            "events": [{"type": "goal", "minute": 10, "player": "Messi", "team": "Inter Miami"}],
            "language": "zz",
        })
        assert resp.status_code == 400


# ------------------------------------------------------------------
# API key never leaked
# ------------------------------------------------------------------

class TestNoKeyLeakage:
    """The Gemini API key must never appear in any response."""

    API_KEY = proxy.GEMINI_API_KEY

    def _check_no_key(self, resp):
        """Assert the API key is not in the response body or headers."""
        # Body
        body = resp.get_data(as_text=True)
        assert self.API_KEY not in body, "API key found in response body!"
        # Headers
        for header_val in resp.headers.values():
            assert self.API_KEY not in str(header_val), "API key found in response header!"

    def test_no_key_in_health(self, client):
        self._check_no_key(client.get("/api/health"))

    def test_no_key_in_error(self, client):
        self._check_no_key(client.post("/api/commentary", json={}))

    def test_no_key_in_validation_error(self, client):
        self._check_no_key(client.post("/api/vision", json={"frame": "bad"}))

    def test_no_key_in_translate_error(self, client):
        self._check_no_key(client.post("/api/translate", json={}))

    def test_no_key_in_status(self, client):
        self._check_no_key(client.get("/api/status"))


# ------------------------------------------------------------------
# Integration status
# ------------------------------------------------------------------

class TestIntegrationStatus:
    """Status endpoint reports server-side integrations without brittle key prefixes."""

    def test_gemini_configured_for_non_empty_key(self, client):
        original_key = proxy.GEMINI_API_KEY
        try:
            proxy.GEMINI_API_KEY = "AQ.valid-non-empty-key"
            resp = client.get("/api/status")
            assert resp.status_code == 200
            gemini = resp.get_json()["services"]["gemini"]
            assert gemini["configured"] is True
            assert gemini["keyFormatOk"] is True
            assert gemini["status"] == "configured"
        finally:
            proxy.GEMINI_API_KEY = original_key


# ------------------------------------------------------------------
# JSON body requirement
# ------------------------------------------------------------------

class TestJsonBodyRequired:
    """Endpoints must reject non-JSON request bodies."""

    def test_commentary_no_json(self, client):
        resp = client.post("/api/commentary", data="not json", content_type="text/plain")
        assert resp.status_code == 400

    def test_vision_no_json(self, client):
        resp = client.post("/api/vision", data="not json", content_type="text/plain")
        assert resp.status_code == 400

    def test_quiz_no_json(self, client):
        resp = client.post("/api/quiz", data="not json", content_type="text/plain")
        assert resp.status_code == 400

    def test_translate_no_json(self, client):
        resp = client.post("/api/translate", data="not json", content_type="text/plain")
        assert resp.status_code == 400

    def test_catchup_no_json(self, client):
        resp = client.post("/api/catchup", data="not json", content_type="text/plain")
        assert resp.status_code == 400
