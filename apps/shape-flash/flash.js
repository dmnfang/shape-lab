/* flash.js: Shape Flash, a memory game.
   Coloured shapes flash one at a time. Students rebuild the string in order from the toolbox. */
import { initViewport, initFullscreen, hydrateIcons } from '../../assets/js/shared.js';
import { icon } from '../../assets/js/icons.js';
import { SHAPES, SHAPE_LABELS, shapeSVG } from '../../assets/js/shapes.js';

const COLORS = [
  { id: 'red',    label: 'Red',    css: 'var(--coral-500)' },
  { id: 'blue',   label: 'Blue',   css: 'var(--sky-500)' },
  { id: 'green',  label: 'Green',  css: 'var(--leaf-500)' },
  { id: 'yellow', label: 'Yellow', css: 'var(--sun-500)' },
  { id: 'purple', label: 'Purple', css: 'var(--grape-500)' },
  { id: 'orange', label: 'Orange', css: 'var(--orange-500)' },
];
const SPEEDS = { slow: { on: 1400, gap: 350 }, normal: { on: 1000, gap: 300 }, fast: { on: 650, gap: 250 }, veryfast: { on: 400, gap: 200 } };
const LEAD_IN_MS = 450;

const settings = { speed: 'normal', length: 4, colors: 3, pool: new Set(SHAPES) };
const S = { sequence: [], guesses: [], color: 'red', playing: false, played: false, revealed: false, token: 0, index: -1 };

const $ = id => document.getElementById(id);
const settingsScreen = $('settingsScreen'), playScreen = $('playScreen');
const stageContent = $('stageContent'), slotsEl = $('slots');
const playBtn = $('playBtn'), revealBtn = $('revealBtn'), nextBtn = $('nextBtn'), submitBtn = $('submitBtn');
const startBtn = $('startFlash');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];
const colorOf = id => COLORS.find(c => c.id === id);
const activeColors = () => COLORS.slice(0, settings.colors);

/* ---- The string ------------------------------------------------------- */

function makeSequence() {
  const pool = [...settings.pool];
  const colors = activeColors().map(c => c.id);
  const seq = [];
  for (let i = 0; i < settings.length; i += 1) {
    let item;
    let tries = 0;
    do {
      item = { shape: pick(pool), color: pick(colors) };
      tries += 1;
    } while (tries < 12 && seq.length && seq[seq.length - 1].shape === item.shape && seq[seq.length - 1].color === item.color);
    seq.push(item);          // the same shape+color is never flashed twice in a row (when there is a choice)
  }
  return seq;
}

const shapeMarkup = item => `<span style="color:${colorOf(item.color).css}">${shapeSVG(item.shape)}</span>`;

/* ---- Stage ------------------------------------------------------------ */

function clearStage() { stageContent.innerHTML = ''; }
function showFlash(item) {
  stageContent.innerHTML = `<div class="flash-shape" data-shape="${item.shape}" data-color="${item.color}" style="color:${colorOf(item.color).css}">${shapeSVG(item.shape)}</div>`;
}
function showAnswer() {
  stageContent.innerHTML = `<div class="answer-row" style="--n:${S.sequence.length}">` +
    S.sequence.map(it => `<div class="answer-cell" data-shape="${it.shape}" data-color="${it.color}">${shapeMarkup(it)}</div>`).join('') + '</div>';
}

/* ---- Round state ------------------------------------------------------ */

const canBuild = () => S.played && !S.playing && !S.revealed;
const isFull = () => S.guesses.length >= S.sequence.length;

function setButtons({ play, reveal, next }) { playBtn.disabled = !play; revealBtn.disabled = !reveal; nextBtn.disabled = !next; }
function setPlayLabel(replay) { playBtn.innerHTML = `${icon(replay ? 'arrow-counter-clockwise' : 'play')}${replay ? 'Replay' : 'Play'}`; }

function renderPips() {
  const wrap = $('sequence');
  wrap.innerHTML = '';
  S.sequence.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = `seq-dot${i === S.index ? ' active' : i < S.index ? ' done' : ''}`;
    wrap.append(dot);
  });
}

function renderSlots() {
  const n = S.sequence.length;
  slotsEl.style.setProperty('--n', n);
  slotsEl.innerHTML = '';
  for (let i = 0; i < n; i += 1) {
    const g = S.guesses[i];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `slot${g ? ' filled' : ''}`;
    slot.dataset.index = i;
    slot.disabled = !g || !canBuild();
    slot.setAttribute('aria-label', g ? `${colorOf(g.color).label} ${SHAPE_LABELS[g.shape]}, tap to remove` : `Empty slot ${i + 1}`);
    if (g) slot.innerHTML = shapeMarkup(g);
    slot.addEventListener('click', () => { if (canBuild()) { S.guesses.splice(i, 1); renderAll(); } });
    slotsEl.append(slot);
  }
}

function renderToolbox() {
  const row = $('colorRow');
  row.innerHTML = '';
  activeColors().forEach(c => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `color-dot${c.id === S.color ? ' active' : ''}`;
    dot.style.setProperty('--c', c.css);
    dot.setAttribute('aria-label', c.label);
    dot.setAttribute('aria-pressed', String(c.id === S.color));
    dot.disabled = S.revealed;
    dot.addEventListener('click', () => { S.color = c.id; renderToolbox(); });
    row.append(dot);
  });
  const grid = $('shapeGrid');
  grid.style.color = colorOf(S.color).css;
  grid.querySelectorAll('.shape-pick').forEach(b => { b.disabled = !canBuild() || isFull(); });
  submitBtn.disabled = !(canBuild() && isFull() && S.sequence.length > 0);
}

function buildShapeGrid() {
  const grid = $('shapeGrid');
  grid.innerHTML = '';
  SHAPES.forEach(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shape-pick';
    b.dataset.shape = name;
    b.setAttribute('aria-label', SHAPE_LABELS[name]);
    b.innerHTML = shapeSVG(name);
    b.addEventListener('click', () => {
      if (!canBuild() || isFull()) return;
      S.guesses.push({ shape: name, color: S.color });
      renderAll();
    });
    grid.append(b);
  });
}

function renderAll() { renderPips(); renderSlots(); renderToolbox(); }

function setupRound() {
  S.token += 1;
  S.playing = false; S.played = false; S.revealed = false;
  S.guesses = []; S.index = -1;
  if (!activeColors().some(c => c.id === S.color)) S.color = COLORS[0].id;
  clearStage();
  setPlayLabel(false);
  setButtons({ play: true, reveal: false, next: false });
  renderAll();
}

async function play() {
  if (S.playing || !S.sequence.length) return;
  S.playing = true; S.played = false; S.revealed = false; S.guesses = [];
  S.token += 1;
  const token = S.token;
  const { on, gap } = SPEEDS[settings.speed];
  S.index = -1;
  clearStage();
  setButtons({ play: false, reveal: false, next: false });
  renderAll();
  await sleep(LEAD_IN_MS);
  for (let i = 0; i < S.sequence.length; i += 1) {
    if (token !== S.token) return;
    S.index = i;
    renderPips();
    showFlash(S.sequence[i]);
    await sleep(on);
    if (token !== S.token) return;
    clearStage();
    if (i < S.sequence.length - 1) await sleep(gap);
  }
  if (token !== S.token) return;
  S.playing = false; S.played = true;
  S.index = S.sequence.length;                    // every pip done
  setPlayLabel(true);
  setButtons({ play: true, reveal: true, next: true });
  renderAll();
}

/* Submit and Reveal both end the round: the correct string appears on the stage, lined up with the slots. */
function finishRound() {
  S.revealed = true;
  showAnswer();
  setButtons({ play: true, reveal: false, next: true });
  renderAll();
}
function submit() { if (canBuild() && isFull()) finishRound(); }
function reveal() { if (canBuild()) finishRound(); }
function next() { if (S.playing) return; S.sequence = makeSequence(); setupRound(); }

function startFlash() {
  if (!settings.pool.size) return;
  S.sequence = makeSequence();
  settingsScreen.hidden = true;
  playScreen.hidden = false;
  setupRound();
}
function showSettings() {
  S.token += 1; S.playing = false;
  playScreen.hidden = true; settingsScreen.hidden = false;
  clearStage();
}

/* ---- Settings --------------------------------------------------------- */

function setActive(id, value) { document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('active', b.dataset.v === String(value))); }
function bindGroup(id, onPick) { document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener('click', () => onPick(b.dataset.v))); }

function renderPool() {
  const pool = $('pool');
  pool.innerHTML = '';
  SHAPES.forEach(name => {
    const on = settings.pool.has(name);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pool-chip${on ? ' active' : ''}`;
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = `${shapeSVG(name)}<span class="name">${SHAPE_LABELS[name]}</span>`;
    b.addEventListener('click', () => {
      if (settings.pool.has(name)) { if (settings.pool.size > 1) settings.pool.delete(name); }
      else settings.pool.add(name);
      renderPool(); syncSettings();
    });
    pool.append(b);
  });
}
function syncSettings() { startBtn.disabled = settings.pool.size === 0; }

bindGroup('speed', v => { settings.speed = v; setActive('speed', v); });
bindGroup('length', v => { settings.length = Number(v); setActive('length', v); });
bindGroup('colors', v => { settings.colors = Number(v); setActive('colors', v); });
$('selectAll').addEventListener('click', () => { settings.pool = new Set(SHAPES); renderPool(); syncSettings(); });
$('clearAll').addEventListener('click', () => { settings.pool.clear(); renderPool(); syncSettings(); });
startBtn.addEventListener('click', startFlash);
playBtn.addEventListener('click', play);
revealBtn.addEventListener('click', reveal);
nextBtn.addEventListener('click', next);
submitBtn.addEventListener('click', submit);
$('settingsBtn').addEventListener('click', showSettings);

initViewport();
initFullscreen($('settingsFullscreen'));
initFullscreen($('playFullscreen'));
hydrateIcons();
setPlayLabel(false);
buildShapeGrid();
renderPool();
syncSettings();
