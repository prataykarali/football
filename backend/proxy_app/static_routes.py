"""Serve the built Vite frontend (production) alongside the /api routes.

In development the frontend is served by Vite (which proxies /api to Flask). In
production — Docker / Hugging Face Spaces — there is no Vite, so Flask serves the
static build from `dist/` on the same origin as the API.
"""
from __future__ import annotations

import os

from flask import send_from_directory

from .config import app

# The Docker image copies the built frontend to /app/dist (STATIC_DIR). Falls
# back to ../../dist for a local `python serve.py` run after `npm run build`.
STATIC_DIR = os.getenv(
    "STATIC_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist")),
)


@app.route("/")
def _serve_index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def _serve_static(filename: str):
    # Never let the SPA catch-all shadow the API blueprint.
    if filename.startswith("api/"):
        return ("Not found", 404)
    if os.path.isfile(os.path.join(STATIC_DIR, filename)):
        return send_from_directory(STATIC_DIR, filename)
    # SPA fallback: hash routing means unknown paths still serve index.html.
    return send_from_directory(STATIC_DIR, "index.html")
