import { get } from '../api.js';
import { dataTable, loading, emptyState, badge, fmtDate } from '../ui.js';

let activeTab = 'audit';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'audit' ? 'active' : ''}" data-tab="audit">Audit Log</button>
    <button class="${activeTab === 'events' ? 'active' : ''}" data-tab="events">System Events</button>
    <button class="${activeTab === 'logins' ? 'active' : ''}" data-tab="logins">Login Attempts</button>
    <button class="${activeTab === 'service-audit' ? 'active' : ''}" data-tab="service-audit">Audit Service</button>
  </div><div id="audit-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#audit-content'));
    });
  });
  loadTab(el.querySelector('#audit-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'audit') await renderAuditLog(c);
    else if (activeTab === 'events') await renderSystemEvents(c);
    else if (activeTab === 'logins') await renderLoginAttempts(c);
    else if (activeTab === 'service-audit') await renderServiceAudit(c);
  } catch (err) { c.innerHTML = emptyState('⚠️', err.message); }
}

async function renderAuditLog(c) {
  const data = await get('/api/platform-admin/audit-logs?limit=200');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(e =>
    `<tr>
      <td>${fmtDate(e.created_at)}</td>
      <td><strong>${e.action || '-'}</strong></td>
      <td>${e.entity_type || '-'}</td>
      <td>${e.entity_id?.slice(0, 8) || '-'}</td>
      <td>${e.actor_id?.slice(0, 8) || e.user_id?.slice(0, 8) || '-'}</td>
      <td>${e.ip_address || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Audit Log (${items.length})`, ['Time', 'Action', 'Entity Type', 'Entity ID', 'Actor', 'IP'], rows);
}

async function renderSystemEvents(c) {
  const data = await get('/api/platform-admin/system-events?limit=200');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(e => {
    const sevColor = { critical: 'red', high: 'red', warning: 'yellow', info: 'blue' }[e.severity] || 'gray';
    return `<tr>
      <td>${fmtDate(e.occurred_at)}</td>
      <td><strong>${e.event_type || '-'}</strong></td>
      <td>${badge(e.severity || 'info', sevColor)}</td>
      <td>${e.source || '-'}</td>
      <td>${e.message?.slice(0, 80) || '-'}</td>
    </tr>`;
  });
  c.innerHTML = dataTable(`System Events (${items.length})`, ['Time', 'Type', 'Severity', 'Source', 'Message'], rows);
}

async function renderLoginAttempts(c) {
  const data = await get('/api/platform-admin/login-attempts?limit=200');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(a =>
    `<tr>
      <td>${fmtDate(a.attempted_at)}</td>
      <td>${a.email || '-'}</td>
      <td>${a.success ? badge('Success', 'green') : badge('Failed', 'red')}</td>
      <td>${a.ip_address || '-'}</td>
      <td>${a.user_agent?.slice(0, 50) || '-'}</td>
      <td>${a.failure_reason || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Login Attempts (${items.length})`, ['Time', 'Email', 'Result', 'IP', 'User Agent', 'Reason'], rows);
}

async function renderServiceAudit(c) {
  const data = await get('/api/audit/entries?limit=100');
  const items = Array.isArray(data) ? data : (data.entries || []);
  const rows = items.map(e =>
    `<tr>
      <td>${fmtDate(e.timestamp || e.created_at)}</td>
      <td><strong>${e.action || e.event_type || '-'}</strong></td>
      <td>${e.actor_id?.slice(0, 8) || e.user_id?.slice(0, 8) || '-'}</td>
      <td>${e.resource_type || e.entity_type || '-'}</td>
      <td>${e.details?.slice?.(0, 80) || JSON.stringify(e.metadata || '').slice(0, 80) || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Audit Service Entries (${items.length})`, ['Time', 'Action', 'Actor', 'Resource', 'Details'], rows);
}
