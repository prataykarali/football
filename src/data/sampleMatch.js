import { VIDEO_BASE } from '../utils/media.js';

export const MATCH_INFO = {
  id: 'arg-fra-wc2022-final',
  homeTeam: { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
  awayTeam: { name: 'France', code: 'FRA', flag: '🇫🇷' },
  venue: 'Lusail Stadium',
  competition: 'FIFA World Cup 2022 Final',
  date: '2022-12-18',
  kickoffTime: '2022-12-18T18:00:00+03:00',
  durationMinutes: 120,
  status: 'completed',
  finalScore: { home: 3, away: 3 },
};

// FEATURED_MATCH: the featured live match on the Live page.
//
// Kickoff is NOT hardcoded — it is computed at runtime as "now +
// kickoffOffsetMinutes" (and persisted per browser session), so the countdown
// is always a real, live countdown no matter when the app is opened. The live
// YouTube stream plays as a preview during the countdown, then flips to LIVE
// (starting the event feed) once the countdown reaches zero.
//
// To pin a real fixture instead: set `kickoffTime` to an absolute ISO 8601
// timestamp (this overrides the offset), and `liveStreamId` to the
// broadcaster's live YouTube video ID. Set `forceLiveDemo: true` to skip the
// countdown and go live immediately.
export const FEATURED_MATCH = {
  id: 'arg-egy-2026-live-demo',
  league: 'FIFA World Cup',
  round: 'Round of 16',
  homeTeam: { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
  awayTeam: { name: 'Egypt', code: 'EGY', flag: '🇪🇬' },
  venue: 'Mercedes-Benz Stadium, Atlanta',
  // Default feed is a release-hosted demo clip so the "live" player always plays.
  // A real broadcast embed (e.g. FIFA on YouTube) is
  // routinely geo/embed-blocked ("Video unavailable") and, being a cross-origin
  // iframe, can't be scanned. Users can still paste a working stream via the
  // "Embed YouTube Link" control, which sets liveStreamId at runtime.
  liveStreamId: null,
  streamSrc: `${VIDEO_BASE}/football-goal-1.mp4`,
  kickoffTime: null,          // absolute override; null → use offset below
  kickoffOffsetMinutes: 3,    // real-time countdown length from first visit
  displayDate: 'TODAY',
  displayTime: 'KICKOFF SOON',
  forceLiveDemo: false,
};

// NEXT_MATCH: for the home spotlight card — upcoming El Clasico
export const NEXT_MATCH = {
  id: 'bar-rma-2026-07-12',
  league: 'La Liga',
  round: 'Matchday 32',
  homeTeam: { name: 'Barcelona', code: 'BAR', flag: '🇪🇸' },
  awayTeam: { name: 'Real Madrid', code: 'RMA', flag: '🇪🇸' },
  venue: 'Camp Nou, Barcelona',
  kickoffTime: '2026-07-12T20:00:00+02:00',
  displayDate: '12 JUL 2026',
  displayTime: '08:00 PM CEST',
};

export const SAMPLE_MATCH_EVENTS = [
  { id: 1, minute: 1, type: 'kickoff', team: 'ARG', details: 'Argentina kick off the World Cup Final in Lusail!' },
  { id: 2, minute: 3, type: 'possession', team: 'ARG', details: 'De Paul presses high in midfield, winning possession early.' },
  { id: 3, minute: 5, type: 'foul', team: 'FRA', player: 'Rabiot', details: 'Rabiot clips Mac Allister near the halfway line.' },
  { id: 4, minute: 8, type: 'shot', team: 'ARG', player: 'De Paul', details: 'De Paul takes a low long-range shot, deflected out for a corner.' },
  { id: 5, minute: 12, type: 'corner', team: 'ARG', details: 'Messi delivers the corner, cleared away by Varane.' },
  { id: 6, minute: 17, type: 'shot', team: 'ARG', player: 'Di María', details: 'Di María fires over the bar from inside the box after a slick team move.' },
  { id: 7, minute: 21, type: 'penalty_awarded', team: 'ARG', player: 'Di María', details: 'PENALTY! Dembélé clips Di María inside the box!', isKeyMoment: true },
  { id: 8, minute: 23, type: 'goal', team: 'ARG', player: 'Lionel Messi', details: 'GOAL! Messi sends Lloris the wrong way from the spot! ARG 1 - 0 FRA', isKeyMoment: true },
  { id: 9, minute: 28, type: 'foul', team: 'ARG', player: 'Romero', details: 'Romero collides with Lloris during an aerial duel.' },
  { id: 10, minute: 32, type: 'possession', team: 'ARG', details: 'Argentina in total control with 62% possession.' },
  { id: 11, minute: 36, type: 'goal', team: 'ARG', player: 'Ángel Di María', details: 'GOAL! Unbelievable counter-attack! Mac Allister to Di María! ARG 2 - 0 FRA', isKeyMoment: true },
  { id: 12, minute: 41, type: 'substitution', team: 'FRA', player: 'Kolo Muani', details: 'Double sub for France: Kolo Muani & Thuram on for Giroud & Dembélé.' },
  { id: 13, minute: 45, type: 'half_time', team: 'ARG', details: 'Half-time in Lusail! Argentina dominate France 2-0.' },
  { id: 14, minute: 46, type: 'second_half', team: 'ARG', details: 'Second half begins! France need a miracle.' },
  { id: 15, minute: 52, type: 'foul', team: 'FRA', player: 'Thuram', details: 'Thuram booked for a late challenge on Romero.' },
  { id: 16, minute: 59, type: 'shot', team: 'ARG', player: 'Ángel Di María', details: 'Di María nutmegs Koundé, finds Alvarez whose low shot is saved.' },
  { id: 17, minute: 64, type: 'substitution', team: 'ARG', player: 'Acuña', details: 'Di María receives a standing ovation as Acuña replaces him.' },
  { id: 18, minute: 71, type: 'shot', team: 'FRA', player: 'Kylian Mbappé', details: 'Mbappé cuts inside and strikes over the bar — France\'s first real attempt.' },
  { id: 19, minute: 79, type: 'penalty_awarded', team: 'EGY', player: 'Mohamed Salah', details: 'PENALTY FOR EGYPT! Salah is clipped while driving inside the box!', isKeyMoment: true },
  { id: 20, minute: 80, type: 'goal', team: 'EGY', player: 'Mohamed Salah', details: 'GOAL! Salah drills it into the bottom corner! ARG 2 - 1 EGY', isKeyMoment: true },
  { id: 21, minute: 81, type: 'goal', team: 'EGY', player: 'Mohamed Salah', details: 'GOAL UNBELIEVABLE! Salah volleys Egypt level 90 seconds later! ARG 2 - 2 EGY', isKeyMoment: true },
  { id: 22, minute: 85, type: 'yellow_card', team: 'EGY', player: 'Trezeguet', details: 'Trezeguet booked for simulation in the box!' },
  { id: 23, minute: 90, type: 'shot', team: 'ARG', player: 'Lionel Messi', details: 'Messi hammers a rocket from 25 yards — tipped over by Lloris!' },
  { id: 24, minute: 95, type: 'extra_time', team: 'ARG', details: 'Full-time 2-2! We are heading into EXTRA TIME!' },
  { id: 25, minute: 105, type: 'shot', team: 'ARG', player: 'Lautaro Martínez', details: 'Upamecano makes a hero block to deny Lautaro Martínez!' },
  { id: 26, minute: 108, type: 'goal', team: 'ARG', player: 'Lionel Messi', details: 'GOAL! MESSI REACTS TO THE REBOUND! IS THAT THE WINNER? ARG 3 - 2 FRA', isKeyMoment: true },
  { id: 27, minute: 116, type: 'penalty_awarded', team: 'EGY', player: 'Mohamed Salah', details: 'PENALTY! Montiel handles Salah shot in the box!', isKeyMoment: true },
  { id: 28, minute: 118, type: 'goal', team: 'EGY', player: 'Mohamed Salah', details: 'GOAL! HAT-TRICK FOR SALAH! UNREAL SCENARIO! ARG 3 - 3 EGY', isKeyMoment: true },
  { id: 29, minute: 120, type: 'shot', team: 'EGY', player: 'Mostafa Mohamed', details: 'DIBU MARTÍNEZ MAKES A HUGE STOP IN STOPPAGE TIME!', isKeyMoment: true },
  { id: 30, minute: 122, type: 'penalty_shootout', team: 'ARG', details: 'PENALTY SHOOTOUT! Argentina win 4-2 on penalties! ARGENTINA ARE WORLD CHAMPIONS!', isKeyMoment: true }
];
