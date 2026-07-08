import { NEXT_MATCH } from '../data/sampleMatch.js';
import { HOUR_MS, SECOND_MS } from './constants.js';
import { resolveImage } from '../utils/media.js';
import { escapeHTML, setHTML } from '../utils/dom.js';

export const homePageMethods = {
  _initHomePage() {
    this._renderUpcomingMatches();
    this._renderNews();
    this._renderBlogPosts();
    this._loadSpotlightFromAPI();
  },

  _renderUpcomingMatches() {
    const container = document.getElementById('upcoming-matches');
    if (!container) return;

    // Try to fetch real fixtures from the API
    fetch('/api/fixtures').then(r => r.json()).then(data => {
      const fixtures = data.fixtures || [];
      if (fixtures.length > 0) {
        setHTML(container, fixtures.slice(0, 8).map(m => {
          const homeAbbr = String(m.homeTeam?.abbreviation || '');
          const awayAbbr = String(m.awayTeam?.abbreviation || '');
          const homeFlag = this._countryFlag(homeAbbr);
          const awayFlag = this._countryFlag(awayAbbr);
          const date = new Date(m.date);
          const isValidDate = !Number.isNaN(date.getTime());
          const dateStr = isValidDate ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase() : 'TBC';
          const timeStr = isValidDate ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
          const isLive = Boolean(m.status?.isLive);
          const isSoon = !m.status?.isFinished && !isLive && isValidDate && (date.getTime() - Date.now()) < 24 * 60 * 60 * 1000;
          return `
            <div class="upcoming-card motion-fade-in">
              <div class="upcoming-card__league">FIFA World Cup 2026</div>
              <div class="upcoming-card__teams">
                <div class="upcoming-card__team">${homeFlag} ${escapeHTML(m.homeTeam?.name || 'Home')}</div>
                <span class="vs-badge">VS</span>
                <div class="upcoming-card__team">${awayFlag} ${escapeHTML(m.awayTeam?.name || 'Away')}</div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div class="upcoming-card__time">${dateStr} · ${timeStr}</div>
                ${isLive ? '<div class="upcoming-card__status upcoming-card__status--live">● LIVE</div>' : isSoon ? '<div class="upcoming-card__status upcoming-card__status--soon">● SOON</div>' : ''}
              </div>
            </div>
          `;
        }).join(''));
      } else {
        this._renderFallbackUpcoming(container);
      }
    }).catch(() => this._renderFallbackUpcoming(container));
  },

  _renderFallbackUpcoming(container) {
    const matches = [
      { league: 'FIFA World Cup 2026', home: '🇺🇸 USA', away: '🇨🇦 Canada', time: '08 JUL · 08:00 PM', status: 'soon' },
      { league: 'FIFA World Cup 2026', home: '🇧🇷 Brazil', away: '🇦🇷 Argentina', time: '09 JUL · 08:00 PM', status: null },
      { league: 'FIFA World Cup 2026', home: '🇫🇷 France', away: '🇩🇪 Germany', time: '10 JUL · 08:00 PM', status: null },
      { league: 'FIFA World Cup 2026', home: '🇪🇸 Spain', away: '🇵🇹 Portugal', time: '11 JUL · 08:00 PM', status: null },
      { league: 'FIFA World Cup 2026', home: '🇲🇽 Mexico', away: '🇯🇵 Japan', time: '12 JUL · 06:00 PM', status: null },
      { league: 'FIFA World Cup 2026', home: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England', away: '🇳🇱 Netherlands', time: '13 JUL · 08:00 PM', status: 'soon' },
    ];

    setHTML(container, matches.map(m => `
      <div class="upcoming-card motion-fade-in">
        <div class="upcoming-card__league">${m.league}</div>
        <div class="upcoming-card__teams">
          <div class="upcoming-card__team">${m.home}</div>
          <span class="vs-badge">VS</span>
          <div class="upcoming-card__team">${m.away}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="upcoming-card__time">${m.time}</div>
          ${m.status ? `<div class="upcoming-card__status upcoming-card__status--${m.status}">${m.status === 'live' ? '● LIVE' : '● SOON'}</div>` : ''}
        </div>
      </div>
    `).join(''));
  },

  _renderNews() {
    const container = document.getElementById('news-grid');
    if (!container) return;

    const news = [
      {
        img: resolveImage('azteca'),
        tag: 'Champions League',
        title: 'Champions League Final: Tactical Storylines to Watch',
        desc: 'Key player battles, late-game momentum swings, and the tactical details that can decide the biggest night in club football.',
        time: '2 hours ago',
      },
      {
        img: resolveImage('sofi'),
        tag: 'Technology',
        title: 'How AI Match Tools Help Fans Read the Game Faster',
        desc: 'From player recognition to quick context cards, football tech is becoming a second screen for fans watching from anywhere.',
        time: '5 hours ago',
      },
    ];

    setHTML(container, news.map(n => `
      <div class="news-card motion-fade-in">
        <img class="news-card__img" src="${escapeHTML(n.img)}" alt="${escapeHTML(n.title)}" loading="lazy" />
        <div class="news-card__body">
          <div class="card__tag">${escapeHTML(n.tag)}</div>
          <h3 class="news-card__title">${escapeHTML(n.title)}</h3>
          <p class="news-card__desc">${escapeHTML(n.desc)}</p>
          <div class="card__meta"><span>${escapeHTML(n.time)}</span></div>
        </div>
      </div>
    `).join(''));
    this._bindImageFallbacks(container);
  },

  _renderBlogPosts() {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    const blogs = [
      {
        img: resolveImage('bcPlace'),
        tag: 'Tactical Analysis',
        title: 'How the 3-2-5 is Reshaping World Cup Football',
        desc: 'From Pep Guardiola\'s influence to the new breed of wing-backs, the 3-2-5 formation is taking the 2026 World Cup by storm.',
        time: '1 hour ago',
        author: 'VANTAGE Analyst',
      },
      {
        img: resolveImage('sofi'),
        tag: 'Player Spotlight',
        title: 'Lamine Yamal: The Teenager Carrying Spain\'s Hopes',
        desc: 'At just 18, Yamal has become the most dangerous attacker in the tournament. A deep dive into his numbers and playing style.',
        time: '3 hours ago',
        author: 'Scout Report',
      },
      {
        img: resolveImage('metlife'),
        tag: 'Fan Culture',
        title: 'The Kolkata Fan Story: Watching Football at 2AM',
        desc: 'For millions of fans in South Asia, the World Cup means sleepless nights, crowded tea stalls, and raw emotion at dawn.',
        time: '6 hours ago',
        author: 'VANTAGE Story',
      },
      {
        img: resolveImage('azteca'),
        tag: 'Data Deep Dive',
        title: 'Expected Goals vs Reality: WC 2026 xG Report',
        desc: 'Which teams are overperforming? Who\'s getting unlucky? A statistical breakdown of every group stage match.',
        time: '12 hours ago',
        author: 'Data Lab',
      },
      {
        img: resolveImage('metlife'),
        tag: 'Stadium Guide',
        title: 'Inside MetLife: Where the 2026 Final Will Be Decided',
        desc: 'Capacity, transport, gate access, and what to expect when 82,500 fans pack into New Jersey for the biggest match in football.',
        time: '1 day ago',
        author: 'VANTAGE Venue',
      },
      {
        img: resolveImage('bcPlace'),
        tag: 'History',
        title: 'Every World Cup Final Goal: A Visual Timeline',
        desc: 'From Geoff Hurst in 1966 to Messi in 2022 — every decisive goal in World Cup final history, mapped minute by minute.',
        time: '2 days ago',
        author: 'VANTAGE Archive',
      },
    ];

    setHTML(container, blogs.map(b => `
      <div class="blog-card motion-fade-in">
        <img class="blog-card__img" src="${escapeHTML(b.img)}" alt="${escapeHTML(b.title)}" loading="lazy" />
        <div class="blog-card__body">
          <div class="blog-card__tag">${escapeHTML(b.tag)}</div>
          <h3 class="blog-card__title">${escapeHTML(b.title)}</h3>
          <p class="blog-card__desc">${escapeHTML(b.desc)}</p>
          <div class="blog-card__footer">
            <span class="blog-card__author">${escapeHTML(b.author)}</span>
            <span class="blog-card__time">${escapeHTML(b.time)}</span>
          </div>
        </div>
      </div>
    `).join(''));
    this._bindImageFallbacks(container);
  },

  _bindImageFallbacks(container) {
    container.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.src = resolveImage('metlife');
      }, { once: true });
    });
  },

  async _loadSpotlightFromAPI() {
    const card = document.getElementById('spotlight-card');
    const el = document.getElementById('spotlight-countdown');
    if (!card || !el) return;

    let match = null;
    let isLive = false;

    try {
      const r = await fetch('/api/livematch');
      if (r.ok) {
        const data = await r.json();
        match = data?.featured;
        isLive = match?.status?.isLive || false;
      }
    } catch (error) {
      console.warn('Live match spotlight unavailable; using fallback countdown.', error);
    }

    if (match && !match.status.isFinished) {
      // Real upcoming or live match from ESPN
      const homeFlag = this._countryFlag(match.homeTeam.abbreviation);
      const awayFlag = this._countryFlag(match.awayTeam.abbreviation);

      card.querySelector('.spotlight-header')?.replaceChildren(
        document.createTextNode(`FIFA WORLD CUP 2026 · ${isLive ? 'LIVE NOW' : 'ROUND OF 16'}`)
      );
      const teams = card.querySelectorAll('.spotlight-team');
      if (teams?.[0]) {
        teams[0].querySelector('.spotlight-team__flag').textContent = homeFlag;
        teams[0].querySelector('.spotlight-team__name').textContent = match.homeTeam.name.toUpperCase();
      }
      if (teams?.[1]) {
        teams[1].querySelector('.spotlight-team__flag').textContent = awayFlag;
        teams[1].querySelector('.spotlight-team__name').textContent = match.awayTeam.name.toUpperCase();
      }
      card.querySelector('.spotlight-meta')?.replaceChildren(
        document.createTextNode(`${match.venue} · ${new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`)
      );

      if (isLive) {
        el.textContent = `LIVE: ${match.homeTeam.score} — ${match.awayTeam.score} (${match.status.clock})`;
        // Poll for live updates
        this._startManagedInterval('spotlightCountdown', async () => {
          try {
            const r = await fetch('/api/livematch');
            if (!r.ok) return;
            const d = await r.json();
            const m = d?.featured;
            if (m?.status?.isLive) {
              el.textContent = `LIVE: ${m.homeTeam.score} — ${m.awayTeam.score} (${m.status.clock})`;
            } else if (m?.status?.isFinished) {
              el.textContent = `FT: ${m.homeTeam.score} — ${m.awayTeam.score}`;
              this._clearManagedInterval('spotlightCountdown');
            }
          } catch (error) {
            console.warn('Live spotlight refresh failed.', error);
          }
        }, 15000);
      } else {
        // Countdown to real upcoming match
        const targetMs = new Date(match.date).getTime();
        const update = () => {
          const diff = targetMs - Date.now();
          if (diff <= 0) {
            el.textContent = 'MATCH IS LIVE!';
            el.style.color = 'var(--accent-red)';
            this._clearManagedInterval('spotlightCountdown');
            return false;
          }
          const { text, color } = this._getCountdownTextAndColor(diff);
          el.textContent = text;
          el.style.color = color;
          return true;
        };
        if (update()) this._startManagedInterval('spotlightCountdown', update, SECOND_MS);
      }
    } else {
      // Fallback: use static NEXT_MATCH data
      this._updateSpotlightCountdown();
    }
  },

  _updateSpotlightCountdown() {
    const el = document.getElementById('spotlight-countdown');
    if (!el) return;
    this._clearManagedInterval('spotlightCountdown');

    const spotMatch = NEXT_MATCH;
    const card = document.getElementById('spotlight-card');
    const target = new Date(spotMatch.kickoffTime);
    const targetMs = target.getTime();
    if (Number.isNaN(targetMs)) {
      el.textContent = 'KICKOFF TIME TBC';
      return;
    }

    card?.querySelector('.spotlight-header')?.replaceChildren(
      document.createTextNode(`${spotMatch.league.toUpperCase()} · ${spotMatch.round.toUpperCase()}`)
    );
    const teams = card?.querySelectorAll('.spotlight-team');
    if (teams?.[0]) {
      teams[0].querySelector('.spotlight-team__flag').textContent = spotMatch.homeTeam.flag;
      teams[0].querySelector('.spotlight-team__name').textContent = spotMatch.homeTeam.name.toUpperCase();
    }
    if (teams?.[1]) {
      teams[1].querySelector('.spotlight-team__flag').textContent = spotMatch.awayTeam.flag;
      teams[1].querySelector('.spotlight-team__name').textContent = spotMatch.awayTeam.name.toUpperCase();
    }
    card?.querySelector('.spotlight-meta')?.replaceChildren(
      document.createTextNode(`${spotMatch.venue} · ${spotMatch.displayDate} · ${spotMatch.displayTime}`)
    );

    const update = () => {
      const nowMs = Date.now();
      const diff = targetMs - nowMs;
      if (diff <= 0) {
        const liveWindowMs = 2 * HOUR_MS;
        const isRecentlyLive = nowMs - targetMs <= liveWindowMs;
        el.textContent = isRecentlyLive ? 'MATCH IS LIVE!' : 'MATCH COMPLETE';
        el.style.color = 'var(--accent-red)';
        if (!isRecentlyLive) this._clearManagedInterval('spotlightCountdown');
        return isRecentlyLive;
      }
      const { text, color } = this._getCountdownTextAndColor(diff);
      el.textContent = text;
      el.style.color = color;
      return true;
    };
    if (update()) this._startManagedInterval('spotlightCountdown', update, SECOND_MS);
  }
};
