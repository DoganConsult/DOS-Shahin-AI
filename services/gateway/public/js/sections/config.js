import { get, patch, put, del } from '../api.js';
import { dataTable, loading, emptyState, toast, openModal, closeModal, formGroup, kvList, badge, fmtDate } from '../ui.js';

let activeTab = 'platform';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'platform' ? 'active' : ''}" data-tab="platform">Platform Config</button>
    <button class="${activeTab === 'flags' ? 'active' : ''}" data-tab="flags">Feature Flags</button>
    <button class="${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Config Center</button>
    <button class="${activeTab === 'diagnostics' ? 'active' : ''}" data-tab="diagnostics">Diagnostics</button>
  </div><div id="cfg-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#cfg-content'));
    });
  });
  loadTab(el.querySelector('#cfg-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'platform') await renderPlatformConfig(c);
    else if (activeTab === 'flags') await renderFlags(c);
    else if (activeTab === 'settings') await renderSettings(c);
    else if (activeTab === 'diagnostics') await renderDiagnostics(c);
  } catch (err) { c.innerHTML = emptyState('⚠️', err.message); }
}

async function renderPlatformConfig(c) {
  const data = await get('/api/platform-admin/platform-config');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(cfg =>
    `<tr>
      <td><strong>${cfg.config_key}</strong></td>
      <td><code>${typeof cfg.config_value === 'object' ? JSON.stringify(cfg.config_value) : cfg.config_value}</code></td>
      <td>${fmtDate(cfg.updated_at)}</td>
      <td><button class="btn btn-sm btn-outline edit-cfg" data-key="${cfg.config_key}" data-val="${encodeURIComponent(JSON.stringify(cfg.config_value))}">Edit</button></td>
    </tr>`
  );
  const addBtn = `<button class="btn btn-primary btn-sm" id="add-cfg-btn">+ Add Config</button>`;
  c.innerHTML = dataTable(`Platform Config (${items.length})`, ['Key', 'Value', 'Updated', 'Actions'], rows, addBtn);
  bindConfigActions(c);
}

function bindConfigActions(c) {
  c.querySelector('#add-cfg-btn')?.addEventListener('click', () => {
    const html = `<form id="cfg-form">
      ${formGroup('Config Key', 'config_key', 'text', { required: true, placeholder: 'e.g. platform.max_tenants' })}
      ${formGroup('Value (JSON)', 'config_value', 'textarea', { required: true, placeholder: '100' })}
      <button type="submit" class="btn btn-primary btn-full">Save</button>
    </form>`;
    openModal('Add Platform Config', html);
    document.getElementById('cfg-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const val = JSON.parse(fd.get('config_value'));
        await patch('/api/platform-admin/platform-config', { config_key: fd.get('config_key'), config_value: val });
        toast('Config saved'); closeModal(); loadTab(c);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
  c.querySelectorAll('.edit-cfg').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const val = JSON.stringify(JSON.parse(decodeURIComponent(btn.dataset.val)), null, 2);
      const html = `<form id="cfg-form">
        ${formGroup('Config Key', 'config_key', 'text', { value: key, required: true })}
        ${formGroup('Value (JSON)', 'config_value', 'textarea', { value: val, required: true })}
        <button type="submit" class="btn btn-primary btn-full">Update</button>
      </form>`;
      openModal(`Edit: ${key}`, html);
      document.getElementById('cfg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const v = JSON.parse(fd.get('config_value'));
          await patch('/api/platform-admin/platform-config', { config_key: fd.get('config_key'), config_value: v });
          toast('Config updated'); closeModal(); loadTab(c);
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  });
}

async function renderFlags(c) {
  const data = await get('/api/platform-admin/feature-flags');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(f =>
    `<tr>
      <td><strong>${f.flag_code}</strong></td>
      <td>${f.enabled ? badge('Enabled', 'green') : badge('Disabled', 'red')}</td>
      <td>${f.owner_layer || '-'}</td>
      <td>${f.description || '-'}</td>
      <td><label class="toggle"><input type="checkbox" ${f.enabled ? 'checked' : ''} class="flag-toggle" data-code="${f.flag_code}"><span class="slider"></span></label></td>
    </tr>`
  );
  c.innerHTML = dataTable(`Feature Flags (${items.length})`, ['Flag', 'Status', 'Owner Layer', 'Description', 'Toggle'], rows);
  c.querySelectorAll('.flag-toggle').forEach(input => {
    input.addEventListener('change', async () => {
      try {
        await patch(`/api/platform-admin/feature-flags/${input.dataset.code}`, { enabled: input.checked });
        toast(`Flag ${input.dataset.code} ${input.checked ? 'enabled' : 'disabled'}`);
      } catch (err) { toast(err.message, 'error'); input.checked = !input.checked; }
    });
  });
}

async function renderSettings(c) {
  const data = await get('/api/config-center/settings?scope=platform');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(s =>
    `<tr>
      <td><strong>${s.key || s.config_key || '-'}</strong></td>
      <td><code>${typeof s.value === 'object' ? JSON.stringify(s.value) : (s.value ?? s.config_value ?? '-')}</code></td>
      <td>${badge(s.scope || 'platform', 'blue')}</td>
      <td>${fmtDate(s.updated_at)}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Config Center Settings (${items.length})`, ['Key', 'Value', 'Scope', 'Updated'], rows);
}

async function renderDiagnostics(c) {
  const [envData, diagData] = await Promise.all([
    get('/api/config-center/health/env').catch(() => ({ status: 'error', checks: [] })),
    get('/api/config-center/health/diagnostics').catch(() => ({ status: 'error', checks: {} })),
  ]);
  const envPairs = (envData.checks || []).map(ch => [ch.key, ch.present ? badge('Present', 'green') : badge('Missing', 'red')]);
  const diagPairs = Object.entries(diagData.checks || {}).map(([k, v]) => [k, String(v).startsWith('ok') ? badge(v, 'green') : badge(v, 'red')]);
  c.innerHTML = `<div class="card-grid">
    <div class="card"><h3>Environment Checks</h3>${kvList(envPairs)}</div>
    <div class="card"><h3>Data Diagnostics</h3>${kvList(diagPairs)}</div>
  </div>`;
}
