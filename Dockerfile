# syntax=docker/dockerfile:1
# VANTAGE — full-stack Docker image for Hugging Face Spaces.
# Stage 1 builds the Vite frontend; stage 2 runs Flask, which serves the built
# frontend AND the /api routes on port 7860 (the port HF Spaces expects).

# ---------- Stage 1: build the frontend ----------
FROM node:20-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---------- Stage 2: Python runtime ----------
FROM python:3.11-slim

# HF Spaces run as uid 1000.
RUN useradd -m -u 1000 user
ENV PATH="/home/user/.local/bin:$PATH" \
    PORT=7860 \
    STATIC_DIR=/app/dist \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --chown=user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade -r backend/requirements.txt

COPY --chown=user backend ./backend
COPY --chown=user --from=frontend /build/dist ./dist

USER user
EXPOSE 7860
WORKDIR /app/backend

# Gunicorn with threads handles the streaming commentary endpoint fine.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "2", "--threads", "4", "--timeout", "120", "serve:app"]
