import { PlayerCard } from '../../components/PlayerCard.js';
import { VideoPlayer } from '../../components/VideoPlayer.js';
import { clearElement } from '../../utils/dom.js';

export const liveInitMethods = {
  _initLivePage() {
    this._isRealMode = false;
    // Always create (or reuse) the VideoPlayer on the container
    const videoContainer = document.getElementById('video-container');
    if (!this.videoPlayer && videoContainer) {
      this.videoPlayer = new VideoPlayer(videoContainer);
    } else if (this.videoPlayer && videoContainer && !videoContainer.querySelector('.video-player')) {
      // Container was cleared (page re-navigated): re-render
      this.videoPlayer = new VideoPlayer(videoContainer);
    }
    // Video player will be rendered with the correct source inside _loadRealMatch or _startDemoSimulation

    if (!this.captionLayer) {
      const feedEl = document.getElementById('commentary-feed');
      if (feedEl) {
        this.captionLayer = {
          feedEl,
          mode: 'standard',
          addCommentary: (text, opts = {}) => this._addCommentary(text, opts),
          setMode: () => {},
          clear: () => clearElement(feedEl)
        };
      }
    }

    if (!this.playerCard) {
      const pcContainer = document.getElementById('player-card-container');
      if (pcContainer) {
        this.playerCard = new PlayerCard(pcContainer);
        this.playerCard.render();
      }
    }

    this._resetLiveDemoSession();

    // Bind live highlight reel clips
    this._bindHighlightReel();

    // Set scoreboard to loading state before fetching real data
    const scoreEl = document.getElementById('live-score-numbers');
    const minuteEl = document.getElementById('live-score-minute');
    const timerEl = document.getElementById('live-score-timer');
    if (scoreEl) scoreEl.textContent = '—';
    if (minuteEl) {
      minuteEl.textContent = 'CONNECTING';
      const pulseDot = document.getElementById('live-pulse-dot');
      if (pulseDot) pulseDot.style.display = 'none';
    }
    if (timerEl) {
      timerEl.textContent = 'FETCHING LIVE STREAM DATA...';
      timerEl.style.color = 'var(--text-muted)';
    }

    // Try ESPN API in background — if real data available, override. If it fails, fall back to demo simulation.
    this._loadRealMatch();

    this._bindLiveEvents();
    this._initLiveTravelCard();
    this._renderApiStatus();
    this._initTacticalPitch();
  },

  _resetLiveDemoSession() {
    this._clearManagedInterval('preMatchCountdown');
    this._clearManagedInterval('liveCountdown');
    this._clearManagedInterval('realLiveClock');
    this._clearManagedInterval('realPoll');
    this._clearManagedInterval('realLivePreMatchPoll');
    this.matchStarted = false;
    this._activeLiveMatch = null;
    this._seenRealEventKeys = new Set();
    this._renderedRealEventKeys = new Set();
    this._hasShownCommentaryOfflineToast = false;
    this._matchClockStartTime = Date.now();
    this._matchClockStartSeconds = 0;
    this.matchFeed?.reset?.();
    this.nightOwlService?.clearEvents?.();
    const feed = document.getElementById('commentary-feed');
    clearElement(feed);
    const panel = document.getElementById('night-owl-live-panel');
    if (panel) {
      panel.hidden = true;
      clearElement(panel);
    }
  },

  _initTacticalPitch() {
    const canvas = document.getElementById('tactical-pitch-canvas');
    if (!canvas) return;

    if (this._tacticalPitchAnimationFrame) {
      cancelAnimationFrame(this._tacticalPitchAnimationFrame);
      this._tacticalPitchAnimationFrame = null;
    }
    if (this._tacticalPitchResizeHandler) {
      window.removeEventListener('resize', this._tacticalPitchResizeHandler);
      this._tacticalPitchResizeHandler = null;
    }

    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    };
    resize();
    this._tacticalPitchResizeHandler = resize;
    window.addEventListener('resize', resize);
    
    const homePlayers = [
      { role: 'GK', x: 0.1, y: 0.5, name: 'E. Martinez' },
      { role: 'DF', x: 0.25, y: 0.2, name: 'Molina' },
      { role: 'DF', x: 0.25, y: 0.4, name: 'Romero' },
      { role: 'DF', x: 0.25, y: 0.6, name: 'Otamendi' },
      { role: 'DF', x: 0.25, y: 0.8, name: 'Tagliafico' },
      { role: 'MF', x: 0.45, y: 0.3, name: 'De Paul' },
      { role: 'MF', x: 0.42, y: 0.5, name: 'Fernandez' },
      { role: 'MF', x: 0.45, y: 0.7, name: 'Mac Allister' },
      { role: 'FW', x: 0.7, y: 0.25, name: 'Messi' },
      { role: 'FW', x: 0.75, y: 0.5, name: 'Alvarez' },
      { role: 'FW', x: 0.7, y: 0.75, name: 'Gonzalez' }
    ];

    const awayPlayers = [
      { role: 'GK', x: 0.9, y: 0.5, name: 'El Shenawy' },
      { role: 'DF', x: 0.75, y: 0.2, name: 'Hany' },
      { role: 'DF', x: 0.75, y: 0.4, name: 'Hegazi' },
      { role: 'DF', x: 0.75, y: 0.6, name: 'Abdelmonem' },
      { role: 'DF', x: 0.75, y: 0.8, name: 'Fatouh' },
      { role: 'MF', x: 0.55, y: 0.35, name: 'El Neny' },
      { role: 'MF', x: 0.55, y: 0.65, name: 'Fathi' },
      { role: 'MF', x: 0.48, y: 0.5, name: 'Said' },
      { role: 'FW', x: 0.3, y: 0.25, name: 'Salah' },
      { role: 'FW', x: 0.25, y: 0.5, name: 'Mostafa' },
      { role: 'FW', x: 0.3, y: 0.75, name: 'Trezeguet' }
    ];

    let ball = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;

      // Draw field background
      ctx.fillStyle = '#0a101d'; // Dark slate matching UI
      ctx.fillRect(0, 0, W, H);

      // Pitch lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Neon/emerald green
      ctx.lineWidth = Math.max(1, 1.5 * (window.devicePixelRatio || 1));

      const pad = 12 * (window.devicePixelRatio || 1);
      
      // Outer line
      ctx.strokeRect(pad, pad, W - 2*pad, H - 2*pad);

      // Center line
      ctx.beginPath();
      ctx.moveTo(W / 2, pad);
      ctx.lineTo(W / 2, H - pad);
      ctx.stroke();

      // Center Circle
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.15, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      const boxW = W * 0.15;
      const boxH = H * 0.5;
      ctx.strokeRect(pad, H/2 - boxH/2, boxW, boxH);
      ctx.strokeRect(W - pad - boxW, H/2 - boxH/2, boxW, boxH);

      // Goal areas
      const goalW = W * 0.05;
      const goalH = H * 0.22;
      ctx.strokeRect(pad, H/2 - goalH/2, goalW, goalH);
      ctx.strokeRect(W - pad - goalW, H/2 - goalH/2, goalW, goalH);

      const drawPlayer = (p, color, shadowColor) => {
        const px = pad + p.x * (W - 2*pad);
        const py = pad + p.y * (H - 2*pad);

        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 8 * (window.devicePixelRatio || 1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 5 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8f9cae';
        ctx.fillText(p.name.split(' ').pop(), px, py - 8 * (window.devicePixelRatio || 1));
      };

      // Draw home players (Argentina - Cyan neon)
      ctx.font = `${Math.round(8 * (window.devicePixelRatio || 1))}px sans-serif`;
      ctx.textAlign = 'center';
      homePlayers.forEach(p => {
        const dx = (Math.random() - 0.5) * 0.003;
        const dy = (Math.random() - 0.5) * 0.003;
        p.x = Math.max(0.04, Math.min(0.48, p.x + dx));
        p.y = Math.max(0.08, Math.min(0.92, p.y + dy));
        drawPlayer(p, '#00f2fe', '#00f2fe');
      });

      // Draw away players (Egypt - Red neon)
      awayPlayers.forEach(p => {
        const dx = (Math.random() - 0.5) * 0.003;
        const dy = (Math.random() - 0.5) * 0.003;
        p.x = Math.max(0.52, Math.min(0.96, p.x + dx));
        p.y = Math.max(0.08, Math.min(0.92, p.y + dy));
        drawPlayer(p, '#f43f5e', '#f43f5e');
      });

      // Pass the ball between players
      if (Math.abs(ball.x - ball.targetX) < 0.015 && Math.abs(ball.y - ball.targetY) < 0.015) {
        const team = Math.random() > 0.45 ? homePlayers : awayPlayers;
        const p = team[Math.floor(Math.random() * team.length)];
        ball.targetX = p.x;
        ball.targetY = p.y;
      }

      ball.x += (ball.targetX - ball.x) * 0.05;
      ball.y += (ball.targetY - ball.y) * 0.05;

      const bx = pad + ball.x * (W - 2*pad);
      const by = pad + ball.y * (H - 2*pad);

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12 * (window.devicePixelRatio || 1);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const loop = () => {
      if (this.currentPage === 'live') {
        draw();
        this._tacticalPitchAnimationFrame = requestAnimationFrame(loop);
      } else {
        if (this._tacticalPitchResizeHandler) {
          window.removeEventListener('resize', this._tacticalPitchResizeHandler);
          this._tacticalPitchResizeHandler = null;
        }
        this._tacticalPitchAnimationFrame = null;
      }
    };
    this._tacticalPitchAnimationFrame = requestAnimationFrame(loop);
  },

  _bindHighlightReel() {
    const clips = document.querySelectorAll('.live-hl-clip');
    clips.forEach(clip => {
      clip.addEventListener('click', () => {
        const ytId = clip.dataset.yt;
        if (!ytId || !this.videoPlayer) return;
        // Load the official YouTube highlight into the main player.
        this.videoPlayer.render(`https://www.youtube.com/embed/${ytId}`, {
          autoplay: true, muted: false, controls: true, overlay: false, isLive: false,
        });
      });
    });
  }
};
