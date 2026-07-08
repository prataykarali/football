/**
 * Video Player Component — plays match stream or highlight clips
 * Supports overlay for Player ID, picture-in-picture, and keyboard shortcuts.
 */
import { resolveVideo, VIDEO_BASE } from '../utils/media.js';

export class VideoPlayer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.videoEl = null;
    this.isPlaying = false;
    this.currentSrc = '';
    this.zoom = 1;
    this._onTimeUpdate = null;
    this._onEnded = null;
  }

  render(src, options = {}) {
    if (!this.containerEl) return;

    const { autoplay = true, loop = false, muted = true, controls = true, overlay = false } = options;
    const safeSrc = this._safeMediaSrc(src);
    const isYouTube = safeSrc.includes('youtube.com') || safeSrc.includes('youtu.be') || safeSrc.includes('embed/');
    const isTwitch = safeSrc.includes('twitch.tv');

    const existingFallback = this.containerEl.querySelector('.video-fallback');
    if (existingFallback) existingFallback.remove();

    if (isYouTube) {
      let embedUrl = safeSrc;
      if (safeSrc.includes('watch?v=')) {
        const id = safeSrc.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      } else if (safeSrc.includes('youtu.be/')) {
        const id = safeSrc.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      }
      // Add parameters
      const connector = embedUrl.includes('?') ? '&' : '?';
      embedUrl = `${embedUrl}${connector}autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${controls ? 1 : 0}`;

      this.containerEl.innerHTML = `
        <div class="video-player" role="region" aria-label="Match video player">
          <iframe
            id="match-video"
            class="video-player__video"
            src="${embedUrl}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            style="width: 100%; height: 100%; object-fit: cover;"
          ></iframe>
          <div class="video-player__scan-reticle" id="video-scan-reticle" hidden>
            <span></span>
          </div>
          <div class="video-player__live-badge" id="video-live-badge" ${options.isLive ? '' : 'hidden'}>
            <span class="video-player__live-dot"></span> LIVE
          </div>
          ${overlay ? `
          <div class="video-player__overlay" id="video-overlay">
            <div class="video-player__score" id="video-score-overlay"></div>
          </div>
          ` : ''}
        </div>
      `;
    } else if (isTwitch) {
      let channelName = 'esl_sc2';
      const parts = safeSrc.split('twitch.tv/');
      if (parts[1]) {
        channelName = parts[1].split('/').shift().split('?').shift().trim();
      }
      const parentDomain = window.location.hostname || 'localhost';
      const embedUrl = `https://player.twitch.tv/?channel=${channelName}&parent=${parentDomain}&autoplay=${autoplay ? 'true' : 'false'}&muted=${muted ? 'true' : 'false'}`;

      this.containerEl.innerHTML = `
        <div class="video-player" role="region" aria-label="Match video player">
          <iframe
            id="match-video"
            class="video-player__video"
            src="${embedUrl}"
            frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            style="width: 100%; height: 100%; object-fit: cover;"
          ></iframe>
          <div class="video-player__scan-reticle" id="video-scan-reticle" hidden>
            <span></span>
          </div>
          <div class="video-player__live-badge" id="video-live-badge" ${options.isLive ? '' : 'hidden'}>
            <span class="video-player__live-dot"></span> LIVE
          </div>
          ${overlay ? `
          <div class="video-player__overlay" id="video-overlay">
            <div class="video-player__score" id="video-score-overlay"></div>
          </div>
          ` : ''}
        </div>
      `;
    } else {
      this.containerEl.innerHTML = `
        <div class="video-player" role="region" aria-label="Match video player">
          <video
            id="match-video"
            class="video-player__video"
            ${autoplay ? 'autoplay' : ''}
            ${loop ? 'loop' : ''}
            ${muted ? 'muted' : ''}
            ${controls ? 'controls' : ''}
            playsinline
            preload="metadata"
            aria-label="Match footage"
            poster="/images/stage3.jpeg"
          >
            <source src="${safeSrc}" type="video/mp4" />
            Your browser does not support video.
          </video>
          <div class="video-player__scan-reticle" id="video-scan-reticle" hidden>
            <span></span>
          </div>
          <div class="video-player__live-badge" id="video-live-badge" ${options.isLive ? '' : 'hidden'}>
            <span class="video-player__live-dot"></span> LIVE
          </div>
          ${overlay ? `
          <div class="video-player__overlay" id="video-overlay">
            <div class="video-player__score" id="video-score-overlay"></div>
          </div>
          ` : ''}
          <div class="video-player__controls-bar" id="video-controls-bar">
            <button class="video-ctrl-btn" id="btn-video-play" aria-label="Play/Pause">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <div class="video-progress" id="video-progress">
              <div class="video-progress__bar" id="video-progress-bar"></div>
            </div>
            <span class="video-time" id="video-time">0:00</span>
            <button class="video-ctrl-btn" id="btn-video-zoom-out" aria-label="Zoom out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <span class="video-zoom-label" id="video-zoom-label">1.0x</span>
            <button class="video-ctrl-btn" id="btn-video-zoom-in" aria-label="Zoom in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M11 8v6"/><path d="M8 11h6"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button class="video-ctrl-btn" id="btn-video-pip" aria-label="Picture in picture">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="9" width="8" height="7" rx="1" fill="currentColor" opacity="0.5"/></svg>
            </button>
            <button class="video-ctrl-btn" id="btn-video-fullscreen" aria-label="Fullscreen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    this.videoEl = this.containerEl.querySelector('#match-video');
    this.currentSrc = safeSrc;
    this.setZoom(1);

    if (this.videoEl && this.videoEl.tagName === 'VIDEO') {
      this.videoEl.src = safeSrc;
      this.videoEl.load();
      this._bindControls();

      this.videoEl.addEventListener('error', () => {
        if (this.videoEl && this.videoEl.parentElement) {
          this.videoEl.style.display = 'none';
          let fallback = this.containerEl.querySelector('.video-fallback');
          if (!fallback) {
            fallback = document.createElement('div');
            fallback.className = 'video-fallback';
            fallback.style.cssText = 'position:absolute;inset:0;background:url(/images/stage3.jpeg) center/cover;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
            fallback.innerHTML = '<div style="background:rgba(0,0,0,0.7);padding:16px 24px;border-radius:12px;font-family:var(--font-heading);font-size:1.2rem;color:#fff;">⚽ LIVE MATCH FEED</div><div style="color:var(--text-muted);font-size:0.8rem;">Stream connecting...</div>';
            this.videoEl.parentElement.appendChild(fallback);
          }
        }
      });
    }
  }

  _bindControls() {
    const video = this.videoEl;
    if (!video || video.tagName !== 'VIDEO') return;

    const playBtn = this.containerEl.querySelector('#btn-video-play');
    const progress = this.containerEl.querySelector('#video-progress');
    const progressBar = this.containerEl.querySelector('#video-progress-bar');
    const timeDisplay = this.containerEl.querySelector('#video-time');
    const zoomOutBtn = this.containerEl.querySelector('#btn-video-zoom-out');
    const zoomInBtn = this.containerEl.querySelector('#btn-video-zoom-in');
    const pipBtn = this.containerEl.querySelector('#btn-video-pip');
    const fsBtn = this.containerEl.querySelector('#btn-video-fullscreen');

    // Play/Pause
    const togglePlay = () => {
      if (video.paused) { video.play(); } else { video.pause(); }
    };
    playBtn?.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('play', () => {
      this.isPlaying = true;
      if (playBtn) playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    });

    video.addEventListener('pause', () => {
      this.isPlaying = false;
      if (playBtn) playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    });

    // Progress bar
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (timeDisplay) timeDisplay.textContent = this._formatTime(video.currentTime);
      if (this._onTimeUpdate) this._onTimeUpdate(video.currentTime, video.duration);
    });

    // Seek
    progress?.addEventListener('click', (e) => {
      const rect = progress.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      video.currentTime = pct * video.duration;
    });

    zoomOutBtn?.addEventListener('click', () => this.setZoom(this.zoom - 0.25));
    zoomInBtn?.addEventListener('click', () => this.setZoom(this.zoom + 0.25));

    // Ended
    video.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this._onEnded) this._onEnded();
    });

    // PiP
    pipBtn?.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (e) {
        console.warn('PiP not supported:', e);
      }
    });

    // Fullscreen
    fsBtn?.addEventListener('click', () => {
      const player = this.containerEl.querySelector('.video-player');
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        player?.requestFullscreen?.();
      }
    });

    // Keyboard shortcuts
    video.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': video.currentTime = Math.max(0, video.currentTime - 5); break;
        case 'ArrowRight': video.currentTime = Math.min(video.duration, video.currentTime + 5); break;
        case '+':
        case '=': this.setZoom(this.zoom + 0.25); break;
        case '-': this.setZoom(this.zoom - 0.25); break;
        case 'f': fsBtn?.click(); break;
        case 'm': video.muted = !video.muted; break;
      }
    });
  }

  play(src) {
    const safeSrc = this._safeMediaSrc(src || this.currentSrc);
    if (safeSrc && safeSrc !== this.currentSrc) {
      this.render(safeSrc, {
        autoplay: true, loop: true, muted: true, controls: true, overlay: true
      });
    } else if (this.videoEl && this.videoEl.tagName === 'VIDEO') {
      this.videoEl.play();
    }
  }

  setZoom(nextZoom = 1) {
    this.zoom = Math.min(5, Math.max(1, Number(nextZoom) || 1));
    if (this.videoEl) {
      this.videoEl.style.transform = `scale(${this.zoom})`;
      this.videoEl.style.transformOrigin = 'center center';
      this.videoEl.style.transition = 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }
    const label = this.containerEl?.querySelector('#video-zoom-label');
    if (label) label.textContent = `${this.zoom.toFixed(1)}x`;
    const player = this.containerEl?.querySelector('.video-player');
    if (player) player.classList.toggle('video-player--zoomed', this.zoom > 1);
  }

  pulseScanReticle() {
    const reticle = this.containerEl?.querySelector('#video-scan-reticle');
    if (!reticle) return;
    reticle.hidden = false;
    reticle.classList.remove('video-player__scan-reticle--pulse');
    void reticle.offsetWidth;
    reticle.classList.add('video-player__scan-reticle--pulse');
    setTimeout(() => {
      reticle.hidden = true;
      reticle.classList.remove('video-player__scan-reticle--pulse');
    }, 1600);
  }

  setOverlayScore(homeTeam, awayTeam, homeScore, awayScore) {
    const el = this.containerEl?.querySelector('#video-score-overlay');
    if (el) {
      const safe = (s) => String(s || '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
      el.innerHTML = `
        <span class="video-score__team">${safe(homeTeam)}</span>
        <span class="video-score__num">${homeScore} — ${awayScore}</span>
        <span class="video-score__team">${safe(awayTeam)}</span>
      `;
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  _safeMediaSrc(src = '') {
    const text = String(src || '').trim();
    if (text.includes('youtube.com') || text.includes('youtu.be')) return text;
    if (text.includes('twitch.tv')) return text;
    // Already-resolved release URLs (e.g. a re-render) pass through unchanged.
    if (text.startsWith(`${VIDEO_BASE}/`) && /\.mp4($|\?)/i.test(text)) return text;
    // Otherwise only accept whitelisted /videos/*.mp4 paths; anything else falls
    // back to the local, always-playable demo clip.
    return resolveVideo(text) || '/videos/football-goal-1.mp4';
  }

  destroy() {
    if (this.videoEl && this.videoEl.tagName === 'VIDEO') {
      this.videoEl.pause();
    }
    this.videoEl = null;
  }
}
