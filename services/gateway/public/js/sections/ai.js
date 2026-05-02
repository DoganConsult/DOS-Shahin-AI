import { get } from '../api.js';
import { dataTable, loading, emptyState, badge, statusBadge } from '../ui.js';

let activeTab = 'models';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'models' ? 'active' : ''}" data-tab="models">AI Models</button>
    <button class="${activeTab === 'agents' ? 'active' : ''}" data-tab="agents">AI Agents</button>
    <button class="${activeTab === 'prompts' ? 'active' : ''}" data-tab="prompts">Prompt Registry</button>
  </div><div id="ai-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#ai-content'));
    });
  });
  loadTab(el.querySelector('#ai-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'models') await renderModels(c);
    else if (activeTab === 'agents') await renderAgents(c);
    else if (activeTab === 'prompts') await renderPrompts(c);
  } catch (err) { c.innerHTML = emptyState('⚠️', err.message); }
}

async function renderModels(c) {
  const data = await get('/api/platform-admin/ai/models');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(m =>
    `<tr>
      <td><strong>${m.model_code || '-'}</strong></td>
      <td>${badge(m.provider || '-', 'blue')}</td>
      <td>${m.display_name || m.name || '-'}</td>
      <td>${m.capability || '-'}</td>
      <td>${statusBadge(m.status || 'active')}</td>
      <td>${m.max_tokens || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`AI Models (${items.length})`, ['Code', 'Provider', 'Name', 'Capability', 'Status', 'Max Tokens'], rows);
}

async function renderAgents(c) {
  const data = await get('/api/platform-admin/ai/agents');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(a =>
    `<tr>
      <td><strong>${a.agent_code || '-'}</strong></td>
      <td>${a.name || a.display_name || '-'}</td>
      <td>${a.model_code || '-'}</td>
      <td>${a.module_code ? badge(a.module_code, 'blue') : '-'}</td>
      <td>${statusBadge(a.status || 'active')}</td>
      <td>${a.description?.slice(0, 60) || '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`AI Agents (${items.length})`, ['Code', 'Name', 'Model', 'Module', 'Status', 'Description'], rows);
}

async function renderPrompts(c) {
  const data = await get('/api/platform-admin/ai/prompts');
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(p =>
    `<tr>
      <td><strong>${p.prompt_code || '-'}</strong></td>
      <td>${p.name || p.display_name || '-'}</td>
      <td>${p.category || '-'}</td>
      <td>${p.module_code ? badge(p.module_code, 'blue') : '-'}</td>
      <td>${p.version || '-'}</td>
      <td>${statusBadge(p.status || 'active')}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Prompt Registry (${items.length})`, ['Code', 'Name', 'Category', 'Module', 'Version', 'Status'], rows);
}
