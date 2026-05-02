import { get } from '../api.js';
import { loading, emptyState, badge, kvList } from '../ui.js';

export async function render(el) {
  el.innerHTML = loading();
  try {
    const data = await get('/api/platform-admin/governance-matrix');
    const levels = data.levels || [];
    const chain = data.authorizationChain || [];
    const profiles = data.accessProfiles || [];

    let html = `<div class="card" style="margin-bottom:1.5rem">
      <h3>Authorization Chain</h3>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        ${chain.map((c, i) => `${i > 0 ? '<span style="color:var(--text-muted)">→</span>' : ''}${badge(c, 'blue')}`).join('')}
      </div>
    </div>`;

    html += `<div class="card" style="margin-bottom:1.5rem">
      <h3>Access Profiles</h3>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        ${profiles.map(p => badge(p, 'gray')).join('')}
      </div>
    </div>`;

    html += '<div class="card-grid">';
    for (const lvl of levels) {
      const pairs = lvl.controls.map(ctrl => [ctrl, '✓']);
      html += `<div class="card">
        <h3>${badge(lvl.level.toUpperCase(), 'blue')} ${lvl.governor}</h3>
        ${kvList(pairs)}
      </div>`;
    }
    html += '</div>';

    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = emptyState('⚠️', err.message);
  }
}
