from __future__ import annotations

import base64
from typing import Any

from flask import Response, jsonify

from .config import MAX_EVENTS, MAX_FRAME_BYTES, MAX_STRING_LENGTH, REQUIRED_EVENT_FIELDS

def _validate_string(value: Any, name: str, max_len: int = MAX_STRING_LENGTH) -> str | None:
    """Return an error message if *value* is not a valid string, else None."""
    if not isinstance(value, str):
        return f"{name} must be a string"
    if len(value) > max_len:
        return f"{name} exceeds maximum length ({max_len})"
    return None


def _validate_event(event: Any) -> str | None:
    """Return an error message if *event* dict is invalid, else None."""
    if not isinstance(event, dict):
        return "Each event must be an object"
    missing = REQUIRED_EVENT_FIELDS - set(event.keys())
    if missing:
        return f"Event missing required fields: {', '.join(sorted(missing))}"
    for field in REQUIRED_EVENT_FIELDS:
        if field == "minute":
            if not isinstance(event[field], (int, float)):
                return "event.minute must be a number"
        else:
            err = _validate_string(event[field], f"event.{field}", max_len=200)
            if err:
                return err
    return None


def _validate_events(events: Any) -> str | None:
    """Validate an events list."""
    if not isinstance(events, list):
        return "events must be an array"
    if len(events) == 0:
        return "events array must not be empty"
    if len(events) > MAX_EVENTS:
        return f"events array exceeds maximum length ({MAX_EVENTS})"
    for i, ev in enumerate(events):
        err = _validate_event(ev)
        if err:
            return f"events[{i}]: {err}"
    return None

def _validate_base64_frame(frame: Any) -> str | None:
    """Validate a base64-encoded image frame."""
    if not isinstance(frame, str):
        return "frame must be a base64 string"
    if len(frame) == 0:
        return "frame must not be empty"
    # Quick length check before decoding (base64 expands ~4/3)
    if len(frame) * 3 / 4 > MAX_FRAME_BYTES:
        return f"Decoded frame exceeds maximum size ({MAX_FRAME_BYTES} bytes)"
    try:
        decoded = base64.b64decode(frame, validate=True)
    except Exception:
        return "frame is not valid base64"
    if len(decoded) > MAX_FRAME_BYTES:
        return f"Decoded frame exceeds maximum size ({MAX_FRAME_BYTES} bytes)"
    return None


def _error(message: str, status: int = 400) -> tuple[Response, int]:
    """Return a JSON error response."""
    return jsonify({"error": message}), status
