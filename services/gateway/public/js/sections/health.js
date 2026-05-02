import { probe } from '../api.js';
import { statsGrid, badge } from '../ui.js';

const SERVICES = [
  { name: 'Gateway', port: 4000, path: '/health' },
  { name: 'Auth Service', port: 4001, path: '/health' },
  { name: 'Tenant Service', port: 4002, path: '/health' },
  { name: 'User Service', port: 4003, path: '/health' },
  { name: 'Workflow Service', port: 4004, path: '/health' },
  { name: 'Notification Service', port: 4005, path: '/health' },
  { name: 'Audit Service', port: 4006, path: '/health' },
  { name: 'AI Gateway', port: 4007, path: '/health' },
];

export async function render(el) {
  el.innerHTML = '<div class="stat-grid" id="health-grid"></div>';
  const grid = el.querySelector('#health-grid');

  for (const svc of SERVICES) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<div class="stat-label">${svc.name}</div><div class="stat-value" style="font-size:1rem">Checking...</div><div class="stat-sub">Port ${svc.port}</div>`;
    grid.appendChild(card);
  }

  const results = await Promise.all(SERVICES.map(svc => probe(svc.path)));

  const cards = grid.querySelectorAll('.stat-card');
  results.forEach((r, i) => {
    const valEl = cards[i].querySelector('.stat-value');
    const subEl = cards[i].querySelector('.stat-sub');
    if (r.ok) {
      const svcName = r.data?.service || r.data?.name || 'OK';
      valEl.innerHTML = `<span style="color:var(--success)">●</span> ${svcName}`;
      subEl.innerHTML = `Port ${SERVICES[i].port} — ${badge('Healthy', 'green')}`;
    } else {
      valEl.innerHTML = `<span style="color:var(--text-muted)">○</span> Unreachable`;
      subEl.innerHTML = `Port ${SERVICES[i].port} — ${badge('Offline', 'red')}`;
    }
  });

  const healthy = results.filter(r => r.ok).length;
  const summary = document.createElement('div');
  summary.className = 'card';
  summary.style.marginTop = '1.5rem';
  summary.innerHTML = `<h3>Health Summary</h3>
    <p style="color:var(--text-muted);font-size:.85rem;margin-top:.5rem">
      ${badge(`${healthy}/${SERVICES.length} Healthy`, healthy === SERVICES.length ? 'green' : 'yellow')}
      &nbsp; checked at ${new Date().toLocaleTimeString()}
    </p>`;
  el.appendChild(summary);
}
