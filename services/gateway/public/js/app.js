import { get, post, getToken, setToken } from './api.js';
import { closeModal } from './ui.js';
import { render as renderOverview } from './sections/overview.js';
import { render as renderServices } from './sections/services.js';
import { render as renderTenants } from './sections/tenants.js';
import { render as renderUsers } from './sections/users.js';
import { render as renderRbac } from './sections/rbac.js';
import { render as renderProducts } from './sections/products.js';
import { render as renderConfig } from './sections/config.js';
import { render as renderAudit } from './sections/audit.js';
import { render as renderHealth } from './sections/health.js';
import { render as renderAi } from './sections/ai.js';
import { render as renderDauth } from './sections/dauth.js';
import { render as renderGovernance } from './sections/governance.js';

const NAV = [
  { label: 'Platform', labelAr: '\u0627\u0644\u0645\u0646\u0635\u0629', divider: true },
  { section: 'overview', icon: '\u{1F4CA}', label: 'Dashboard', labelAr: '\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645' },
  { section: 'services', icon: '\u{1F527}', label: 'Services', labelAr: '\u0627\u0644\u062E\u062F\u0645\u0627\u062A' },
  { section: 'tenants', icon: '\u{1F3E2}', label: 'Tenants & Workspaces', labelAr: '\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646' },
  { section: 'health', icon: '\u{1F49A}', label: 'System Health', labelAr: '\u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645' },
  { label: 'Identity & Access', labelAr: '\u0627\u0644\u0647\u0648\u064A\u0629 \u0648\u0627\u0644\u0648\u0635\u0648\u0644', divider: true },
  { section: 'users', icon: '\u{1F465}', label: 'Users', labelAr: '\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646' },
  { section: 'rbac', icon: '\u{1F510}', label: 'Roles & Permissions', labelAr: '\u0627\u0644\u0623\u062F\u0648\u0627\u0631 \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A' },
  { section: 'dauth', icon: '\u{1F6E1}\uFE0F', label: 'DAuth Admin', labelAr: '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629' },
  { label: 'Registry', labelAr: '\u0627\u0644\u0633\u062C\u0644', divider: true },
  { section: 'products', icon: '\u{1F4E6}', label: 'Products & Modules', labelAr: '\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A' },
  { section: 'config', icon: '\u2699\uFE0F', label: 'Configuration', labelAr: '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A' },
  { section: 'flags', icon: '\u{1F6A9}', label: 'Feature Flags', labelAr: '\u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u062A' },
  { label: 'Intelligence', labelAr: '\u0627\u0644\u0630\u0643\u0627\u0621', divider: true },
  { section: 'ai', icon: '\u{1F916}', label: 'AI Registry', labelAr: '\u0633\u062C\u0644 \u0627\u0644\u0630\u0643\u0627\u0621' },
  { section: 'governance', icon: '\u{1F3DB}\uFE0F', label: 'Governance Matrix', labelAr: '\u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062D\u0648\u0643\u0645\u0629' },
  { label: 'Observability', labelAr: '\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629', divider: true },
  { section: 'audit', icon: '\u{1F4CB}', label: 'Audit & Events', labelAr: '\u0627\u0644\u062A\u062F\u0642\u064A\u0642' },
];

const SECTIONS = {
  overview: { title: 'Platform Dashboard', titleAr: '\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645', render: renderOverview },
  services: { title: 'Service Registry', titleAr: '\u0633\u062C\u0644 \u0627\u0644\u062E\u062F\u0645\u0627\u062A', render: renderServices },
  tenants: { title: 'Tenants & Workspaces', titleAr: '\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646 \u0648\u0627\u0644\u0645\u0633\u0627\u062D\u0627\u062A', render: renderTenants },
  users: { title: 'User Management', titleAr: '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646', render: renderUsers },
  rbac: { title: 'Roles & Permissions', titleAr: '\u0627\u0644\u0623\u062F\u0648\u0627\u0631 \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A', render: renderRbac },
  products: { title: 'Products & Modules', titleAr: '\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0648\u062D\u062F\u0627\u062A', render: renderProducts },
  config: { title: 'Platform Configuration', titleAr: '\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629', render: renderConfig },
  flags: { title: 'Feature Flags', titleAr: '\u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u062A', render: renderConfig },
  audit: { title: 'Audit & Events', titleAr: '\u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0648\u0627\u0644\u0623\u062D\u062F\u0627\u062B', render: renderAudit },
  health: { title: 'System Health', titleAr: '\u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645', render: renderHealth },
  ai: { title: 'AI Registry', titleAr: '\u0633\u062C\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A', render: renderAi },
  dauth: { title: 'DAuth Administration', titleAr: '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629', render: renderDauth },
  governance: { title: 'Governance Matrix', titleAr: '\u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062D\u0648\u0643\u0645\u0629', render: renderGovernance },
};

let currentUser = null;
let currentSection = 'overview';
let pendingMfaUserId = null;
let pendingMfaType = null;

function isAr() { return document.documentElement.lang === 'ar'; }

function showCard(cardId) {
  ['login-card', 'mfa-card', 'forgot-card', 'reset-card'].forEach(id => {
    document.getElementById(id).style.display = id === cardId ? '' : 'none';
  });
}

function buildNav() {
  const nav = document.getElementById('sidebar-nav');
  const seen = new Set();
  let html = '';
  for (const item of NAV) {
    if (item.divider) {
      const lbl = isAr() ? item.labelAr : item.label;
      html += `<div class="section-label">${lbl}</div>`;
      continue;
    }
    if (!item.section || seen.has(item.section)) continue;
    seen.add(item.section);
    const lbl = isAr() ? (item.labelAr || item.label) : item.label;
    html += `<a data-section="${item.section}" data-search="${item.label.toLowerCase()}">${item.icon} ${lbl}</a>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll('a[data-section]').forEach(a => {
    a.addEventListener('click', () => showSection(a.dataset.section));
  });
}

function filterNav(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(a => {
    const match = !q || a.dataset.search.includes(q) || a.textContent.toLowerCase().includes(q);
    a.classList.toggle('hidden', !match);
  });
}

async function showSection(section) {
  const s = SECTIONS[section];
  if (!s) return;
  currentSection = section;
  document.querySelectorAll('.sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.section === section));
  document.getElementById('section-title').textContent = isAr() ? s.titleAr : s.title;
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading">Loading...</div>';
  try { await s.render(area); }
  catch (err) { area.innerHTML = `<div class="card"><h3>Error</h3><p style="color:var(--danger)">${err.message}</p></div>`; }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = isAr() ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062F\u062E\u0648\u0644...' : 'Signing in...';
  errEl.classList.remove('show');
  try {
    const res = await fetch(`${window.location.origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed');

    if (data.mfaRequired || data.data?.mfaRequired) {
      const mfa = data.data || data;
      pendingMfaUserId = mfa.userId;
      pendingMfaType = mfa.mfaType || 'email';
      const subtitle = pendingMfaType === 'totp'
        ? (isAr() ? '\u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0645\u0632 \u0645\u0646 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629' : 'Enter the code from your authenticator app.')
        : (isAr() ? '\u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A' : 'Enter the 6-digit code sent to your email.');
      document.getElementById('mfa-subtitle').textContent = subtitle;
      document.getElementById('mfa-code').value = '';
      document.getElementById('mfa-error').classList.remove('show');
      showCard('mfa-card');
      document.getElementById('mfa-code').focus();
      return;
    }

    if (data.mustChangePassword || data.data?.mustChangePassword) {
      errEl.textContent = isAr() ? '\u064A\u062C\u0628 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'You must change your password before continuing.';
      errEl.classList.add('show');
      return;
    }

    const token = data.data?.accessToken || data.accessToken || data.token || data.data?.token;
    if (!token) throw new Error('No token received');
    setToken(token);
    currentUser = data.data?.user || data.user || { email, name: data.userName || email, role: data.role || 'admin' };
    enterDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = isAr() ? '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644' : 'Sign In';
  }
}

async function handleMfaVerify(e) {
  e.preventDefault();
  const code = document.getElementById('mfa-code').value.trim();
  const btn = document.getElementById('mfa-btn');
  const errEl = document.getElementById('mfa-error');
  if (!code || code.length < 4) { errEl.textContent = 'Enter a valid code'; errEl.classList.add('show'); return; }
  btn.disabled = true;
  btn.textContent = isAr() ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0642\u0642...' : 'Verifying...';
  errEl.classList.remove('show');
  try {
    const res = await fetch(`${window.location.origin}/api/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pendingMfaUserId, code, mfaType: pendingMfaType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Verification failed');
    const token = data.data?.accessToken || data.accessToken || data.token || data.data?.token;
    if (!token) throw new Error('No token received after MFA');
    setToken(token);
    currentUser = data.data?.user || data.user || { email: '', name: data.userName || '', role: data.role || 'admin' };
    pendingMfaUserId = null;
    pendingMfaType = null;
    showCard('login-card');
    enterDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = isAr() ? '\u062A\u062D\u0642\u0642' : 'Verify';
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const btn = document.getElementById('forgot-btn');
  const errEl = document.getElementById('forgot-error');
  const okEl = document.getElementById('forgot-success');
  btn.disabled = true;
  errEl.classList.remove('show');
  okEl.classList.remove('show');
  try {
    const res = await fetch(`${window.location.origin}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    okEl.textContent = isAr()
      ? '\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0648\u062C\u0648\u062F\u0627\u064B \u0641\u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646.'
      : 'If the email exists, a reset link has been sent. Check your inbox.';
    okEl.classList.add('show');
    showCard('reset-card');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally { btn.disabled = false; }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const token = document.getElementById('reset-token').value.trim();
  const pw = document.getElementById('reset-password').value;
  const confirm = document.getElementById('reset-confirm').value;
  const btn = document.getElementById('reset-btn');
  const errEl = document.getElementById('reset-error');
  const okEl = document.getElementById('reset-success');
  errEl.classList.remove('show');
  okEl.classList.remove('show');
  if (pw !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.classList.add('show'); return; }
  if (pw.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.add('show'); return; }
  btn.disabled = true;
  try {
    const res = await fetch(`${window.location.origin}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: pw }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Reset failed');
    okEl.textContent = isAr()
      ? '\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064A\u0645\u0643\u0646\u0643 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0622\u0646.'
      : 'Password reset successfully. You can now sign in.';
    okEl.classList.add('show');
    setTimeout(() => showCard('login-card'), 3000);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally { btn.disabled = false; }
}

function handleLogout() {
  setToken(null);
  currentUser = null;
  document.getElementById('login-view').style.display = '';
  document.getElementById('dashboard-view').classList.remove('active');
  showCard('login-card');
}

async function enterDashboard() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').classList.add('active');
  if (!currentUser) {
    try { currentUser = await get('/api/auth/me'); } catch {}
  }
  if (currentUser) {
    const name = currentUser.name || currentUser.email || 'Admin';
    const role = currentUser.role || currentUser.access_profile || 'Platform Admin';
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role').textContent = role;
    document.getElementById('user-avatar').textContent = name[0].toUpperCase();
    document.getElementById('tenant-label').textContent = currentUser.tenant_name || currentUser.org_name || '';
    document.getElementById('ws-name').textContent = currentUser.workspace_name || 'Default';
  }
  loadAlertCount();
  buildNav();
  showSection('overview');
}

async function loadAlertCount() {
  try {
    const data = await get('/api/platform-admin/system-events?limit=10');
    const items = Array.isArray(data) ? data : [];
    const critical = items.filter(e => e.severity === 'critical' || e.severity === 'high').length;
    const badge = document.getElementById('alert-count');
    if (critical > 0) { badge.textContent = critical; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  } catch { document.getElementById('alert-count').style.display = 'none'; }
}

function toggleLang() {
  const lang = document.documentElement.lang === 'en' ? 'ar' : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('lang-btn').textContent = lang === 'ar' ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064A\u0629';
  document.getElementById('login-title').textContent = lang === 'ar'
    ? '\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0627\u0644\u0645\u0646\u0635\u0629' : 'Platform Admin Login';
  document.getElementById('login-subtitle').textContent = lang === 'ar'
    ? '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0625\u062F\u0627\u0631\u0629 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646 \u0648\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.'
    : 'Sign in to manage platform services, tenants, and configuration.';
  document.getElementById('mfa-title').textContent = lang === 'ar' ? '\u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629' : 'Two-Factor Authentication';
  document.getElementById('forgot-title').textContent = lang === 'ar' ? '\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Reset Password';
  document.getElementById('reset-title').textContent = lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629' : 'Set New Password';
  document.getElementById('nav-search').placeholder = lang === 'ar' ? '\u0628\u062D\u062B...' : 'Search...';
  buildNav();
  if (currentSection) {
    const s = SECTIONS[currentSection];
    if (s) document.getElementById('section-title').textContent = lang === 'ar' ? s.titleAr : s.title;
  }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('mfa-form').addEventListener('submit', handleMfaVerify);
document.getElementById('forgot-form').addEventListener('submit', handleForgotPassword);
document.getElementById('reset-form').addEventListener('submit', handleResetPassword);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('lang-btn').addEventListener('click', toggleLang);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('nav-search').addEventListener('input', (e) => filterNav(e.target.value));
document.getElementById('alerts-bell').addEventListener('click', () => showSection('audit'));
document.getElementById('forgot-link').addEventListener('click', (e) => { e.preventDefault(); showCard('forgot-card'); });
document.getElementById('forgot-back-link').addEventListener('click', (e) => { e.preventDefault(); showCard('login-card'); });
document.getElementById('reset-back-link').addEventListener('click', (e) => { e.preventDefault(); showCard('login-card'); });
document.getElementById('mfa-back-link').addEventListener('click', (e) => { e.preventDefault(); pendingMfaUserId = null; showCard('login-card'); });

if (getToken()) enterDashboard();
