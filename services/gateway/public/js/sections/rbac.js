import { get, post } from '../api.js';
import { dataTable, statusBadge, loading, emptyState, toast, openModal, closeModal, formGroup, badge, fmtDate } from '../ui.js';

const BASE = '/api/platform-admin';
let activeTab = 'profiles';

export async function render(el) {
  el.innerHTML = buildTabs() + '<div id="rbac-content"></div>';
  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#rbac-content'));
    });
  });
  loadTab(el.querySelector('#rbac-content'));
}

function buildTabs() {
  const tabs = [
    { id: 'profiles', label: 'Access Profiles' },
    { id: 'roles', label: 'Functional Roles' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'role-perms', label: 'Role-Permission Map' },
    { id: 'delegations', label: 'Delegations' },
    { id: 'sod', label: 'SoD Rules' },
  ];
  return `<div class="tab-bar">${tabs.map(t =>
    `<button class="${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
  ).join('')}</div>`;
}

async function loadTab(container) {
  container.innerHTML = loading();
  try {
    if (activeTab === 'profiles') await renderProfiles(container);
    else if (activeTab === 'roles') await renderRoles(container);
    else if (activeTab === 'permissions') await renderPermissions(container);
    else if (activeTab === 'role-perms') await renderRolePerms(container);
    else if (activeTab === 'delegations') await renderDelegations(container);
    else if (activeTab === 'sod') await renderSod(container);
  } catch (err) {
    container.innerHTML = emptyState('⚠️', err.message);
  }
}

async function renderProfiles(c) {
  const data = await get(`${BASE}/access-profiles`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(p =>
    `<tr><td><strong>${p.code}</strong></td><td>${p.name}</td><td>${p.description || '-'}</td><td>${p.assigned_count ?? 0}</td></tr>`
  );
  const addBtn = `<button class="btn btn-primary btn-sm" id="add-profile-btn">+ Add Profile</button>`;
  c.innerHTML = dataTable(`Access Profiles (${items.length})`, ['Code', 'Name', 'Description', 'Assigned'], rows, addBtn);
  c.querySelector('#add-profile-btn')?.addEventListener('click', () => showCreateForm('Access Profile', [
    { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. security_admin' },
    { label: 'Name', name: 'name', type: 'text', required: true },
    { label: 'Description', name: 'description', type: 'textarea' },
  ], `${BASE}/access-profiles`, () => loadTab(c)));
}

async function renderRoles(c) {
  const data = await get(`${BASE}/functional-roles`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(r =>
    `<tr><td><strong>${r.code}</strong></td><td>${r.name}</td><td>${badge(r.module_code || 'platform', 'blue')}</td><td>${r.category || '-'}</td><td>${r.assigned_count ?? 0}</td></tr>`
  );
  const addBtn = `<button class="btn btn-primary btn-sm" id="add-role-btn">+ Add Role</button>`;
  c.innerHTML = dataTable(`Functional Roles (${items.length})`, ['Code', 'Name', 'Module', 'Category', 'Assigned'], rows, addBtn);
  c.querySelector('#add-role-btn')?.addEventListener('click', () => showCreateForm('Functional Role', [
    { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. risk_manager' },
    { label: 'Name', name: 'name', type: 'text', required: true },
    { label: 'Module Code', name: 'module_code', type: 'text', placeholder: 'platform' },
    { label: 'Category', name: 'category', type: 'text', placeholder: 'platform' },
  ], `${BASE}/functional-roles`, () => loadTab(c)));
}

async function renderPermissions(c) {
  const data = await get(`${BASE}/permissions`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(p =>
    `<tr><td><strong>${p.code}</strong></td><td>${p.description || '-'}</td><td>${p.module_code || '-'}</td><td>${p.resource || '-'}</td><td>${p.action || '-'}</td></tr>`
  );
  const addBtn = `<button class="btn btn-primary btn-sm" id="add-perm-btn">+ Add Permission</button>`;
  c.innerHTML = dataTable(`Permissions (${items.length})`, ['Code', 'Description', 'Module', 'Resource', 'Action'], rows, addBtn);
  c.querySelector('#add-perm-btn')?.addEventListener('click', () => showCreateForm('Permission', [
    { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. risk.assessment.create' },
    { label: 'Description', name: 'description', type: 'textarea' },
    { label: 'Module Code', name: 'module_code', type: 'text' },
    { label: 'Resource', name: 'resource', type: 'text' },
    { label: 'Action', name: 'action', type: 'text' },
  ], `${BASE}/permissions`, () => loadTab(c)));
}

async function renderRolePerms(c) {
  const data = await get(`${BASE}/role-permissions`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(rp =>
    `<tr><td>${rp.role_code || '-'}</td><td>${rp.role_name || '-'}</td><td><strong>${rp.permission_code || '-'}</strong></td></tr>`
  );
  c.innerHTML = dataTable(`Role-Permission Mappings (${items.length})`, ['Role Code', 'Role Name', 'Permission'], rows);
}

async function renderDelegations(c) {
  const data = await get(`${BASE}/delegations`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(d =>
    `<tr><td>${d.delegator_id?.slice(0, 8) || '-'}</td><td>${d.delegate_id?.slice(0, 8) || '-'}</td>
     <td>${d.permission_scope || 'all'}</td><td>${statusBadge(d.status || 'active')}</td>
     <td>${fmtDate(d.expires_at)}</td><td>${d.reason || '-'}</td></tr>`
  );
  c.innerHTML = dataTable(`Delegations (${items.length})`, ['Delegator', 'Delegate', 'Scope', 'Status', 'Expires', 'Reason'], rows);
}

async function renderSod(c) {
  const data = await get(`${BASE}/sod-rules`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(s => {
    const sevColor = { critical: 'red', high: 'yellow', medium: 'blue', low: 'gray' }[s.severity] || 'gray';
    return `<tr><td><strong>${s.rule_code}</strong></td><td>${s.conflicting_role_a || '-'}</td><td>${s.conflicting_role_b || '-'}</td>
     <td>${badge(s.severity || '-', sevColor)}</td><td>${s.description || '-'}</td></tr>`;
  });
  const addBtn = `<button class="btn btn-primary btn-sm" id="add-sod-btn">+ Add Rule</button>`;
  c.innerHTML = dataTable(`SoD Rules (${items.length})`, ['Rule Code', 'Role A', 'Role B', 'Severity', 'Description'], rows, addBtn);
  c.querySelector('#add-sod-btn')?.addEventListener('click', () => showCreateForm('SoD Rule', [
    { label: 'Rule Code', name: 'rule_code', type: 'text', required: true, placeholder: 'e.g. no_dual_approval' },
    { label: 'Conflicting Role A', name: 'conflicting_role_a', type: 'text' },
    { label: 'Conflicting Role B', name: 'conflicting_role_b', type: 'text' },
    { label: 'Severity', name: 'severity', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
    { label: 'Description', name: 'description', type: 'textarea' },
  ], `${BASE}/sod-rules`, () => loadTab(c)));
}

function showCreateForm(title, fields, endpoint, onSuccess) {
  const html = `<form id="create-form">
    ${fields.map(f => {
      if (f.type === 'select') {
        return formGroup(f.label, f.name, 'select', { required: f.required, options: f.options.map(o => ({ value: o, label: o })) });
      }
      return formGroup(f.label, f.name, f.type, { required: f.required, placeholder: f.placeholder || '' });
    }).join('')}
    <button type="submit" class="btn btn-primary btn-full">Create ${title}</button>
  </form>`;
  openModal(`Create ${title}`, html);
  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      await post(endpoint, body);
      toast(`${title} created`);
      closeModal();
      onSuccess();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
