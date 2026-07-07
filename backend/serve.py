"""Production entrypoint for Docker / Hugging Face Spaces.

Importing `proxy` registers all /api routes; importing `static_routes` registers
the built frontend + SPA fallback. Gunicorn serves `serve:app` on port 7860.
"""
from __future__ import annotations

import os

from proxy import app  # noqa: F401  registers /api, /health, leaderboard, pulse
from proxy_app import static_routes  # noqa: F401  registers frontend + SPA fallback

if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    app.run(host="0.0.0.0", port=port)
