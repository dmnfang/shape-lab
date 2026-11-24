/* talk.js: Shape Attack (time attack) and Shape Rally.
   The class practises "What do you want? / A red rectangle, please." with a colored shape on screen.
   ?mode=attack  a chain of pairs races through a conversation per pair, against the clock.
   ?mode=rally   pairs keep swapping roles and finish as many orders as they can before time runs out. */
import { initViewport, initFullscreen, hydrateIcons } from '../../assets/js/shared.js';
import { initCore } from '../../assets/core/core.js';
import { SHAPES, SHAPE_LABELS, shapeSVG } from '../../assets/js/shapes.js';

const params = new URLSearchParams(location.search);
const isRally = params.get('mode') === 'rally';
const TITLE = isRally ? 'Shape Rally' : 'Shape Attack';
document.body.dataset.game = isRally ? 'shape-rally' : 'shape-attack';
document.title = TITLE;
const TEST_SECONDS = Number(params.get('sec')) || 0;      // lets a test run a short Rally

const COLORS = [
  { id: 'red', css: 'var(--coral-500)' }, { id: 'yellow', css: 'var(--sun-500)' }, { id: 'pink', css: 'var(--bubblegum-500)' },
  { id: 'green', css: 'var(--leaf-500)' }, { id: 'purple', css: 'var(--grape-500)' }, { id: 'blue', css: 'var(--sky-500)' },
  { id: 'black', css: 'var(--sand-900)' }, { id: 'white', css: '#FFFFFF', stroke: 'var(--sand-500)' },
];
/* Where each copy sits when 2 to 9 shapes are shown: [x, y] centres on a unit square, and a size. */
const G = [1 / 6, 1 / 2, 5 / 6];
const rowsOf = (...rows) => rows.flatMap((n, r) => Array.from({ length: n }, (_, c) => [n === 3 ? G[c] : n === 2 ? (c ? 0.7 : 0.3) : 0.5, rows.length === 3 ? G[r] : 0.5]));
const LAYOUTS = {
  2: { size: 0.4, pts: [[0.28, 0.5], [0.72, 0.5]] }, 3: { size: 0.36, pts: [[0.5, 0.27], [0.27, 0.72], [0.73, 0.72]] },
  4: { size: 0.36, pts: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]] },
  5: { size: 0.3, pts: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]] },
  6: { size: 0.3, pts: [[0.28, G[0]], [0.72, G[0]], [0.28, G[1]], [0.72, G[1]], [0.28, G[2]], [0.72, G[2]]] },
  7: { size: 0.28, pts: rowsOf(2, 3, 2) }, 8: { size: 0.28, pts: rowsOf(3, 2, 3) }, 9: { size: 0.28, pts: rowsOf(3, 3, 3) },
};

const OPT = { teams: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], players: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], pairs: Array.from({ length: 15 }, (_, i) => i + 1), groups: [2, 3, 4, 5, 6, 7, 8],
  duration: [[30, '30 sec'], [60, '1 min'], [120, '2 min'], [180, '3 min']], limit: ['open', 1, 2, 3, 4, 5], format: [['class', 'Whole class'], ['pairs', 'Pairs'], ['groups', 'Groups']] };
const cfg = { hard: false, teams: 4, players: 5, limit: 'open', format: 'class', pairs: 5, groups: 2, duration: 120 };

const $ = id => document.getElementById(id);
const pick = list => list[Math.floor(Math.random() * list.length)];
const SCREENS = ['settings', 'play', 'finish', 'scores'];
const show = name => SCREENS.forEach(s => { $(`${s}Screen`).hidden = s !== name; });
const colorOf = id => COLORS.find(c => c.id === id);

const units = () => (!isRally ? cfg.teams : cfg.format === 'class' ? 1 : cfg.format === 'pairs' ? cfg.pairs : cfg.groups);
const solo = () => units() === 1;
const unitLabel = () => (!isRally ? 'Team' : cfg.format === 'pairs' ? 'Pair' : cfg.format === 'groups' ? 'Group' : 'Class');
const limit = () => (solo() ? cfg.limit : 'open');
const duration = () => TEST_SECONDS || cfg.duration;

/* ---- Rounds and conversation ------------------------------------------ */
function makeRound(prev) {
  let r;
  do { r = { shape: pick(SHAPES), color: pick(COLORS).id, qty: cfg.hard ? 2 + Math.floor(Math.random() * 8) : 1 }; }
  while (prev && prev.shape === r.shape && prev.color === r.color);
  return r;
}
function buildRounds(n) { const out = []; for (let i = 0; i < n; i += 1) out.push(makeRound(out[i - 1])); return out; }

function lines(r) {
  const what = `<b class="picked">${r.color} ${SHAPE_LABELS[r.shape].toLowerCase()}</b>`;
  const easy = [['asker', 'What do you want?'], ['replier', `A ${what}, please.`]];
  return cfg.hard ? [...easy, ['asker', 'How many?'], ['replier', `<b class="picked">${r.qty}</b>, please.`], ['asker', 'Here you are.'], ['replier', 'Thank you.']] : easy;
}
const shapeHTML = (r, size) => { const c = colorOf(r.color); return shapeSVG(r.shape, { fill: c.css, stroke: c.stroke || c.css }); };
function visual(r) {
  if (!cfg.hard) return `<div class="one">${shapeHTML(r)}</div>`;
  const L = LAYOUTS[r.qty];
  return `<div class="arrange">${L.pts.map(([x, y]) => `<div class="tile" style="left:${(x - L.size / 2) * 100}%;top:${(y - L.size / 2) * 100}%;width:${L.size * 100}%;height:${L.size * 100}%">${shapeHTML(r)}</div>`).join('')}</div>`;
}
const scriptHTML = (r, askLabel, replyLabel) => lines(r).map(([role, text]) => `<div class="line"><div class="avatar ${role}">${role === 'asker' ? askLabel : replyLabel}</div><p class="say">${text}</p></div>`).join('');

/* ---- Settings --------------------------------------------------------- */
function group(label, key, list, circle = false) {
  const cls = circle ? 'toggle-pill-circle' : 'toggle-pill';
  const buttons = list.map(o => { const [v, text] = Array.isArray(o) ? o : [o, o === 'open' ? 'Unlimited' : o]; return `<button type="button" class="${cls}${cfg[key] === v ? ' active' : ''}" data-k="${key}" data-v="${v}">${text}</button>`; }).join('');
  return `<div class="control-section"><div class="settings-label">${label}</div><div class="toggle-group">${buttons}</div></div>`;
}
function renderSettings() {
  let html = group('Speaking Difficulty', 'hard', [[false, 'Easy'], [true, 'Hard']]);
  if (!isRally) {
    html += group('Teams', 'teams', OPT.teams, true);
    if (cfg.teams === 1) html += group('Rounds', 'limit', OPT.limit);
    html += group('Players per Team', 'players', OPT.players, true);
  } else {
    html += group('Who plays', 'format', OPT.format);
    if (cfg.format === 'pairs') html += group('Number of Pairs', 'pairs', OPT.pairs, true);
    if (cfg.format === 'groups') html += group('Number of Groups', 'groups', OPT.groups, true);
    html += group('Time on the Clock', 'duration', OPT.duration);
    if (solo()) html += group('Rounds', 'limit', OPT.limit);
  }
  $('settingsBody').innerHTML = html;
}
$('settingsBody').addEventListener('click', e => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  const raw = b.dataset.v;
  cfg[b.dataset.k] = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
  renderSettings();
});

/* ---- Play ------------------------------------------------------------- */
const P = { unit: 0, round: 1, pair: 0, rounds: [], cur: null, score: 0, running: false, t0: 0, elapsed: 0, remaining: 0, timer: null };
let results = [];
const fmt = ms => { const t = Math.floor(ms / 100); return `${Math.floor(t / 600)}:${String(Math.floor(t / 10) % 60).padStart(2, '0')}.${t % 10}`; };
const fmtCount = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function startUnit(i, round = 1) {
  clearInterval(P.timer);
  Object.assign(P, { unit: i, round, pair: 0, elapsed: 0, running: false, score: 0 });
  if (isRally) { P.cur = makeRound(null); P.remaining = duration() * 1000; } else P.rounds = buildRounds(cfg.players);
  show('play');
  renderPlay();
}
function pips(total, current, allDone) {
  $('pips').innerHTML = Array.from({ length: total }, (_, i) => `<span class="seq-dot${allDone || i < current ? ' done' : i === current ? ' active' : ''}"></span>`).join('');
}
function renderPlay() {
  const r = isRally ? P.cur : P.rounds[P.pair];
  const lastAttack = !isRally && P.pair === cfg.players - 1;
  const flip = isRally && P.score % 2 === 1;
  const askLabel = isRally ? (flip ? 'B' : 'A') : P.pair + 1;
  const replyLabel = isRally ? (flip ? 'A' : 'B') : lastAttack ? 1 : P.pair + 2;
  $('playTitle').textContent = solo() ? `Round ${P.round}` : `${unitLabel()} ${P.unit + 1}`;
  if (!isRally) pips(cfg.players, P.pair); else if (!solo()) pips(units(), P.unit); else $('pips').innerHTML = '';
  $('script').innerHTML = scriptHTML(r, askLabel, replyLabel);
  $('pic').innerHTML = visual(r);
  $('clock').textContent = isRally ? fmtCount(P.remaining) : fmt(P.elapsed);
  $('scoreBox').hidden = !isRally;
  $('scoreBox').textContent = P.score;
  $('nextBtn').textContent = lastAttack ? 'Finish' : 'Next';
  $('nextBtn').disabled = !P.running;
  $('timerBtn').hidden = P.running;
}
function startTimer() {
  P.t0 = performance.now(); P.running = true;
  const end = P.t0 + duration() * 1000;
  P.timer = setInterval(() => {
    const now = performance.now();
    if (!isRally) { P.elapsed = now - P.t0; $('clock').textContent = fmt(P.elapsed); return; }
    const left = end - now;
    if (left <= 0) { clearInterval(P.timer); P.remaining = 0; endRally(); return; }
    P.remaining = left; $('clock').textContent = fmtCount(left);
  }, 50);
  renderPlay();
}
function next() {
  if (!P.running) return;
  if (isRally) { P.score += 1; P.cur = makeRound(P.cur); renderPlay(); }
  else if (P.pair === cfg.players - 1) finishAttack();
  else { P.pair += 1; renderPlay(); }
}
function finishAttack() {
  clearInterval(P.timer); P.running = false;
  P.elapsed = performance.now() - P.t0;
  results.push({ unit: P.unit, round: P.round, value: P.elapsed, rounds: P.rounds });
  showFinish();
}
function endRally() { P.running = false; results.push({ unit: P.unit, round: P.round, value: P.score }); showFinish(); }

/* ---- Finish and scores ------------------------------------------------ */
function fitSize(n, w, h) {
  let best = 24;
  for (let cols = 1; cols <= n; cols += 1) best = Math.max(best, Math.min(w / cols, h / Math.ceil(n / cols)));
  return Math.floor(best - 8);
}
function renderCollage() {
  const last = results[results.length - 1];
  const box = $('collage');
  if (!last?.rounds) { box.innerHTML = ''; return; }
  const items = last.rounds.flatMap(r => Array(r.qty).fill(r));
  const size = fitSize(items.length, box.clientWidth, box.clientHeight);
  box.innerHTML = items.map(r => `<span style="width:${size}px;height:${size}px">${shapeHTML(r)}</span>`).join('');
  box.querySelectorAll('svg').forEach(s => { s.style.width = '100%'; s.style.height = '100%'; });
}
function showFinish() {
  const last = results[results.length - 1];
  const isLast = P.unit + 1 >= units();
  const atLimit = limit() !== 'open' && P.round >= limit();
  $('finTitle').textContent = solo() ? `Round ${P.round}` : `${unitLabel()} ${P.unit + 1}`;
  $('wow').textContent = isRally ? "Time's up!" : 'Great job!';
  $('finalTime').textContent = isRally ? last.value : fmt(last.value);
  $('unitLabel').textContent = isRally ? (last.value === 1 ? 'point' : 'points') : 'time';
  const primary = $('finNext');
  let extra = $('finScores');
  if (!extra) { extra = document.createElement('button'); extra.id = 'finScores'; extra.type = 'button'; extra.className = 'btn'; extra.textContent = 'Final scores'; primary.after(extra); }
  const toScores = solo() ? atLimit : isLast;
  primary.textContent = toScores ? 'Final scores' : solo() ? 'Next round' : `Next ${unitLabel()}`;
  primary.onclick = () => (toScores ? showScores() : solo() ? startUnit(0, P.round + 1) : startUnit(P.unit + 1));
  extra.hidden = toScores;
  extra.onclick = showScores;
  show('finish');
  renderCollage();
}
function showScores() {
  const rows = results.map(r => ({ label: solo() ? `Round ${r.round}` : `${unitLabel()} ${r.unit + 1}`, value: r.value }));
  rows.sort((a, b) => (isRally ? b.value - a.value : a.value - b.value));
  $('ranking').innerHTML = rows.map((r, i) => `<li><span class="rk">${i + 1}</span><span>${r.label}</span><span class="val">${isRally ? `${r.value} ${r.value === 1 ? 'point' : 'points'}` : fmt(r.value)}</span></li>`).join('');
  show('scores');
}

/* ---- Wiring ----------------------------------------------------------- */
function backToSettings() { clearInterval(P.timer); P.running = false; results = []; show('settings'); renderSettings(); }
let armTimer = null;
$('gearBtn').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!P.running && !b.classList.contains('armed')) { backToSettings(); return; }
  if (b.classList.contains('armed')) { clearTimeout(armTimer); b.classList.remove('armed'); backToSettings(); return; }
  b.classList.add('armed'); b.title = 'Tap again to leave';
  armTimer = setTimeout(() => { b.classList.remove('armed'); b.title = 'Settings'; }, 3000);
});
$('gear2').addEventListener('click', backToSettings);
$('toSettings').addEventListener('click', backToSettings);
$('againBtn').addEventListener('click', () => { results = []; startUnit(0, 1); });
$('startBtn').addEventListener('click', () => { results = []; startUnit(0, 1); });
$('timerBtn').addEventListener('click', startTimer);
$('nextBtn').addEventListener('click', next);
window.addEventListener('resize', () => { if (!$('finishScreen').hidden) renderCollage(); });

$('brand').textContent = TITLE;
$('settingsTitle').textContent = isRally ? 'Rally Settings' : 'Team Settings';
initCore({ tool: isRally ? 'shape-rally' : 'shape-attack', version: '1.0.0' });
initViewport();
['fs1', 'fs2', 'fs3', 'fs4'].forEach(id => initFullscreen($(id)));
hydrateIcons();
renderSettings();
