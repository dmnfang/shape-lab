/* jumble.js: Shape Jumble.
   A jumble of overlapping shapes appears. Students guess which shapes are in it AND how many of each. */
import { initViewport, initFullscreen, hydrateIcons } from '../../assets/js/shared.js';
import { SHAPES, SHAPE_LABELS, shapeSVG } from '../../assets/js/shapes.js';

const MAX_SPREAD = 10;          // spread stepper runs 0..10 (shown as %)
const SPREAD_PER_STEP = 0.01;
const REVEAL_STAGGER_MS = 160;

const settings = {
  allowedSizes: new Set([3, 4, 5, 6]),   // total shapes in a jumble
  sameMax: 2,                            // most copies of one shape
  style: 'solid',                        // 'solid' | 'low'
  color: 'grape',                        // coral | grape | leaf | sky | bubblegum
};
const state = { spread: 0, shapes: [], counts: {}, guess: {}, revealed: false };
let revealTimers = [];

const $ = id => document.getElementById(id);
const settingsScreen = $('settingsScreen');
const playScreen = $('playScreen');
const collage = $('collage');
const guessGrid = $('guessGrid');
const resultEl = $('headerResult');
const submitBtn = $('submit');
const nextBtn = $('next');
const spreadDown = $('spreadDown');
const spreadUp = $('spreadUp');
const spreadValue = $('spreadValue');

const pick = list => list[Math.floor(Math.random() * list.length)];
function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function clearRevealTimers() { revealTimers.forEach(clearTimeout); revealTimers = []; }

/* ---- Puzzle ----------------------------------------------------------- */

/* `total` shapes, no shape more than `max` times. Every shape type has an equal chance each pick. */
function makeCounts(total, max) {
  const counts = Object.fromEntries(SHAPES.map(s => [s, 0]));
  const cap = SHAPES.length * max;
  for (let i = 0; i < Math.min(total, cap); i += 1) counts[pick(SHAPES.filter(s => counts[s] < max))] += 1;
  return counts;
}

function makePuzzle() {
  clearRevealTimers();
  state.counts = makeCounts(pick([...settings.allowedSizes]), settings.sameMax);
  state.shapes = shuffled(SHAPES.flatMap(s => Array(state.counts[s]).fill(s)));
  state.guess = Object.fromEntries(SHAPES.map(s => [s, 0]));
  state.spread = 0;
  state.revealed = false;
  collage.dataset.style = settings.style;
  collage.dataset.color = settings.color;
  updateSpreadUI();

  resultEl.textContent = 'Which shapes?';
  submitBtn.hidden = false;
  nextBtn.hidden = true;
  renderGuess();
  renderCollage();
}

/* Size and radius come from the real canvas so any screen shape works. */
function getGeometry() {
  const w = collage.clientWidth, h = collage.clientHeight;
  const d = Math.max(1, Math.min(w, h));
  const n = Math.max(1, state.shapes.length);
  const margin = Math.max(12, Math.min(28, d * 0.035));
  const half = Math.PI / n;
  const fit = (d - 2 * margin) * Math.sin(half) / (1 + Math.sin(half));
  const size = Math.max(96, Math.min(Math.min(520, d * 0.58), fit * 1.05));
  return { w, h, size, radius: Math.max(0, d / 2 - size / 2 - margin) };
}
const angleFor = (i, total) => -Math.PI / 2 + i * (Math.PI * 2 / total);

function renderCollage() {
  collage.innerHTML = '';
  const n = state.shapes.length;
  const { w, h, size, radius } = getGeometry();
  const shown = state.revealed ? radius : radius * 0.28 + state.spread * SPREAD_PER_STEP * radius;
  state.shapes.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = 'shape';
    el.dataset.shape = name;
    el.style.setProperty('--shape-size', `${Math.round(size * 0.95)}px`);
    el.innerHTML = shapeSVG(name);
    const a = angleFor(i, n);
    el.style.left = `${w / 2 + Math.cos(a) * shown}px`;
    el.style.top = `${h / 2 + Math.sin(a) * shown}px`;
    collage.appendChild(el);
  });
}

/* ---- Guessing: tap a shape to count it; past the max it clears ---------- */

function buildGuessGrid() {
  guessGrid.innerHTML = '';
  SHAPES.forEach(name => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shape-btn';
    button.dataset.shape = name;
    button.innerHTML = `<span class="ico">${shapeSVG(name)}</span><span class="name">${SHAPE_LABELS[name]}</span>`;
    button.addEventListener('click', () => {
      if (state.revealed) return;
      state.guess[name] = state.guess[name] >= settings.sameMax ? 0 : state.guess[name] + 1;
      renderGuess();
    });
    guessGrid.appendChild(button);
  });
}

function renderGuess() {
  guessGrid.querySelectorAll('.shape-btn').forEach(button => {
    const n = state.guess[button.dataset.shape] || 0;
    button.classList.toggle('selected', n > 0);
    button.setAttribute('aria-label', `${SHAPE_LABELS[button.dataset.shape]}: ${n}`);
    let chip = button.querySelector('.count-chip');
    if (n > 0) {
      if (!chip) { chip = document.createElement('span'); chip.className = 'count-chip'; button.append(chip); }
      chip.textContent = n;
    } else if (chip) {
      chip.remove();
    }
  });
}

/* ---- Reveal and next -------------------------------------------------- */

function reveal() {
  if (state.revealed) return;
  state.revealed = true;
  submitBtn.hidden = true;

  const present = SHAPES.filter(s => state.counts[s] > 0);
  const right = present.filter(s => state.guess[s] === state.counts[s]).length;
  const extra = SHAPES.filter(s => state.counts[s] === 0 && state.guess[s] > 0).length;
  const total = state.shapes.length;
  const strong = document.createElement('strong');
  strong.textContent = `There were ${total} shapes`;
  resultEl.replaceChildren(strong, ` · You got ${right}/${present.length} right${extra ? ` · ${extra} not in the jumble` : ''}`);

  const { w, h, radius } = getGeometry();
  [...collage.children].forEach((el, i) => {
    const a = angleFor(i, total);
    revealTimers.push(setTimeout(() => {
      el.style.left = `${w / 2 + Math.cos(a) * radius}px`;
      el.style.top = `${h / 2 + Math.sin(a) * radius}px`;
    }, i * REVEAL_STAGGER_MS));
  });
  nextBtn.hidden = false;
}

/* ---- Screens and settings --------------------------------------------- */

function showSettings() { clearRevealTimers(); playScreen.hidden = true; settingsScreen.hidden = false; syncSettings(); }
function startQuiz() { settingsScreen.hidden = true; playScreen.hidden = false; makePuzzle(); }

function updateSpreadUI() {
  spreadValue.textContent = `${state.spread}%`;
  spreadDown.disabled = state.spread <= 0;
  spreadUp.disabled = state.spread >= MAX_SPREAD;
}
function changeSpread(delta) {
  const next = state.spread + delta;
  if (next < 0 || next > MAX_SPREAD) return;
  state.spread = next; updateSpreadUI(); renderCollage();
}

/* Sizes above (8 shapes x max) can't be built, so they switch off. */
function syncSettings() {
  const cap = SHAPES.length * settings.sameMax;
  document.querySelectorAll('[data-count]').forEach(button => {
    const v = Number(button.dataset.count);
    button.disabled = v > cap;
    if (v > cap) settings.allowedSizes.delete(v);
  });
  if (!settings.allowedSizes.size) settings.allowedSizes.add(2);
  document.querySelectorAll('[data-count]').forEach(b => b.classList.toggle('active', settings.allowedSizes.has(Number(b.dataset.count))));
  document.querySelectorAll('[data-max]').forEach(b => b.classList.toggle('active', Number(b.dataset.max) === settings.sameMax));
  document.querySelectorAll('[data-setting-style]').forEach(b => b.classList.toggle('active', b.dataset.settingStyle === settings.style));
  document.querySelectorAll('[data-setting-color]').forEach(b => {
    const on = b.dataset.settingColor === settings.color;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
}

/* ---- Wiring ----------------------------------------------------------- */

document.querySelectorAll('[data-count]').forEach(button => {
  const n = Number(button.dataset.count);
  button.addEventListener('click', () => {
    if (button.disabled) return;
    if (settings.allowedSizes.has(n)) { if (settings.allowedSizes.size > 1) settings.allowedSizes.delete(n); }
    else settings.allowedSizes.add(n);
    syncSettings();
  });
});
document.querySelectorAll('[data-max]').forEach(button => {
  button.addEventListener('click', () => { settings.sameMax = Number(button.dataset.max); syncSettings(); });
});
document.querySelectorAll('[data-setting-style]').forEach(button => {
  button.addEventListener('click', () => { settings.style = button.dataset.settingStyle; syncSettings(); });
});
document.querySelectorAll('[data-setting-color]').forEach(button => {
  button.addEventListener('click', () => { settings.color = button.dataset.settingColor; syncSettings(); });
});
spreadDown.addEventListener('click', () => changeSpread(-1));
spreadUp.addEventListener('click', () => changeSpread(1));
$('settingsButton').addEventListener('click', showSettings);
$('startQuiz').addEventListener('click', startQuiz);
submitBtn.addEventListener('click', reveal);
nextBtn.addEventListener('click', makePuzzle);

new ResizeObserver(() => { if (!playScreen.hidden && state.shapes.length) renderCollage(); }).observe(collage);

initViewport();
initFullscreen($('settingsFullscreen'));
initFullscreen($('playFullscreen'));
hydrateIcons();
buildGuessGrid();
syncSettings();
updateSpreadUI();
