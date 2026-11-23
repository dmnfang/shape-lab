/* core.js: hiroba-core. One call per tool:
     import { initCore, sfx, track } from '../../assets/core/core.js';
     initCore({ tool: 'shape-jumble', version: '1.0.0' });
   Gives the tool: button sounds, a mute button, anonymous usage + error reporting, and (on the
   settings screen) a "Report a problem" button. Each of these can be switched off in the options. */
import * as sfx from './sfx.js';
import * as telemetry from './telemetry.js';
import { openReport } from './report.js';
import { CONFIG } from './config.js';

export { sfx };
export const track = telemetry.track;

const ICONS = {
  'speaker-high': '<path d="M160,32.25V223.69a8.29,8.29,0,0,1-3.91,7.18,8,8,0,0,1-9-.56l-65.57-51A4,4,0,0,1,80,176.16V79.84a4,4,0,0,1,1.55-3.15l65.57-51a8,8,0,0,1,10,.16A8.27,8.27,0,0,1,160,32.25ZM60,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H60a4,4,0,0,0,4-4V84A4,4,0,0,0,60,80Zm126.77,20.84a8,8,0,0,0-.72,11.3,24,24,0,0,1,0,31.72,8,8,0,1,0,12,10.58,40,40,0,0,0,0-52.88A8,8,0,0,0,186.74,100.84Zm40.89-26.17a8,8,0,1,0-11.92,10.66,64,64,0,0,1,0,85.34,8,8,0,1,0,11.92,10.66,80,80,0,0,0,0-106.66Z"/>',
  'speaker-slash': '<path d="M213.92,210.62a8,8,0,1,1-11.84,10.76L160,175.09v48.6a8.29,8.29,0,0,1-3.91,7.18,8,8,0,0,1-9-.56l-65.55-51A4,4,0,0,1,80,176.18V87.09L42.08,45.38A8,8,0,1,1,53.92,34.62Zm-27.21-55.46a8,8,0,0,0,11.29-.7,40,40,0,0,0,0-52.88,8,8,0,1,0-12,10.57,24,24,0,0,1,0,31.72A8,8,0,0,0,186.71,155.16Zm40.92-80.49a8,8,0,1,0-11.92,10.66,64,64,0,0,1,0,85.34,8,8,0,1,0,11.92,10.66,80,80,0,0,0,0-106.66ZM153,119.87a4,4,0,0,0,7-2.7V32.25a8.27,8.27,0,0,0-2.88-6.4,8,8,0,0,0-10-.16L103.83,59.33a4,4,0,0,0-.5,5.85ZM60,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H60a4,4,0,0,0,4-4V84A4,4,0,0,0,60,80Z"/>',
  'flag': '<path d="M232,56V176a8,8,0,0,1-2.76,6c-15.28,13.23-29.89,18-43.82,18-18.91,0-36.57-8.74-53-16.85C105.87,170,82.79,158.61,56,179.77V224a8,8,0,0,1-16,0V56a8,8,0,0,1,2.77-6h0c36-31.18,68.31-15.21,96.79-1.12C167,62.46,190.79,74.2,218.76,50A8,8,0,0,1,232,56Z"/>'
};
const svg = name => `<svg class="icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

function addCss() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./core.css', import.meta.url).href;
  document.head.append(link);
}

function mountMuteButtons() {
  const buttons = [];
  document.querySelectorAll('.header-actions').forEach(bar => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn';
    b.dataset.sfx = 'none';
    b.dataset.core = 'mute';
    b.addEventListener('click', () => { sfx.setOn(!sfx.isOn()); if (sfx.isOn()) sfx.play('tap', { rate: 0.85 }); });
    bar.prepend(b);
    buttons.push(b);
  });
  const paint = () => buttons.forEach(b => {
    b.innerHTML = svg(sfx.isOn() ? 'speaker-high' : 'speaker-slash');
    b.setAttribute('aria-label', sfx.isOn() ? 'Sound on, tap to mute' : 'Sound off, tap to turn on');
    b.title = sfx.isOn() ? 'Sound on' : 'Sound off';
    b.setAttribute('aria-pressed', String(!sfx.isOn()));
  });
  sfx.onChange(paint);
  paint();
}

function mountReportButton() {
  const bar = document.querySelector('#settingsScreen .header-actions') || document.querySelector('.hub .header-actions');
  if (!bar) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn';
  b.dataset.sfx = 'modalOpen';
  b.dataset.core = 'report';
  b.innerHTML = svg('flag');
  b.setAttribute('aria-label', 'Report a problem');
  b.title = 'Report a problem';
  b.addEventListener('click', openReport);
  bar.prepend(b);
}

export function initCore({ tool, version, sounds = true, tracking = true, report = true } = {}) {
  const config = window.HIROBA_CONFIG ?? CONFIG;       // tests can point this somewhere else
  addCss();
  if (tracking) { telemetry.init({ tool, version, config }); telemetry.track('open'); }
  if (sounds) { sfx.preload(); sfx.wireButtons(); mountMuteButtons(); }
  if (report && tracking) mountReportButton();
  return { sfx, track: telemetry.track };
}
