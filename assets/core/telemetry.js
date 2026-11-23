/* telemetry.js: anonymous usage events and error reports, sent to your own database.
   WHAT IS SENT: tool name, version, a random per-tab session id, event names, the page path,
   the browser string and window size. Never names, emails, typed text or anything a student enters.
   If config.js is empty, nothing is sent at all. */

const FLUSH_MS = 5000;
const MAX_QUEUE = 50;
const MAX_ERRORS_PER_PAGE = 10;

let cfg = { url: '', anonKey: '' };
let meta = { tool: 'unknown', version: '0' };
let queue = [];
let timer = null;
let errorsSent = 0;
const seen = new Set();
const recent = [];          // last few error messages, attached to problem reports
export const sent = { events: 0, errors: 0, tickets: 0 };

export const isEnabled = () => Boolean(cfg.url && cfg.anonKey);

function sessionId() {
  try {
    let id = sessionStorage.getItem('hc.sid');
    if (!id) { id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) ; sessionStorage.setItem('hc.sid', id); }
    return id;
  } catch { return 'no-storage'; }
}

const clip = (value, n) => (value == null ? null : String(value).slice(0, n));
const base = () => ({ tool: meta.tool, version: meta.version, session: sessionId(), path: clip(location.pathname, 200) });

export async function post(table, rows) {
  if (!isEnabled()) return false;
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
      keepalive: true,
    });
    return res.ok;
  } catch { return false; }
}

export function track(event, props = {}) {
  if (!isEnabled()) return;
  queue.push({ ...base(), event: clip(event, 60), props: JSON.parse(JSON.stringify(props, (k, v) => (typeof v === 'string' ? v.slice(0, 80) : v))) });
  if (queue.length >= MAX_QUEUE) flush();
}

export function flush() {
  if (!queue.length) return;
  const rows = queue;
  queue = [];
  post('hc_events', rows).then(ok => { if (ok) sent.events += rows.length; });
}

export function reportError(error, kind = 'error') {
  const message = clip(error?.message ?? error, 500) || 'Unknown error';
  const stack = clip(error?.stack, 2000);
  recent.push(message); if (recent.length > 5) recent.shift();
  if (!isEnabled() || errorsSent >= MAX_ERRORS_PER_PAGE) return;
  const key = message + (stack || '').split('\n')[1];
  if (seen.has(key)) return;                 // the same error is only sent once per page load
  seen.add(key); errorsSent += 1;
  post('hc_errors', [{ ...base(), kind, message, stack, ua: clip(navigator.userAgent, 300), viewport: `${innerWidth}x${innerHeight}` }])
    .then(ok => { if (ok) sent.errors += 1; });
}

export const recentErrors = () => [...recent];
export const context = () => ({ ...base(), ua: clip(navigator.userAgent, 300), viewport: `${innerWidth}x${innerHeight}` });

export function init({ tool, version, config }) {
  meta = { tool, version: String(version) };
  cfg = config || cfg;
  window.addEventListener('error', e => reportError(e.error || e.message, 'error'));
  window.addEventListener('unhandledrejection', e => reportError(e.reason, 'promise'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  if (isEnabled()) timer = setInterval(flush, FLUSH_MS);
  // every Start / Launch / Play button press is counted, without touching the tools' own code
  document.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('.launch-btn') : null;
    if (b && !b.disabled) track('launch', { id: b.id || null });
  }, true);
}
