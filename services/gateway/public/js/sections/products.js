import { get, post } from '../api.js';
import { dataTable, statusBadge, loading, emptyState, toast, badge } from '../ui.js';

const BASE = '/api/platform-admin';
let activeTab = 'products';

export async function render(el) {
  el.innerHTML = `<div class="tab-bar">
    <button class="${activeTab === 'products' ? 'active' : ''}" data-tab="products">Products</button>
    <button class="${activeTab === 'modules' ? 'active' : ''}" data-tab="modules">Modules</button>
    <button class="${activeTab === 'activations' ? 'active' : ''}" data-tab="activations">Tenant Activations</button>
  </div><div id="pm-content"></div>`;

  el.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      el.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadTab(el.querySelector('#pm-content'));
    });
  });
  loadTab(el.querySelector('#pm-content'));
}

async function loadTab(c) {
  c.innerHTML = loading();
  try {
    if (activeTab === 'products') await renderProducts(c);
    else if (activeTab === 'modules') await renderModules(c);
    else if (activeTab === 'activations') await renderActivations(c);
  } catch (err) {
    c.innerHTML = emptyState('⚠️', err.message);
  }
}

async function renderProducts(c) {
  const data = await get(`${BASE}/products`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(p =>
    `<tr>
      <td><strong>${p.code}</strong></td>
      <td>${p.name || '-'}</td>
      <td>${statusBadge(p.status || 'enabled')}</td>
      <td>${p.description || '-'}</td>
      <td>
        <button class="btn btn-sm btn-success toggle-product" data-code="${p.code}" data-action="enable">Enable</button>
        <button class="btn btn-sm btn-danger toggle-product" data-code="${p.code}" data-action="disable">Disable</button>
      </td>
    </tr>`
  );
  c.innerHTML = dataTable(`Products (${items.length})`, ['Code', 'Name', 'Status', 'Description', 'Actions'], rows);
  c.querySelectorAll('.toggle-product').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await post(`${BASE}/products/${btn.dataset.code}/${btn.dataset.action}`);
        toast(`Product ${btn.dataset.code} ${btn.dataset.action}d`);
        renderProducts(c);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function renderModules(c) {
  const data = await get(`${BASE}/modules`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(m =>
    `<tr>
      <td><strong>${m.code}</strong></td>
      <td>${m.name || '-'}</td>
      <td>${m.product_code ? badge(m.product_code, 'blue') : '-'}</td>
      <td>${statusBadge(m.status || 'enabled')}</td>
      <td>${m.target_service || '-'}</td>
      <td>
        <button class="btn btn-sm btn-success toggle-module" data-code="${m.code}" data-action="enable">Enable</button>
        <button class="btn btn-sm btn-danger toggle-module" data-code="${m.code}" data-action="disable">Disable</button>
      </td>
    </tr>`
  );
  c.innerHTML = dataTable(`Modules (${items.length})`, ['Code', 'Name', 'Product', 'Status', 'Service', 'Actions'], rows);
  c.querySelectorAll('.toggle-module').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await post(`${BASE}/modules/${btn.dataset.code}/${btn.dataset.action}`);
        toast(`Module ${btn.dataset.code} ${btn.dataset.action}d`);
        renderModules(c);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function renderActivations(c) {
  const data = await get(`${BASE}/tenant-activations`);
  const items = Array.isArray(data) ? data : [];
  const rows = items.map(a =>
    `<tr>
      <td>${a.tenant_id?.slice(0, 8) || '-'}</td>
      <td><strong>${a.product_code}</strong></td>
      <td>${statusBadge(a.status || 'active')}</td>
      <td>${a.activated_at ? new Date(a.activated_at).toLocaleDateString() : '-'}</td>
    </tr>`
  );
  c.innerHTML = dataTable(`Tenant Product Activations (${items.length})`, ['Tenant', 'Product', 'Status', 'Activated'], rows);
}
