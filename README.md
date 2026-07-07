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

Live-match companion for the FIFA World Cup: real-time scoreboard with a real
countdown to kickoff, an embeddable live stream, official YouTube highlight
replays, AI commentary, a Night Owl catch-up mode, player-ID, venue guides, and
predictions.

## Architecture

A single Docker image runs a **Flask** backend that serves both:

- the built **Vite** frontend (static `dist/`), and
- the `/api/*` routes (Gemini commentary/quiz/catch-up/vision, ESPN live data,
  leaderboard) — all on the same origin, port **7860**.

## Configuration

Set **`GEMINI_API_KEY`** as a Space **secret** (Settings → *Variables and
secrets*). Without it, AI features fall back to local logic automatically (the
app stays fully functional on the free tier).

## Local development

```bash
npm install && npm run dev      # frontend on :5173 (proxies /api → :5001)
npm run backend                 # Flask API on :5001
```
