import { get, patch } from '../api.js';
import { loading, emptyState, kvList, badge, statsGrid, dataTable, toast, formGroup, openModal, closeModal, fmtDate, statusBadge } from '../ui.js';

const BASE = '/api/auth/admin';
let activeTab = 'overview';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
    <button class="${activeTab === 'sla' ? 'active' : ''}" data-tab="sla">SLA Config</button>
    <button class="${activeTab === 'sessions' ? 'active' : ''}" data-tab="sessions">Sessions</button>
    <button class="${activeTab === 'mfa' ? 'active' : ''}" data-tab="mfa">MFA Status</button>
    <button class="${activeTab === 'sod' ? 'active' : ''}" data-tab="sod">SoD Rules</button>
  </div><div id="dauth-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#dauth-content'));
    });
  });
  loadTab(el.querySelector('#dauth-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'overview') await renderOverview(c);
    else if (activeTab === 'sla') await renderSla(c);
    else if (activeTab === 'sessions') await renderSessions(c);
    else if (activeTab === 'mfa') await renderMfa(c);
    else if (activeTab === 'sod') await renderSod(c);
  } catch (err) { c.innerHTML = emptyState('⚠️', err.message); }
}

async function renderOverview(c) {
  const data = await get(`${BASE}/overview`);
  const s = data.stats || {};
  const stats = [
    { label: 'Total Users', value: s.totalUsers ?? '-' },
    { label: 'Active Users', value: s.activeUsers ?? '-', up: true },
    { label: 'Locked Users', value: s.lockedUsers ?? 0 },
    { label: 'MFA Enabled', value: s.mfaEnabledUsers ?? 0 },
    { label: 'Active Delegations', value: s.activeDelegations ?? 0 },
    { label: 'SoD Rules', value: s.activeSodRules ?? 0 },
  ];

  const escPairs = Object.entries(data.escalation || {}).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1'), v]);
  const runbookPairs = Object.entries(data.runbooks || {}).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1'), `<a href="${v}" style="color:var(--accent)">${v.split('/').pop()}</a>`]);

  c.innerHTML = statsGrid(stats)
    + `<div class="card-grid">
      <div class="card"><h3>Escalation Matrix</h3>${kvList(escPairs)}</div>
      <div class="card"><h3>Runbooks</h3>${kvList(runbookPairs)}</div>
    </div>`;
}

async function renderSla(c) {
  const data = await get(`${BASE}/sla`);
  const fields = Object.entries(data).filter(([k]) => k !== 'timestamp');
  const pairs = fields.map(([k, v]) => [k.replace(/([A-Z])/g, ' $1'), String(v)]);

  c.innerHTML = `<div class="card"><h3>SLA Configuration</h3>${kvList(pairs)}
    <button class="btn btn-primary btn-sm" id="edit-sla-btn" style="margin-top:1rem">Edit SLA</button></div>`;

  c.querySelector('#edit-sla-btn').addEventListener('click', () => {
    const html = `<form id="sla-form">
      ${fields.map(([k, v]) => formGroup(k.replace(/([A-Z])/g, ' $1'), k, 'number', { value: v })).join('')}
      <button type="submit" class="btn btn-primary btn-full">Update SLA</button>
    </form>`;
    openModal('Edit SLA Configuration', html);
    document.getElementById('sla-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {};
      for (const [k, v] of fd.entries()) body[k] = parseInt(v) || 0;
      try {
        await patch(`${BASE}/sla`, body);
        toast('SLA updated'); closeModal(); loadTab(c);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function renderSessions(c) {
  const data = await get('/api/auth/sessions/admin');
  const items = Array.isArray(data) ? data : (data.sessions || []);
  const rows = items.map(s =>
    `<tr>
      <td>${s.user_id?.slice(0, 8) || '-'}</td>
      <td>${s.email || '-'}</td>
      <td>${statusBadge(s.status || 'active')}</td>
      <td>${fmtDate(s.created_at)}</td>
      <td>${fmtDate(s.expires_at)}</td>
      <td>${s.ip_address || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Active Sessions (${items.length})`, ['User', 'Email', 'Status', 'Created', 'Expires', 'IP'], rows);
}

async function renderMfa(c) {
  const data = await get('/api/auth/mfa/admin/users');
  const items = Array.isArray(data) ? data : (data.users || []);
  const rows = items.map(u =>
    `<tr>
      <td>${u.user_id?.slice(0, 8) || '-'}</td>
      <td>${u.email || '-'}</td>
      <td>${u.is_enabled ? badge('Enabled', 'green') : badge('Disabled', 'red')}</td>
      <td>${u.methods?.join(', ') || u.method || '-'}</td>
      <td>${fmtDate(u.enrolled_at)}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`MFA Status (${items.length})`, ['User', 'Email', 'MFA', 'Methods', 'Enrolled'], rows);
}

async function renderSod(c) {
  const data = await get('/api/auth/sod/rules');
  const items = Array.isArray(data) ? data : (data.rules || []);
  const rows = items.map(r => {
    const sevColor = { critical: 'red', high: 'yellow', medium: 'blue', low: 'gray' }[r.severity] || 'gray';
    return `<tr>
      <td><strong>${r.rule_code || r.id?.slice(0, 8) || '-'}</strong></td>
      <td>${r.role_a || r.conflicting_role_a || '-'}</td>
      <td>${r.role_b || r.conflicting_role_b || '-'}</td>
      <td>${badge(r.severity || '-', sevColor)}</td>
      <td>${r.is_active !== false ? badge('Active', 'green') : badge('Inactive', 'gray')}</td>
    </tr>`;
  });
  c.innerHTML = dataTable(`SoD Rules (${items.length})`, ['Rule', 'Role A', 'Role B', 'Severity', 'Status'], rows);
}
