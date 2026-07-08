from __future__ import annotations

import base64
import json
import uuid

from flask import Response, jsonify, request, stream_with_context

from .ai_client import _ai_chat, _ai_chat_stream
from .config import (
    GEMINI_API_KEY,
    GEMINI_MODELS,
    SUPPORTED_LANGUAGES,
    VALID_PACES,
    VALID_REGISTERS,
    _ai_ok,
    _is_rate_limited,
    app,
    http_requests,
    logger,
)
from .fallbacks import _fallback_commentary_text, _fallback_quiz
from .validation import _error, _validate_base64_frame, _validate_event, _validate_events, _validate_string

@app.route("/api/commentary", methods=["POST"])
def commentary() -> Response | tuple[Response, int]:
    """Generate AI commentary for a football event.

    Streams Gemini-generated text back to the client in real-time.
    """
    if _is_rate_limited("commentary"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    # -- event --
    event = data.get("event")
    if event is None:
        return _error("event is required")
    err = _validate_event(event)
    if err:
        return _error(err)

    # -- language --
    language = data.get("language", "en")
    err = _validate_string(language, "language", max_len=10)
    if err:
        return _error(err)
    if language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported language: {language}")

    # -- pace / register --
    pace = data.get("pace", "medium")
    if pace not in VALID_PACES:
        return _error(f"pace must be one of: {', '.join(sorted(VALID_PACES))}")

    register = data.get("register", "casual")
    if register not in VALID_REGISTERS:
        return _error(f"register must be one of: {', '.join(sorted(VALID_REGISTERS))}")

    # -- Build prompt --
    pace_instruction = {
        "slow": "Use long, dramatic sentences with vivid descriptions.",
        "medium": "Use a balanced mix of excitement and clarity.",
        "fast": "Use short, punchy sentences. Be rapid-fire.",
    }[pace]

    register_instruction = {
        "casual": "Use casual, fan-friendly language. Add excitement and emotion.",
        "tactical": "Use precise tactical language. Reference formations, positioning, and strategy.",
    }[register]

    prompt = (
        f"You are an elite football commentator. Generate live commentary for this event.\n\n"
        f"Event type: {event['type']}\n"
        f"Minute: {event['minute']}\n"
        f"Player: {event['player']}\n"
        f"Team: {event['team']}\n"
        f"Details: {event.get('details', 'N/A')}\n\n"
        f"Language: {language}\n"
        f"Pace: {pace_instruction}\n"
        f"Style: {register_instruction}\n\n"
        f"Generate 2-4 sentences of natural, broadcast-quality commentary. "
        f"Do NOT include any metadata or labels — just the commentary itself."
    )

    def _generate():
        try:
            if not _ai_ok:
                yield _fallback_commentary_text(event)
                return
            for chunk in _ai_chat_stream(prompt):
                if chunk == "[Commentary generation error]":
                    yield _fallback_commentary_text(event)
                    return
                yield chunk
        except Exception:
            yield _fallback_commentary_text(event)

    return Response(
        stream_with_context(_generate()),
        content_type="text/plain; charset=utf-8",
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/vision
# ---------------------------------------------------------------------------

@app.route("/api/vision", methods=["POST"])
def vision() -> tuple[Response, int]:
    """Identify a football player from a base64-encoded image frame."""
    if _is_rate_limited("vision"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    frame_b64 = data.get("frame")
    if frame_b64 is None:
        return _error("frame is required")

    err = _validate_base64_frame(frame_b64)
    if err:
        return _error(err)

    prompt = (
        "You are a football broadcast vision analyst. You are given ONE frame from a "
        "live match TV feed. Report ONLY what is actually visible in this frame — do "
        "not invent famous names you cannot see.\n\n"
        "Read any on-screen scoreboard/graphics for the team names, score and clock. "
        "Describe the player who is the focus of the shot (the one on/near the ball or "
        "most prominent) by kit colour, role and action — a NAME only if a shirt "
        "number or face is genuinely legible, otherwise a description.\n\n"
        "Respond ONLY with valid JSON in this exact schema (no markdown fences):\n"
        "{\n"
        '  "homeTeam": "<team on left of scoreboard, or best guess>",\n'
        '  "awayTeam": "<team on right of scoreboard, or best guess>",\n'
        '  "score": "<e.g. 0 - 0, or \'unknown\'>",\n'
        '  "minute": "<match clock e.g. 22:38, or \'unknown\'>",\n'
        '  "inFocus": "<short description of the player in focus>",\n'
        '  "player": "<player name IF legibly identifiable, else \'Unknown\'>",\n'
        '  "phase": "<phase of play, e.g. build-up, attack, set-piece, transition>",\n'
        '  "confidence": <0.0-1.0 how sure you are of THIS reading of the frame>,\n'
        '  "funFact": "<one short, grounded observation about what is happening>"\n'
        "}\n\n"
        "Base confidence on how clearly you can read the frame, NOT on recognising a "
        "star. A clear wide shot you can describe well is high confidence."
    )

    try:
        decoded = base64.b64decode(frame_b64)
        if not _ai_ok:
            return jsonify({
                "homeTeam": "Unknown",
                "awayTeam": "Unknown",
                "score": "unknown",
                "minute": "unknown",
                "inFocus": "AI vision not configured",
                "player": "Unknown",
                "phase": "unknown",
                "funFact": "AI service not configured. Add a valid API key to backend/.env.",
                "confidence": 0.0,
                "isUncertain": True,
                "source": "not-configured",
            }), 200

        # Send base64 image to Google AI Studio vision endpoint (with model fallback)
        b64_str = base64.b64encode(decoded).decode("utf-8")
        raw_text = None
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            try:
                resp = http_requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {"inline_data": {"mime_type": "image/jpeg", "data": b64_str}},
                            ]
                        }],
                        "generationConfig": {"maxOutputTokens": 512, "temperature": 0.3},
                    },
                    timeout=30,
                )
                if resp.status_code == 429:
                    continue
                resp.raise_for_status()
                raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                break
            except Exception:
                continue
        if raw_text is None:
            raise RuntimeError("All vision models exhausted")

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)

        # Normalise into the scene-read schema the card expects, keeping the
        # legacy player/stats fields for backward compatibility.
        try:
            confidence = float(result.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        normalised = {
            "homeTeam": str(result.get("homeTeam") or "Unknown")[:40],
            "awayTeam": str(result.get("awayTeam") or "Unknown")[:40],
            "score": str(result.get("score") or "unknown")[:20],
            "minute": str(result.get("minute") or "unknown")[:20],
            "inFocus": str(result.get("inFocus") or "Player in focus")[:160],
            "player": str(result.get("player") or "Unknown")[:60],
            "phase": str(result.get("phase") or "open play")[:60],
            "funFact": str(result.get("funFact") or "")[:280],
            "confidence": confidence,
            "isUncertain": confidence < 0.7,
            "source": "gemini-vision",
        }
        return jsonify(normalised), 200

    except json.JSONDecodeError:
        logger.error("Vision returned non-JSON: %s", raw_text[:200])
        return _error("Failed to parse player identification result", 502)
    except Exception as exc:
        logger.error("Vision error: %s", exc)
        return _error("Player identification failed", 502)


# ---------------------------------------------------------------------------
# Endpoint: POST /api/quiz
# ---------------------------------------------------------------------------

@app.route("/api/quiz", methods=["POST"])
def quiz() -> tuple[Response, int]:
    """Generate a prediction / quiz question based on match events."""
    if _is_rate_limited("quiz"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    events = data.get("events")
    if events is None:
        return _error("events is required")

    err = _validate_events(events)
    if err:
        return _error(err)

    events_text = "\n".join(
        f"- [{ev['minute']}'] {ev['player']} ({ev['team']}): {ev['type']}"
        for ev in events
    )

    prompt = (
        "You are a football quiz master. Based on these match events, "
        "generate ONE engaging prediction question for fans watching live.\n\n"
        f"Match events so far:\n{events_text}\n\n"
        "Respond ONLY with valid JSON (no markdown fences):\n"
        "{\n"
        '  "question": "<the prediction question>",\n'
        '  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],\n'
        '  "correctIndex": null,\n'
        '  "expiresIn": <seconds until question expires, 30-120>,\n'
        '  "groundedEvent": "<the event this question relates to>"\n'
        "}\n\n"
        "correctIndex should be null because this is a prediction (answer unknown). "
        "Make options mutually exclusive and plausible."
    )

    try:
        if not _ai_ok:
            return jsonify(_fallback_quiz(events)), 200
        response = _ai_chat(prompt)
        raw_text = response

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)
        result["id"] = str(uuid.uuid4())

        return jsonify(result), 200

    except json.JSONDecodeError:
        logger.error("Gemini quiz returned non-JSON: %s", raw_text[:200])
        return jsonify(_fallback_quiz(events)), 200
    except Exception as exc:
        logger.error("Gemini quiz error: %s", exc)
        return jsonify(_fallback_quiz(events)), 200


# ---------------------------------------------------------------------------
# Endpoint: POST /api/translate
# ---------------------------------------------------------------------------

@app.route("/api/translate", methods=["POST"])
def translate() -> tuple[Response, int]:
    """Translate text to a target language using Gemini."""
    if _is_rate_limited("translate"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    text = data.get("text")
    if text is None:
        return _error("text is required")
    err = _validate_string(text, "text")
    if err:
        return _error(err)

    target_language = data.get("targetLanguage")
    if target_language is None:
        return _error("targetLanguage is required")
    err = _validate_string(target_language, "targetLanguage", max_len=10)
    if err:
        return _error(err)
    if target_language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported target language: {target_language}")

    prompt = (
        f"Translate the following text to {target_language}. "
        f"Return ONLY the translated text, nothing else.\n\n"
        f"Text: {text}"
    )

    try:
        if not _ai_ok:
            return jsonify({"translatedText": text}), 200
        response = _ai_chat(prompt)
        translated = response
        return jsonify({"translatedText": translated}), 200
    except Exception as exc:
        logger.error("Gemini translate error: %s", exc)
        return jsonify({"translatedText": text}), 200


# ---------------------------------------------------------------------------
# Endpoint: POST /api/catchup
# ---------------------------------------------------------------------------

@app.route("/api/catchup", methods=["POST"])
def catchup() -> tuple[Response, int]:
    """Generate a catch-up summary of match events for late-joining fans."""
    if _is_rate_limited("catchup"):
        return _error("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True)
    if data is None:
        return _error("Request body must be valid JSON")

    events = data.get("events")
    if events is None:
        return _error("events is required")
    err = _validate_events(events)
    if err:
        return _error(err)

    language = data.get("language", "en")
    err = _validate_string(language, "language", max_len=10)
    if err:
        return _error(err)
    if language not in SUPPORTED_LANGUAGES:
        return _error(f"Unsupported language: {language}")

    events_text = "\n".join(
        f"- [{ev['minute']}'] {ev['player']} ({ev['team']}): {ev['type']}"
        for ev in events
    )

    prompt = (
        "You are a football match summariser. A fan has just tuned in. "
        "Generate a concise, exciting catch-up summary.\n\n"
        f"Match events:\n{events_text}\n\n"
        f"Language: {language}\n\n"
        "Respond ONLY with valid JSON (no markdown fences):\n"
        "{\n"
        '  "summary": "<2-4 sentence catch-up summary>",\n'
        '  "keyMoments": [\n'
        '    {"minute": <int>, "description": "<what happened>"}\n'
        "  ]\n"
        "}\n\n"
        "Include only the most important moments in keyMoments (max 5)."
    )

    try:
        if not _ai_ok:
            return jsonify({
                "summary": f"Match in progress with {len(events)} key events so far.",
                "keyMoments": [{"minute": e.get("minute", 0), "description": e.get("details", e.get("type", ""))} for e in events[-3:]],
            }), 200
        response = _ai_chat(prompt)
        raw_text = response

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(raw_text)
        return jsonify(result), 200

    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Gemini catchup unavailable (%s), using local fallback", exc)
        key_events = [e for e in events if e.get("type") in ("goal", "red_card", "penalty_awarded")]
        fallback_moments = key_events or events[-3:]
        return jsonify({
            "summary": " ".join(
                f"{e.get('player', 'Player')} ({e.get('team', '')}) — {e.get('details', e.get('type', ''))} at {e.get('minute', 0)}'."
                for e in fallback_moments[:3]
            ) or "Match in progress.",
            "keyMoments": [{"minute": e.get("minute", 0), "description": e.get("details", e.get("type", ""))} for e in fallback_moments[:5]],
        }), 200
