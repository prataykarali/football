from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from flask import Response, jsonify, request

from .config import app

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
            player["score"] = player["score"] + bump
            if bump > 0:
                player["correctCount"] = player.get("correctCount", 0) + (1 if bump >= 3 else 0)
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
