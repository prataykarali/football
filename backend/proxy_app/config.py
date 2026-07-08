from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import requests as http_requests
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from pulse import pulse_bp

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is not set. Commentary/Quiz will use fallback mode.")

# Free-tier quota is per-model (~20 requests/day each), so we spread calls
# across several interchangeable models. When one is exhausted (HTTP 429) we
# immediately fall through to the next, multiplying the effective free budget.
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-flash-lite-latest",
]
_ai_ok = bool(GEMINI_API_KEY)

app = Flask(__name__)


def _cors_origins() -> list[str]:
    configured = os.getenv("VANTAGE_CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if origins:
        return origins
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://huggingface.co",
        r"^https://([a-z0-9-]+\.)*hf\.space$",
    ]


CORS(app, resources={r"/api/*": {"origins": _cors_origins()}})
app.register_blueprint(pulse_bp)

SUPPORTED_LANGUAGES = {
    "en", "es", "fr", "de", "it", "pt", "ar", "hi", "zh", "ja",
    "ko", "nl", "ru", "tr", "pl", "sv", "da", "no", "fi", "cs",
    "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ur",
    "id", "vi", "th", "ms", "fil", "uk", "he", "fa", "el", "ro",
    "hu", "sk", "bg", "hr", "sr", "sl", "et", "lv", "lt", "is",
    "ga", "cy", "sq", "mk", "hy", "ka", "az", "kk", "uz",
}

MAX_STRING_LENGTH = 5000
MAX_EVENTS = 50
MAX_FRAME_BYTES = 4 * 1024 * 1024

VALID_PACES = {"slow", "medium", "fast"}
VALID_REGISTERS = {"casual", "tactical"}
REQUIRED_EVENT_FIELDS = {"type", "minute", "player", "team"}

_rate_buckets: dict[str, list[float]] = {}
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW = 60.0


def _is_rate_limited(endpoint: str) -> bool:
    now = time.time()
    bucket = _rate_buckets.setdefault(endpoint, [])
    _rate_buckets[endpoint] = [ts for ts in bucket if now - ts < RATE_LIMIT_WINDOW]
    bucket = _rate_buckets[endpoint]
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(now)
    return False
