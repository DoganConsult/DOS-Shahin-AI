import { get } from '../api.js';
import { dataTable, statusBadge, fmtDate, loading, emptyState, badge } from '../ui.js';

let activeTab = 'tenants';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'tenants' ? 'active' : ''}" data-tab="tenants">Tenants</button>
    <button class="${activeTab === 'workspaces' ? 'active' : ''}" data-tab="workspaces">Workspaces</button>
    <button class="${activeTab === 'provisioning' ? 'active' : ''}" data-tab="provisioning">Provisioning</button>
  </div><div id="tenants-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#tenants-content'));
    });
  });
  loadTab(el.querySelector('#tenants-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'tenants') await renderTenants(c);
    else if (activeTab === 'workspaces') await renderWorkspaces(c);
    else if (activeTab === 'provisioning') await renderProvisioning(c);
  } catch (err) { c.innerHTML = emptyState('\u26A0\uFE0F', err.message); }
}

async function renderTenants(c) {
  const raw = await get('/api/tenants');
  const tenants = Array.isArray(raw) ? raw : (raw.tenants || []);
  if (!tenants.length) { c.innerHTML = emptyState('\u{1F3E2}', 'No tenants found'); return; }
  const rows = tenants.map(t =>
    `<tr>
      <td><strong>${t.id || t.tenant_id || '-'}</strong></td>
      <td>${t.name || t.org_name || '-'}</td>
      <td>${t.slug || '-'}</td>
      <td>${statusBadge(t.status || 'active')}</td>
      <td>${t.plan || t.tier || '-'}</td>
      <td>${t.language || '-'}</td>
      <td>${fmtDate(t.created_at)}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Tenants (${tenants.length})`, ['ID', 'Name', 'Slug', 'Status', 'Plan', 'Language', 'Created'], rows);
}

async function renderWorkspaces(c) {
  const raw = await get('/api/platform-admin/overview');
  const wsCount = raw?.workspaces ?? 0;
  let workspaces = [];
  try {
    const data = await get('/api/tenants');
    const tenants = Array.isArray(data) ? data : (data.tenants || []);
    for (const t of tenants.slice(0, 20)) {
      workspaces.push({ tenant_id: t.id || t.tenant_id, tenant_name: t.name || t.org_name, type: 'default', status: t.status || 'active' });
    }
  } catch {}
  if (!workspaces.length) { c.innerHTML = emptyState('\u{1F4BC}', `${wsCount} workspace(s) reported but details unavailable`); return; }
  const rows = workspaces.map(w =>
    `<tr>
      <td>${w.tenant_id?.slice(0, 8) || '-'}</td>
      <td><strong>${w.tenant_name || '-'}</strong></td>
      <td>${badge(w.type || 'default', 'blue')}</td>
      <td>${statusBadge(w.status)}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Workspaces (${workspaces.length})`, ['Tenant', 'Name', 'Type', 'Status'], rows);
}

async function renderProvisioning(c) {
  let jobs = [];
  try {
    const data = await get('/api/provisioning/jobs');
    jobs = Array.isArray(data) ? data : (data.data || data.jobs || []);
  } catch {}

  let readiness = null;
  try { readiness = await get('/api/provisioning/readiness'); } catch {}

  let html = '';
  if (readiness) {
    const rd = readiness.data || readiness;
    const pairs = Object.entries(rd).map(([k, v]) => {
      const ok = v === true || v === 'ready' || v === 'ok';
      return `<li>${ok ? badge('Ready', 'green') : badge('Not Ready', 'red')} ${k}</li>`;
    });
    html += `<div class="card" style="margin-bottom:1.5rem"><h3>Provisioning Readiness</h3><ul class="widget-list">${pairs.join('')}</ul></div>`;
  }

  if (!jobs.length) {
    html += emptyState('\u{1F4E6}', 'No provisioning jobs found');
    c.innerHTML = html;
    return;
  }

  const rows = jobs.map(j =>
    `<tr>
      <td>${j.jobId?.slice(0, 8) || j.id?.slice(0, 8) || '-'}</td>
      <td>${j.tenantId?.slice(0, 8) || '-'}</td>
      <td>${statusBadge(j.status || 'pending')}</td>
      <td>${j.currentStep || j.step || '-'}</td>
      <td>${fmtDate(j.createdAt || j.created_at)}</td>
      <td>${fmtDate(j.completedAt || j.completed_at)}</td>
    </tr>`
  );
  html += dataTable(`Provisioning Jobs (${jobs.length})`, ['Job', 'Tenant', 'Status', 'Current Step', 'Created', 'Completed'], rows);
  c.innerHTML = html;
}
