import { get, probe } from '../api.js';
import { statsGrid, badge, cockpitWidget, progressBar, activityItem, fmtDate, statusBadge } from '../ui.js';

export async function render(el) {
  el.innerHTML = '<div class="loading">Loading platform cockpit...</div>';

  const [overview, healthRes, workspace, events, activity] = await Promise.all([
    get('/api/platform-admin/overview').catch(() => null),
    probe('/health'),
    get('/api/tenants/workspace-home').catch(() => null),
    get('/api/platform-admin/system-events?limit=5').catch(() => []),
    get('/api/tenants/workspace-home/recent-activity').catch(() => ({ activities: [] })),
  ]);

  const stats = [
    { label: 'Tenants', value: overview?.tenants ?? '-', sub: 'Active organizations', up: true },
    { label: 'Workspaces', value: overview?.workspaces ?? '-', sub: 'Provisioned workspaces' },
    { label: 'Users', value: overview?.actors ?? '-', sub: 'Platform actors' },
    { label: 'Access Profiles', value: overview?.accessProfiles ?? '-', sub: 'RBAC profiles' },
    { label: 'Functional Roles', value: overview?.functionalRoles ?? '-', sub: 'Role definitions' },
    { label: 'Permissions', value: overview?.permissions ?? '-', sub: 'Permission entries' },
    { label: 'Platform Services', value: 30, sub: '8 platform + 22 product', up: true },
    { label: 'Gateway', value: healthRes.ok ? '\u25CF Online' : '\u25CB Offline', sub: healthRes.ok ? 'Healthy' : 'Unreachable', up: healthRes.ok },
  ];

  let cockpitHtml = '';

  if (workspace) {
    const riskTotal = workspace.risks?.total ?? 0;
    const riskOpen = workspace.risks?.open ?? 0;
    const ctrlTotal = workspace.controls?.total ?? 0;
    const ctrlEffective = workspace.controls?.effective ?? 0;
    const polTotal = workspace.policies?.total ?? 0;
    const polApproved = workspace.policies?.approved ?? 0;
    const incTotal = workspace.incidents?.total ?? 0;
    const incOpen = workspace.incidents?.open ?? 0;
    const taskTotal = workspace.tasks?.total ?? 0;
    const taskDone = workspace.tasks?.completed ?? 0;

    const compliancePct = ctrlTotal > 0 ? Math.round((ctrlEffective / ctrlTotal) * 100) : 0;
    const policyPct = polTotal > 0 ? Math.round((polApproved / polTotal) * 100) : 0;
    const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

    cockpitHtml += cockpitWidget('Compliance Score', `
      <div class="widget-value" style="color:var(${compliancePct >= 80 ? '--success' : compliancePct >= 50 ? '--warning' : '--danger'})">${compliancePct}%</div>
      <div class="widget-sub">${ctrlEffective} of ${ctrlTotal} controls effective</div>
      ${progressBar(compliancePct, compliancePct >= 80 ? 'green' : compliancePct >= 50 ? 'yellow' : 'red')}
    `, 'accent');

    cockpitHtml += cockpitWidget('Critical Risks', `
      <div class="widget-value" style="color:var(${riskOpen > 0 ? '--danger' : '--success'})">${riskOpen}</div>
      <div class="widget-sub">Open risks out of ${riskTotal} total</div>
      ${progressBar(riskTotal > 0 ? Math.round(((riskTotal - riskOpen) / riskTotal) * 100) : 100, riskOpen > 0 ? 'red' : 'green')}
    `, riskOpen > 0 ? 'danger' : 'ok');

    cockpitHtml += cockpitWidget('Policy Health', `
      <div class="widget-value">${policyPct}%</div>
      <div class="widget-sub">${polApproved} of ${polTotal} policies approved</div>
      ${progressBar(policyPct, policyPct >= 80 ? 'green' : 'yellow')}
    `, 'accent');

    cockpitHtml += cockpitWidget('Open Incidents', `
      <div class="widget-value" style="color:var(${incOpen > 0 ? '--warning' : '--success'})">${incOpen}</div>
      <div class="widget-sub">${incTotal} total incidents tracked</div>
    `, incOpen > 0 ? 'warn' : 'ok');

    cockpitHtml += cockpitWidget('Remediation Progress', `
      <div class="widget-value">${taskPct}%</div>
      <div class="widget-sub">${taskDone} of ${taskTotal} tasks completed</div>
      ${progressBar(taskPct, taskPct >= 80 ? 'green' : 'yellow')}
    `, 'accent');
  } else {
    cockpitHtml += cockpitWidget('Workspace Health', `
      <div class="widget-sub">Workspace data not available. Ensure a tenant is provisioned.</div>
    `, 'warn');
  }

  const eventItems = Array.isArray(events) ? events : [];
  if (eventItems.length > 0) {
    const evList = eventItems.map(e => {
      const sevColor = { critical: 'red', high: 'red', warning: 'yellow', info: 'blue' }[e.severity] || 'gray';
      return `<li>${badge(e.severity || 'info', sevColor)} ${e.event_type || '-'} <span style="color:var(--text-muted);font-size:.75rem">${e.source || ''}</span></li>`;
    }).join('');
    cockpitHtml += cockpitWidget('Recent System Events', `<ul class="widget-list">${evList}</ul>`, 'accent');
  }

  const acts = activity?.activities || [];
  let activityHtml = '';
  if (acts.length > 0) {
    activityHtml = acts.slice(0, 8).map(a =>
      activityItem('\u{1F4DD}', a.action || a.event_type || a.description || '-', fmtDate(a.timestamp || a.created_at))
    ).join('');
  } else {
    activityHtml = '<div class="widget-sub">No recent activity</div>';
  }
  cockpitHtml += cockpitWidget('Activity Feed', activityHtml, 'accent');

  el.innerHTML = statsGrid(stats)
    + '<div class="cockpit-grid">' + cockpitHtml + '</div>';
}
