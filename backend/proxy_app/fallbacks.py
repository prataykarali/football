from __future__ import annotations

import random
import uuid
from typing import Any

def _fallback_commentary_text(event: dict) -> str:
    """Generate engaging fallback commentary when AI is unavailable."""
    minute = event.get("minute", 0)
    etype = event.get("type", "play")
    player = event.get("player", "")
    team = event.get("team", "")
    details = event.get("details", "")

    templates = {
        "goal": [
            f"⚽ GOAL at {minute}'! {player} finds the back of the net for {team}! What a moment!",
            f"⚽ {minute}' — GOOOAL! {player} scores! The crowd erupts as {team} celebrate!",
            f"⚽ {minute}' — It's in! {player} makes no mistake! {team} take the lead!",
        ],
        "yellow_card": [
            f"🟨 {minute}' — Yellow card shown to {player} ({team}). That's a booking.",
            f"🟨 {minute}' — {player} goes into the book. Reckless challenge there.",
        ],
        "red_card": [
            f"🟥 {minute}' — RED CARD! {player} is sent off! {team} down to 10 men!",
            f"🟥 {minute}' — It's a red! {player} has to go! Disaster for {team}!",
        ],
        "penalty_awarded": [
            f"⚠️ {minute}' — PENALTY to {team}! The referee points to the spot!",
            f"⚠️ {minute}' — Penalty! {player} goes down and the ref has no hesitation!",
        ],
        "shot": [
            f"🎯 {minute}' — {player} shoots! Good effort from the {team} player.",
            f"🎯 {minute}' — {player} lets fly! The goalkeeper watches it carefully.",
        ],
        "substitution": [
            f"🔄 {minute}' — Substitution for {team}: {player} comes on.",
            f"🔄 {minute}' — Tactical change by {team}. {player} enters the fray.",
        ],
        "possession": [
            f"📊 {minute}' — {team} dominating possession right now. Patient build-up play.",
            f"📊 {minute}' — {team} keeping the ball well. Looking for that opening.",
        ],
        "half_time": [
            f"⏸️ Half-time! The referee blows for the break.",
            f"⏸️ That's half-time. Both teams head to the dressing room.",
        ],
        "full_time": [
            f"🏁 Full time! The final whistle blows!",
            f"🏁 It's all over! The referee brings proceedings to a close.",
        ],
    }

    if etype in templates:
        return random.choice(templates[etype])

    return f"[{minute}'] {details or etype}"


# Rolling set to avoid repeating recent fallback questions (stores question text hashes)
_recent_quiz_hashes: list[str] = []
_QUIZ_DEDUP_WINDOW = 20

_QUIZ_TEMPLATES: dict[str, list] = {
    "goal": [
        ("Will {team} score again before the next break?", ["Yes, within 10 minutes", "No, the momentum will shift", "The match goes to half-time level", "Opposition equalises first"]),
        ("How will {player}'s goal affect the match tempo?", ["The scoring team will sit deep", "The scoring team push for more goals", "The losing team will substitute immediately", "Both teams reset with caution"]),
        ("After {player}'s goal, who is most likely to score next?", ["{team} top scorer", "Opposition striker", "A set-piece goal", "No more goals this half"]),
        ("What is {team}'s most likely next action after the goal?", ["High defensive press", "Sit back and protect the lead", "Immediate kick-off attack", "Tactical substitution"]),
    ],
    "red_card": [
        ("With {team} down to 10 men, what happens?", ["The opposition scores within 15 min", "{team} holds on defensively", "A penalty is awarded next", "Both teams cancel each other out"]),
        ("How will the red card on {player} change this game?", ["Completely shifts momentum", "Little impact — {team} defend well", "Leads to another card", "Opposition dominate possession"]),
    ],
    "yellow_card": [
        ("Will {player} receive a second yellow this match?", ["Yes — they're reckless", "No — they'll be cautious now", "They'll be substituted to avoid it", "Manager will issue a strong warning"]),
        ("How does {player}'s yellow card affect the next 5 minutes?", ["Play gets more physical", "Both teams ease off the tackles", "Manager subs {player} off immediately", "No significant change"]),
    ],
    "penalty_awarded": [
        ("Will the penalty be scored?", ["Yes — clean finish", "No — goalkeeper saves it", "Hit the post or crossbar", "Retake ordered by referee"]),
        ("What happens immediately after the penalty decision?", ["Players protest the decision", "Quick VAR check", "Penalty scored calmly", "Wild scenes — red card for protests"]),
    ],
    "shot": [
        ("Will {team} score from their next attack?", ["Yes — they're in great form", "No — opposition defence holds", "Corner kick leads to a goal", "Another shot but off target"]),
        ("How does {player}'s shot change the game dynamics?", ["Increases pressure on opposition", "Opposition counter-attacks immediately", "Brings the crowd alive", "No major tactical change"]),
    ],
    "substitution": [
        ("Will {player}'s substitution make an immediate impact?", ["Yes — goal within 15 min", "No — takes time to settle", "Causes a tactical reshuffle", "The sub gets booked quickly"]),
        ("What's the tactical reason for this substitution?", ["Fatigue management", "Chasing the game", "Protecting a lead", "Injury concern"]),
    ],
    "default": [
        ("What happens in the next 5 minutes of play?", ["A goal is scored", "A yellow or red card", "A penalty awarded", "Nothing — tight and tactical"]),
        ("Which team controls possession next?", ["{team}", "The opposition", "50/50 midfield battle", "Long-ball game from both sides"]),
        ("What is the next key event in this match?", ["Goal", "Card", "Injury", "VAR Review"]),
    ],
}

def _fallback_quiz(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a varied, grounded quiz question from a pool, avoiding recent repeats."""
    event = events[-1]
    player = event.get("player") or event.get("team") or "the player"
    event_type = str(event.get("type", "default"))
    minute = event.get("minute", 0)
    team = event.get("team", "the team")

    # Pick template pool by event type, fall back to default
    pool = _QUIZ_TEMPLATES.get(event_type, _QUIZ_TEMPLATES["default"])

    # Shuffle and pick first template not in recent hashes
    random.shuffle(pool)
    chosen_q, chosen_opts = pool[0]
    for q_template, opts in pool:
        q_text = q_template.format(player=player, team=team, minute=minute)
        h = str(hash(q_text) & 0xFFFFFFFF)
        if h not in _recent_quiz_hashes:
            chosen_q, chosen_opts = q_template, opts
            break

    question_text = chosen_q.format(player=player, team=team, minute=minute)
    options = [o.format(player=player, team=team) for o in chosen_opts]

    # Track this question hash to avoid repeating it
    h = str(hash(question_text) & 0xFFFFFFFF)
    _recent_quiz_hashes.append(h)
    if len(_recent_quiz_hashes) > _QUIZ_DEDUP_WINDOW:
        _recent_quiz_hashes.pop(0)

    return {
        "id": str(uuid.uuid4()),
        "question": question_text,
        "options": options,
        "correctIndex": None,
        "expiresIn": 75,
        "groundedEvent": f"[{minute}'] {player} ({team}): {event_type.replace('_', ' ')}",
        "fallback": True,
    }
