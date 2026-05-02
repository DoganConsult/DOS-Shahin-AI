import { get, post } from '../api.js';
import { dataTable, statusBadge, fmtDate, loading, emptyState, badge, toast, openModal, closeModal, formGroup } from '../ui.js';

let activeTab = 'users';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
    <button class="${activeTab === 'access' ? 'active' : ''}" data-tab="access">User Access</button>
  </div><div id="users-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#users-content'));
    });
  });
  loadTab(el.querySelector('#users-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'users') await renderUsers(c);
    else if (activeTab === 'access') await renderUserAccess(c);
  } catch (err) { c.innerHTML = emptyState('\u26A0\uFE0F', err.message); }
}

async function renderUsers(c) {
  const raw = await get('/api/users');
  const users = Array.isArray(raw) ? raw : (raw.users || raw.data || []);
  if (!users.length) { c.innerHTML = emptyState('\u{1F465}', 'No users found'); return; }
  const rows = users.map(u =>
    `<tr>
      <td><strong>${u.name || u.full_name || u.email}</strong></td>
      <td>${u.email || '-'}</td>
      <td>${u.role || u.access_profile || '-'}</td>
      <td>${statusBadge(u.status || 'active')}</td>
      <td>${u.tenant_id ? badge(u.tenant_id.slice(0, 8), 'blue') : '-'}</td>
      <td>${fmtDate(u.created_at)}</td>
      <td>${fmtDate(u.last_login_at || u.last_login)}</td>
      <td><button class="btn btn-sm btn-outline view-access" data-uid="${u.user_id || u.id}">Access</button></td>
    </tr>`
  );
  c.innerHTML = dataTable(`Users (${users.length})`, ['Name', 'Email', 'Role', 'Status', 'Tenant', 'Created', 'Last Login', ''], rows);
  c.querySelectorAll('.view-access').forEach(btn => {
    btn.addEventListener('click', () => showUserAccess(btn.dataset.uid));
  });
}

async function showUserAccess(userId) {
  if (!userId || userId === 'undefined') { toast('No user ID', 'error'); return; }
  try {
    const data = await get(`/api/platform-admin/user-access/${userId}`);
    const profiles = data.profiles || [];
    const roles = data.roles || [];
    const delegations = data.delegations || [];

    let html = `<h4 style="margin-bottom:.75rem">Profiles (${profiles.length})</h4>`;
    if (profiles.length) {
      html += `<ul class="kv-list">${profiles.map(p => `<li><span class="kv-key">${p.code}</span><span class="kv-val">${p.name}</span></li>`).join('')}</ul>`;
    } else { html += '<p style="color:var(--text-muted);font-size:.85rem">No profiles assigned</p>'; }

    html += `<h4 style="margin:.75rem 0">Roles (${roles.length})</h4>`;
    if (roles.length) {
      html += `<ul class="kv-list">${roles.map(r => `<li><span class="kv-key">${r.code}</span><span class="kv-val">${r.name} ${r.scope ? badge(r.scope, 'blue') : ''}</span></li>`).join('')}</ul>`;
    } else { html += '<p style="color:var(--text-muted);font-size:.85rem">No roles assigned</p>'; }

    html += `<h4 style="margin:.75rem 0">Delegations (${delegations.length})</h4>`;
    if (delegations.length) {
      html += `<ul class="kv-list">${delegations.map(d => `<li><span class="kv-key">${d.permission_scope || 'all'}</span><span class="kv-val">${statusBadge(d.status)}</span></li>`).join('')}</ul>`;
    } else { html += '<p style="color:var(--text-muted);font-size:.85rem">No active delegations</p>'; }

    html += `<div style="margin-top:1rem;display:flex;gap:.5rem">
      <button class="btn btn-sm btn-primary" id="assign-profile-btn">Assign Profile</button>
      <button class="btn btn-sm btn-primary" id="assign-role-btn">Assign Role</button>
    </div>`;

    openModal(`User Access: ${userId.slice(0, 8)}`, html);

    document.getElementById('assign-profile-btn')?.addEventListener('click', () => showAssignProfile(userId));
    document.getElementById('assign-role-btn')?.addEventListener('click', () => showAssignRole(userId));
  } catch (err) { toast(err.message, 'error'); }
}

async function showAssignProfile(userId) {
  const profiles = await get('/api/platform-admin/access-profiles').catch(() => []);
  const items = Array.isArray(profiles) ? profiles : [];
  const opts = items.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }));
  const html = `<form id="assign-form">
    ${formGroup('Access Profile', 'access_profile_id', 'select', { required: true, options: opts })}
    <button type="submit" class="btn btn-primary btn-full">Assign Profile</button>
  </form>`;
  openModal('Assign Access Profile', html);
  document.getElementById('assign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await post(`/api/platform-admin/user-access/${userId}/profiles`, { access_profile_id: fd.get('access_profile_id') });
      toast('Profile assigned');
      closeModal();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function showAssignRole(userId) {
  const roles = await get('/api/platform-admin/functional-roles').catch(() => []);
  const items = Array.isArray(roles) ? roles : [];
  const opts = items.map(r => ({ value: r.id, label: `${r.code} - ${r.name}` }));
  const html = `<form id="assign-form">
    ${formGroup('Functional Role', 'functional_role_id', 'select', { required: true, options: opts })}
    ${formGroup('Scope', 'scope', 'text', { placeholder: 'e.g. tenant:*, module:risk' })}
    ${formGroup('Authority Level', 'authority_level', 'text', { placeholder: 'e.g. owner, reviewer' })}
    <button type="submit" class="btn btn-primary btn-full">Assign Role</button>
  </form>`;
  openModal('Assign Functional Role', html);
  document.getElementById('assign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await post(`/api/platform-admin/user-access/${userId}/roles`, Object.fromEntries(fd.entries()));
      toast('Role assigned');
      closeModal();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function renderUserAccess(c) {
  c.innerHTML = `<div class="card">
    <h3>Lookup User Access</h3>
    <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1rem">Enter a user ID to view their assigned profiles, roles, and delegations.</p>
    <div style="display:flex;gap:.5rem">
      <input type="text" id="access-uid" class="search-input" style="margin:0;flex:1" placeholder="User UUID">
      <button class="btn btn-primary" id="access-lookup-btn">Lookup</button>
    </div>
  </div><div id="access-result"></div>`;
  c.querySelector('#access-lookup-btn').addEventListener('click', () => {
    const uid = c.querySelector('#access-uid').value.trim();
    if (uid) showUserAccess(uid);
  });
}
