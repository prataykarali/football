---
title: VANTAGE Football
emoji: ⚽
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# VANTAGE — AI Second-Screen Football Companion

A smart, context-aware assistant for live football. VANTAGE is the fan's
**second screen** during a match: it reads the situation — is the match live,
already over, is the AI quota gone, is the user vision- or hearing-impaired, how
long until kickoff — and adapts what it shows and how it behaves, instead of
rendering one static page for everyone.

> Browser front-end (vanilla JS + Vite) with a thin Flask API that proxies Google
> **Gemini** and **ESPN**, and degrades gracefully to local logic when either is
> unavailable.

---

## 1. Chosen vertical

**Live-sports fan companion** — persona: the *match-day football fan* watching on
a second screen (phone/tablet) alongside the broadcast.

The whole product is designed around one question: *"Given everything I can infer
about this fan right now, what is the single most useful thing to show them?"*
That is the "logical decision making based on user context" the brief asks for.

## 2. Approach & logic

VANTAGE is a **decision layer**, not just a UI. Every major feature branches on
runtime context:

| Context signal | Decision the assistant makes |
| --- | --- |
| Broadcast embed is geo/embed-blocked (e.g. FIFA on YouTube → *"Video unavailable"*) | Fall back to a **release-hosted demo clip** so the "live" player always plays |
| Gemini quota exhausted / no API key | Swap AI commentary, quizzes and player-ID for **deterministic local fallbacks** — the app stays 100% functional on the free tier |
| ESPN live feed unreachable | Serve **realistic hardcoded** standings / fixtures instead of erroring |
| Time-to-kickoff | Venue guide ranks travel options (rideshare / transit / park-and-walk) by **minutes remaining**, not a fixed list |
| Match already finished | **Night Owl** catch-up mode summarises what you missed instead of a dead live view |
| Vision- / hearing-impaired toggles | Enables TTS narration / captions and adjusts contrast and motion |
| Stream is a cross-origin iframe | Skips the "doomed" pixel-scan and identifies the player from **live event context** instead |

The guiding principle: **never show a broken or empty state** — always fall
forward to the next-best experience.

## 3. How the solution works

### Architecture
- **Frontend** — vanilla JS modules built with Vite (`src/`, `index.html`).
  Hash-based routing, no framework.
- **Backend** — Flask (`backend/proxy_app/`) exposing `/api/*`:
  - `/api/commentary`, `/api/quiz`, `/api/catchup`, `/api/vision` → Gemini (with
    local fallbacks in `fallbacks.py`)
  - `/api/livematch`, `/api/standings`, `/api/fixtures`, `/api/highlights` → ESPN
    (with hardcoded fallbacks)
  - `/api/leaderboard` → local JSON store
  - Input validation & rate-limiting in `security.py` / `validation.py`.
- **Deploy** — a single Docker image: Flask serves the built `dist/` **and** the
  API on port **7860** (same origin).

### AI Vision player-ID (the "showcase the vision" flow)
1. The default live feed is a small demo clip hosted by the separate
   `vantage-football` media release.
2. Tapping **Identify Player** uses the best available live context and frame
   capture when the browser permits it, then POSTs to `/api/vision`.
3. The backend asks **Gemini Vision** to identify the player; the card shows
   name, position, nationality, live stats and a fun fact.
4. If the frame can't be captured (cross-origin stream) or Gemini is unavailable,
   it falls back to identifying the player from the live event feed — clearly
   labelled so the UI never overstates confidence.

### Media hosting
Images and videos are **not committed** in this repo. They are hosted as
**GitHub Release assets** in the separate `vantage-football` repo and resolved at runtime by
`src/utils/media.js`:

- `resolveVideo(...)` maps known video asset references to release URLs.
- `resolveImage(...)` maps known image asset references to release URLs.

Net result: source repo has no checked-in image/video assets.

## 4. Running locally

```bash
npm install
npm run dev          # frontend on http://localhost:5173 (proxies /api → :5001)
npm run backend      # Flask API on :5001
npm test             # vitest unit tests
npm run build        # production build → dist/
```

Set **`GEMINI_API_KEY`** in `backend/.env` (or as a deployment secret) to enable
live AI. Without it, every AI feature automatically uses its local fallback — the
app is fully usable.

## 5. Assumptions

- **Demo-first, not a piracy tool.** Real broadcasts are rights-restricted and
  routinely embed-blocked, so the default "live" experience is a looping demo
  clip. Users can paste their own working YouTube/Twitch stream at runtime.
- **Free-tier AI.** Gemini is assumed to be on the free quota, so AI is treated as
  best-effort with deterministic fallbacks — never a hard dependency.
- **World Cup 2026 context** for sample teams, venues and fixtures.
- **GitHub Release CDN** for media assets: the release tag `media-v1` in the
  separate `vantage-football` repo hosts them.

## Tech
Vanilla JS · Vite · Flask · Google Gemini · ESPN API · Docker · Vitest

## License
MIT
