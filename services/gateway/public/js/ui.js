export function statsGrid(items) {
  return `<div class="stat-grid">${items.map(i =>
    `<div class="stat-card">
      <div class="stat-label">${i.label}</div>
      <div class="stat-value">${i.value}</div>
      ${i.sub ? `<div class="stat-sub${i.up ? ' up' : ''}">${i.sub}</div>` : ''}
    </div>`
  ).join('')}</div>`;
}

export function dataTable(title, cols, rows, actions) {
  const headerHtml = actions
    ? `<div class="table-header"><h3>${title}</h3><div class="btn-group">${actions}</div></div>`
    : `<div class="table-header"><h3>${title}</h3></div>`;
  return `<div class="table-container">${headerHtml}<div class="table-scroll"><table>
    <thead><tr>${cols.map(c => `<th>${typeof c === 'string' ? c : c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${cols.length}" class="empty-state">No data</td></tr>`}</tbody>
  </table></div></div>`;
}

export function badge(text, color) {
  return `<span class="badge-pill badge-${color}">${text}</span>`;
}

export function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['active', 'healthy', 'enabled', 'ok', 'online', 'registered'].includes(s)) return badge(status, 'green');
  if (['degraded', 'warning', 'pending', 'partial'].includes(s)) return badge(status, 'yellow');
  if (['inactive', 'down', 'error', 'disabled', 'locked', 'failed', 'offline'].includes(s)) return badge(status, 'red');
  return badge(status || '-', 'gray');
}

export function loading() {
  return '<div class="loading">Loading...</div>';
}

export function emptyState(icon, message) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
}

export function tabBar(tabs, activeId, onClickAttr) {
  return `<div class="tab-bar">${tabs.map(t =>
    `<button class="${t.id === activeId ? 'active' : ''}" ${onClickAttr}="${t.id}">${t.label}</button>`
  ).join('')}</div>`;
}

export function kvList(pairs) {
  return `<ul class="kv-list">${pairs.map(([k, v]) =>
    `<li><span class="kv-key">${k}</span><span class="kv-val">${v ?? '-'}</span></li>`
  ).join('')}</ul>`;
}

export function formGroup(label, name, type, opts = {}) {
  const { value = '', placeholder = '', required = false, options = [] } = opts;
  const req = required ? 'required' : '';
  if (type === 'select') {
    return `<div class="form-group"><label>${label}</label><select name="${name}" ${req}>
      ${options.map(o => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`).join('')}
    </select></div>`;
  }
  if (type === 'textarea') {
    return `<div class="form-group"><label>${label}</label><textarea name="${name}" placeholder="${placeholder}" ${req}>${value}</textarea></div>`;
  }
  return `<div class="form-group"><label>${label}</label><input name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${req}></div>`;
}

export function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container') || document.body;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('show');
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

export function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function truncate(s, n = 40) {
  if (!s) return '-';
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

export function progressBar(pct, color = 'blue') {
  const clamped = Math.max(0, Math.min(100, pct));
  return `<div class="progress-bar"><div class="fill ${color}" style="width:${clamped}%"></div></div>`;
}

export function cockpitWidget(title, content, accent = '') {
  const cls = accent ? ` cockpit-${accent}` : '';
  return `<div class="cockpit-widget${cls}"><h4>${title}</h4>${content}</div>`;
}

export function activityItem(icon, body, time) {
  return `<div class="activity-item"><span class="act-icon">${icon}</span><span class="act-body">${body}</span><span class="act-time">${time}</span></div>`;
}
