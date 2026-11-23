/* sfx.js: shared UI sounds for every Hiroba tool (the same files and tuning as Cardbox).
   One mute setting is shared by all tools on the same site (saved in localStorage). */

const BASE = new URL('./sounds/', import.meta.url);
const FILES = {
  tap: 'Tap.mp3', toggle: 'Toggle.mp3', launch: 'Launch.mp3', close: 'Close.mp3', modalOpen: 'Modal_open.mp3',
  nextCard: 'Next_card.mp3', correct: 'Correct.mp3', wrong: 'Wrong.mp3', celebration: 'Celebration.mp3',
  allDone: 'All_done.mp3', tilePop: 'Reveal_-_Tile_Pop.mp3', revealAll: 'Reveal_-_Reveal-all.mp3',
};
/* Per-sound level (multiplied with the master volume). Same numbers as Cardbox. */
const GAIN = { tap: 0.55, toggle: 0.5, launch: 0.7, close: 0.6, modalOpen: 0.55, nextCard: 0.65, correct: 0.7, wrong: 0.7, celebration: 0.4, allDone: 0.45, tilePop: 0.8, revealAll: 0.6 };
const KEY = 'hiroba:sfx:v1';
const DEFAULTS = { on: true, vol: 0.5 };

function readState() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
let state = readState();
let ctx = null;
let master = null;
let loading = null;
const buffers = new Map();
const listeners = new Set();
export const stats = { played: 0 };      // used by the tests

function ensureContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = state.vol;
    master.connect(ctx.destination);
  }
  return ctx;
}

/* Load and decode every sound once. Safe to call repeatedly. */
export function preload() {
  if (loading) return loading;
  const c = ensureContext();
  if (!c) return Promise.resolve();
  loading = Promise.all(Object.entries(FILES).map(async ([name, file]) => {
    try {
      const res = await fetch(new URL(file, BASE));
      buffers.set(name, await c.decodeAudioData(await res.arrayBuffer()));
    } catch { /* a missing file just means that one sound stays silent */ }
  }));
  return loading;
}

/* Browsers only allow sound after a tap, so the first tap wakes the audio up. */
export function unlock() {
  const c = ensureContext();
  if (c && c.state !== 'running') c.resume().catch(() => {});
  preload();
}

export function play(name, { rate = 1, volume = 1 } = {}) {
  if (!state.on) return;
  const buffer = buffers.get(name);
  if (!ctx || !buffer || ctx.state !== 'running') return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = (GAIN[name] ?? 1) * volume;
  source.connect(gain);
  gain.connect(master);
  source.start();
  stats.played += 1;
}

export const isOn = () => state.on;
export function setOn(on) {
  state = { ...state, on: Boolean(on) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach(fn => fn(state.on));
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const loadedCount = () => buffers.size;

/* Sounds for ordinary buttons, picked by what the element is. Add data-sfx="none" (or a
   sound name) to any element to override. First matching rule wins. */
const RULES = [
  ['.launch-btn', () => ['launch', {}]],
  ['.toggle-pill, .toggle-pill-circle, .swatch, .pool-chip, .stepper-btn, .color-dot', () => ['toggle', { rate: 1.1 }]],
  ['.shape-btn, .shape-pick, .guess-letter, .letter-btn, .slot, .wood-block', () => ['tap', { rate: 1.05 }]],
  ['.icon-btn, .header-btn, .btn, .preview-action', () => ['tap', { rate: 0.85 }]],
];

export function wireButtons() {
  const wake = () => unlock();
  ['pointerdown', 'touchend', 'keydown'].forEach(type => window.addEventListener(type, wake, { once: true, capture: true }));
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const tagged = target.closest('[data-sfx]');
    if (tagged) { if (tagged.dataset.sfx !== 'none') play(tagged.dataset.sfx); return; }
    for (const [selector, pick] of RULES) {
      const el = target.closest(selector);
      if (el) {
        if (el.disabled || el.closest('button')?.disabled) return;
        const [name, options] = pick(el);
        play(name, options);
        return;
      }
    }
  }, true);
}
