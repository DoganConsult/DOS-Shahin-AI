/**
 * Gateway public-JS API client.
 *
 * Auth model: ONE source of truth = the httpOnly cookie issued by
 * platform/dauth/services/auth-service. This client never reads, stores,
 * or injects tokens. The browser sends the cookie automatically on
 * same-origin requests because every fetch sets `credentials: 'include'`.
 *
 * If a request returns 401, the user's session is gone — redirect to
 * /login so DAuth can rehydrate the cookie via OIDC.
 */

const API = window.location.origin;

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

function bailOn401(res) {
  if (res.status !== 401) return;
  // Cookie is missing or expired. Drop the user at /login so the
  // canonical OIDC flow can issue a fresh httpOnly session cookie.
  window.location.assign('/login');
  throw new Error('Session expired');
}

async function readJsonOrEmpty(res) {
  try { return await res.json(); }
  catch { return {}; }
}

export async function get(path) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  });
  bailOn401(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: jsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  bailOn401(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function patch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  bailOn401(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function put(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  bailOn401(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function del(path) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  });
  bailOn401(res);
  const data = await readJsonOrEmpty(res);
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function probe(path) {
  try {
    const res = await fetch(`${API}${path}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
