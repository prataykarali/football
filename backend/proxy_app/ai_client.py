from __future__ import annotations

import json

from .config import GEMINI_API_KEY, GEMINI_MODELS, http_requests, logger

def _ai_chat(prompt: str, max_retries: int = 1) -> str:
    """Call Google AI Studio REST API with model fallback.

    On a 429 (free-tier quota exhausted) we do NOT block the request thread on a
    retry — each model has its own quota, so we immediately fall through to the
    next model, which is far more likely to answer quickly.
    """
    for model in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        for attempt in range(max_retries + 1):
            try:
                resp = http_requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.7},
                    },
                    timeout=30,
                )
                if resp.status_code == 429:
                    break  # quota hit for this model — skip straight to the next
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except Exception:
                if attempt < max_retries:
                    continue
                break  # try next model
    raise RuntimeError("All models exhausted")


def _ai_chat_stream(prompt: str):
    """Generator that yields text chunks from Google AI Studio streaming."""
    for model in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={GEMINI_API_KEY}&alt=sse"
        try:
            resp = http_requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.7},
                },
                timeout=30,
                stream=True,
            )
            if resp.status_code == 429:
                continue  # try next model
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        chunk = json.loads(data_str)
                        text = chunk.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            yield text
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue
            return  # success, stop trying models
        except Exception:
            continue  # try next model
    logger.error("All streaming models exhausted")
    yield "[Commentary generation error]"


# ---------------------------------------------------------------------------
# Security Headers (applied to EVERY response)
