"""
VANTAGE Pulse — Privacy-safe aggregate analytics blueprint.

All vote data is stored as aggregate counts only. No user identity
information is ever persisted or returned in responses.
"""

from __future__ import annotations

import threading
from typing import Any

from flask import Blueprint, Response, jsonify, request

pulse_bp = Blueprint("pulse", __name__, url_prefix="/api/pulse")

# ---------------------------------------------------------------------------
# In-memory aggregate store
# Structure: { questionId: { "votes": {optionIndex: count}, "voters": set(sessionHash) } }
# The "voters" set is used *only* to prevent double-voting within a session;
# session hashes are random client-side values — never user identity.
# ---------------------------------------------------------------------------
_store: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()

# ---- Constants ------------------------------------------------------------
MAX_QUESTION_ID_LEN = 128
MAX_SESSION_HASH_LEN = 128
MAX_OPTIONS = 20


# ---------------------------------------------------------------------------
# POST /api/pulse/vote
# ---------------------------------------------------------------------------
@pulse_bp.route("/vote", methods=["POST"])
def vote() -> tuple[Response, int]:
    """Record an anonymous aggregate vote for a quiz question option.

    Expects JSON body:
        {
            "questionId": str,
            "optionIndex": int,
            "sessionHash": str   # random, client-generated hash — not user identity
        }

    Returns 200 on success, 400 on bad input, 409 on duplicate vote.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    # --- Validate fields ---------------------------------------------------
    question_id = data.get("questionId")
    option_index = data.get("optionIndex")
    session_hash = data.get("sessionHash")

    if not isinstance(question_id, str) or not question_id.strip():
        return jsonify({"error": "questionId must be a non-empty string"}), 400
    if len(question_id) > MAX_QUESTION_ID_LEN:
        return jsonify({"error": f"questionId exceeds max length ({MAX_QUESTION_ID_LEN})"}), 400

    if not isinstance(option_index, int) or option_index < 0 or option_index >= MAX_OPTIONS:
        return jsonify({"error": f"optionIndex must be an integer 0–{MAX_OPTIONS - 1}"}), 400

    if not isinstance(session_hash, str) or not session_hash.strip():
        return jsonify({"error": "sessionHash must be a non-empty string"}), 400
    if len(session_hash) > MAX_SESSION_HASH_LEN:
        return jsonify({"error": f"sessionHash exceeds max length ({MAX_SESSION_HASH_LEN})"}), 400

    # --- Record vote (thread-safe) -----------------------------------------
    with _lock:
        if question_id not in _store:
            _store[question_id] = {"votes": {}, "voters": set()}

        entry = _store[question_id]

        if session_hash in entry["voters"]:
            return jsonify({"error": "Duplicate vote from this session"}), 409

        entry["voters"].add(session_hash)
        entry["votes"][option_index] = entry["votes"].get(option_index, 0) + 1

    return jsonify({"status": "ok"}), 200


# ---------------------------------------------------------------------------
# GET /api/pulse/results/<questionId>
# ---------------------------------------------------------------------------
@pulse_bp.route("/results/<question_id>", methods=["GET"])
def results(question_id: str) -> tuple[Response, int]:
    """Return aggregate vote counts for a given question.

    Response body (no identity info):
        {
            "questionId": str,
            "votes": { "<optionIndex>": count, ... },
            "totalVotes": int
        }
    """
    if len(question_id) > MAX_QUESTION_ID_LEN:
        return jsonify({"error": "questionId too long"}), 400

    with _lock:
        entry = _store.get(question_id)

    if entry is None:
        return jsonify({
            "questionId": question_id,
            "votes": {},
            "totalVotes": 0,
        }), 200

    # Only expose aggregate counts — never the voters set.
    votes_copy = dict(entry["votes"])
    total = sum(votes_copy.values())

    return jsonify({
        "questionId": question_id,
        "votes": votes_copy,
        "totalVotes": total,
    }), 200
