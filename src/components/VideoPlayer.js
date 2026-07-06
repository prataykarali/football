/**
 * Video Player Component — plays match stream or highlight clips
 * Supports overlay for Player ID, picture-in-picture, and keyboard shortcuts.
 */
export class VideoPlayer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.videoEl = null;
    this.isPlaying = false;
    this.currentSrc = '';
    this._onTimeUpdate = null;
    this._onEnded = null;
  }

  render(src, options = {}) {
    if (!this.containerEl) return;

    const { autoplay = true, loop = false, muted = true, controls = true, overlay = false } = options;

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
        >
          <source src="${src}" type="video/mp4" />
          Your browser does not support video.
        </video>
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
          <button class="video-ctrl-btn" id="btn-video-pip" aria-label="Picture in picture">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="9" width="8" height="7" rx="1" fill="currentColor" opacity="0.5"/></svg>
          </button>
          <button class="video-ctrl-btn" id="btn-video-fullscreen" aria-label="Fullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>
      </div>
    `;

    this.videoEl = this.containerEl.querySelector('#match-video');
    this.videoEl.src = src;
    this.currentSrc = src;
    this.videoEl.load();
    this._bindControls();
  }

  _bindControls() {
    const video = this.videoEl;
    if (!video) return;

    const playBtn = this.containerEl.querySelector('#btn-video-play');
    const progress = this.containerEl.querySelector('#video-progress');
    const progressBar = this.containerEl.querySelector('#video-progress-bar');
    const timeDisplay = this.containerEl.querySelector('#video-time');
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
        case 'f': fsBtn?.click(); break;
        case 'm': video.muted = !video.muted; break;
      }
    });
  }

  play(src) {
    if (src && src !== this.currentSrc) {
      this.videoEl.src = src;
      this.currentSrc = src;
      this.videoEl.load();
    }
    this.videoEl?.play();
  }

  pause() {
    this.videoEl?.pause();
  }

  setOverlayScore(homeTeam, awayTeam, homeScore, awayScore) {
    const el = this.containerEl?.querySelector('#video-score-overlay');
    if (el) {
      el.innerHTML = `
        <span class="video-score__team">${homeTeam}</span>
        <span class="video-score__num">${homeScore} — ${awayScore}</span>
        <span class="video-score__team">${awayTeam}</span>
      `;
    }
  }

  onTimeUpdate(fn) { this._onTimeUpdate = fn; }
  onEnded(fn) { this._onEnded = fn; }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  destroy() {
    this.videoEl?.pause();
    this.videoEl = null;
  }
}
