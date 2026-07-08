"""
Tests for VANTAGE pulse.py — Privacy-safe aggregate analytics.

Covers:
    • Vote aggregation counts correctly
    • No identity information in responses
    • Results endpoint returns correct totals
    • Graceful handling of missing questionId
    • Duplicate vote prevention
    • Input validation
"""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

# Patch genai before importing proxy (which imports pulse_bp)
with patch("google.generativeai.configure"), \
     patch("google.generativeai.GenerativeModel"):
    import proxy  # noqa: E402
    from pulse import _store, _lock


@pytest.fixture(autouse=True)
def _clear_store():
    """Reset the in-memory store before each test."""
    with _lock:
        _store.clear()
    yield
    with _lock:
        _store.clear()


@pytest.fixture()
def client():
    """Create a Flask test client."""
    proxy.app.config["TESTING"] = True
    proxy._rate_buckets.clear()
    with proxy.app.test_client() as c:
        yield c


# ------------------------------------------------------------------
# Vote aggregation
# ------------------------------------------------------------------

class TestVoteAggregation:
    """Votes must increment aggregate counts correctly."""

    def test_single_vote(self, client):
        """A single vote should register correctly."""
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q1",
            "optionIndex": 2,
            "sessionHash": "abc123",
        })
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"

        # Verify via results
        resp = client.get("/api/pulse/results/q1")
        data = resp.get_json()
        assert data["totalVotes"] == 1
        assert data["votes"]["2"] == 1  # JSON keys are strings

    def test_multiple_votes_different_sessions(self, client):
        """Multiple votes from different sessions should all count."""
        for i in range(5):
            resp = client.post("/api/pulse/vote", json={
                "questionId": "q2",
                "optionIndex": 0,
                "sessionHash": f"session-{i}",
            })
            assert resp.status_code == 200

        resp = client.get("/api/pulse/results/q2")
        data = resp.get_json()
        assert data["totalVotes"] == 5
        assert data["votes"]["0"] == 5

    def test_votes_across_options(self, client):
        """Votes for different options should be tallied separately."""
        client.post("/api/pulse/vote", json={
            "questionId": "q3", "optionIndex": 0, "sessionHash": "s1",
        })
        client.post("/api/pulse/vote", json={
            "questionId": "q3", "optionIndex": 1, "sessionHash": "s2",
        })
        client.post("/api/pulse/vote", json={
            "questionId": "q3", "optionIndex": 0, "sessionHash": "s3",
        })

        resp = client.get("/api/pulse/results/q3")
        data = resp.get_json()
        assert data["totalVotes"] == 3
        assert data["votes"]["0"] == 2
        assert data["votes"]["1"] == 1

    def test_duplicate_vote_rejected(self, client):
        """Same sessionHash voting twice should be rejected (409)."""
        client.post("/api/pulse/vote", json={
            "questionId": "q4", "optionIndex": 0, "sessionHash": "same-hash",
        })
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q4", "optionIndex": 1, "sessionHash": "same-hash",
        })
        assert resp.status_code == 409

        # Only one vote counted
        resp = client.get("/api/pulse/results/q4")
        assert resp.get_json()["totalVotes"] == 1


# ------------------------------------------------------------------
# No identity info in responses
# ------------------------------------------------------------------

class TestNoIdentityLeakage:
    """Responses must never contain session hashes or voter identity."""

    def test_results_no_voters(self, client):
        """Results response must not contain 'voters' or 'sessionHash'."""
        client.post("/api/pulse/vote", json={
            "questionId": "q5", "optionIndex": 0, "sessionHash": "secret-hash-xyz",
        })
        resp = client.get("/api/pulse/results/q5")
        body = resp.get_data(as_text=True)
        assert "secret-hash-xyz" not in body
        assert "voters" not in body
        assert "sessionHash" not in body

    def test_vote_response_no_identity(self, client):
        """Vote response must not echo back the sessionHash."""
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q6", "optionIndex": 0, "sessionHash": "my-secret",
        })
        body = resp.get_data(as_text=True)
        assert "my-secret" not in body


# ------------------------------------------------------------------
# Results endpoint
# ------------------------------------------------------------------

class TestResultsEndpoint:
    """GET /api/pulse/results/<questionId> must return correct data."""

    def test_missing_question_returns_empty(self, client):
        """A nonexistent questionId should return zero votes, not an error."""
        resp = client.get("/api/pulse/results/nonexistent-q")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["questionId"] == "nonexistent-q"
        assert data["votes"] == {}
        assert data["totalVotes"] == 0

    def test_results_shape(self, client):
        """Results should have the correct response shape."""
        client.post("/api/pulse/vote", json={
            "questionId": "q7", "optionIndex": 1, "sessionHash": "s1",
        })
        resp = client.get("/api/pulse/results/q7")
        data = resp.get_json()
        assert "questionId" in data
        assert "votes" in data
        assert "totalVotes" in data
        assert isinstance(data["votes"], dict)
        assert isinstance(data["totalVotes"], int)


# ------------------------------------------------------------------
# Input validation
# ------------------------------------------------------------------

class TestVoteInputValidation:
    """POST /api/pulse/vote must reject invalid inputs."""

    def test_missing_question_id(self, client):
        resp = client.post("/api/pulse/vote", json={
            "optionIndex": 0, "sessionHash": "s1",
        })
        assert resp.status_code == 400
        assert "questionId" in resp.get_json()["error"]

    def test_missing_option_index(self, client):
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q", "sessionHash": "s1",
        })
        assert resp.status_code == 400
        assert "optionIndex" in resp.get_json()["error"]

    def test_missing_session_hash(self, client):
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q", "optionIndex": 0,
        })
        assert resp.status_code == 400
        assert "sessionHash" in resp.get_json()["error"]

    def test_negative_option_index(self, client):
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q", "optionIndex": -1, "sessionHash": "s1",
        })
        assert resp.status_code == 400

    def test_non_json_body(self, client):
        resp = client.post("/api/pulse/vote", data="not json", content_type="text/plain")
        assert resp.status_code == 400

    def test_empty_question_id(self, client):
        resp = client.post("/api/pulse/vote", json={
            "questionId": "", "optionIndex": 0, "sessionHash": "s1",
        })
        assert resp.status_code == 400

    def test_option_index_too_large(self, client):
        resp = client.post("/api/pulse/vote", json={
            "questionId": "q", "optionIndex": 999, "sessionHash": "s1",
        })
        assert resp.status_code == 400
