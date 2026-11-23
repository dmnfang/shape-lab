/* report.js: the "Report a problem" dialog (teachers' settings screens). */
import { post, context, recentErrors, isEnabled, sent } from './telemetry.js';

let dialog = null;

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'hc-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="hc-form">
      <h2 class="hc-title">Report a problem</h2>
      <p class="hc-note">Tell us what went wrong or what you wish this tool did. Please don't include student names.</p>
      <label class="hc-field"><span>What is it about?</span>
        <select name="category"><option value="bug">Something is broken</option><option value="idea">An idea</option><option value="other">Something else</option></select></label>
      <label class="hc-field"><span>What happened?</span>
        <textarea name="message" rows="5" maxlength="1500" required placeholder="For example: the shapes did not flash after I pressed Play."></textarea></label>
      <label class="hc-field"><span>Your email (optional, only if you want a reply)</span>
        <input name="contact" type="email" maxlength="200" autocomplete="email"></label>
      <p class="hc-status" role="status" hidden></p>
      <div class="hc-actions">
        <button type="button" class="btn" data-sfx="close" data-hc="cancel">Cancel</button>
        <button type="submit" class="btn btn--accent" data-sfx="launch">Send</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('.hc-status');
  dialog.querySelector('[data-hc="cancel"]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const show = text => { status.textContent = text; status.hidden = false; };
    if (!isEnabled()) { show('Reporting is not switched on yet for this site.'); return; }
    const ok = await post('hc_tickets', [{
      ...context(),
      category: data.get('category'),
      message: String(data.get('message')).trim().slice(0, 1500),
      contact: String(data.get('contact') || '').trim().slice(0, 200) || null,
      recent_errors: recentErrors(),
    }]);
    if (ok) { sent.tickets += 1; show('Thank you! Your report was sent.'); form.reset(); setTimeout(() => dialog.close(), 1400); }
    else show('Sorry, that did not send. Please try again in a moment.');
  });
}

export function openReport() {
  if (!dialog) build();
  dialog.querySelector('.hc-status').hidden = true;
  dialog.showModal();
}
