import { dataTable, statusBadge } from '../ui.js';

const ALL_SERVICES = [
  { code: 'gateway', port: 4000, layer: 'Platform', mods: ['proxy', 'health', 'swagger'] },
  { code: 'auth-service', port: 4001, layer: 'Platform', mods: ['auth', 'identity', 'session', 'mfa', 'sod', 'delegation'] },
  { code: 'tenant-service', port: 4002, layer: 'Platform', mods: ['tenant', 'config', 'provisioning', 'platform-admin', 'navigation'] },
  { code: 'user-service', port: 4003, layer: 'Platform', mods: ['user', 'person', 'profile', 'org-hierarchy', 'committees'] },
  { code: 'workflow-service', port: 4004, layer: 'Platform', mods: ['workflow', 'approval'] },
  { code: 'notification-service', port: 4005, layer: 'Platform', mods: ['notification'] },
  { code: 'audit-service', port: 4006, layer: 'Platform', mods: ['audit-core'] },
  { code: 'ai-gateway-service', port: 4007, layer: 'Platform', mods: ['ai', 'ai-governance', 'mcp', 'knowledge'] },
  { code: 'onboarding-service', port: 4010, layer: 'Product', mods: ['onboarding', 'journey'] },
  { code: 'governance-policy-service', port: 4011, layer: 'Product', mods: ['governance', 'policy', 'exceptions'] },
  { code: 'compliance-controls-service', port: 4012, layer: 'Product', mods: ['compliance', 'controls', 'frameworks', 'attestation'] },
  { code: 'risk-incident-service', port: 4013, layer: 'Product', mods: ['risk', 'incident', 'risk-scoring'] },
  { code: 'evidence-audit-reporting-service', port: 4014, layer: 'Product', mods: ['evidence', 'audit', 'reporting'] },
  { code: 'vendor-service', port: 4015, layer: 'Product', mods: ['vendor', 'vendor-risk'] },
  { code: 'asset-service', port: 4016, layer: 'Product', mods: ['assets'] },
  { code: 'bcp-service', port: 4017, layer: 'Product', mods: ['bcp', 'bcm-advanced'] },
  { code: 'training-service', port: 4018, layer: 'Product', mods: ['training'] },
  { code: 'privacy-service', port: 4019, layer: 'Product', mods: ['privacy', 'dpia'] },
  { code: 'dora-service', port: 4020, layer: 'Product', mods: ['dora'] },
  { code: 'remediation-action-service', port: 4021, layer: 'Product', mods: ['remediation', 'action', 'issues', 'playbooks'] },
  { code: 'qiyas-journey-service', port: 4022, layer: 'Product', mods: ['qiyas', 'journey', 'benchmarks'] },
  { code: 'dashboard-widgets-service', port: 4023, layer: 'Product', mods: ['dashboard', 'widgets'] },
  { code: 'analytics-service', port: 4024, layer: 'Product', mods: ['analytics', 'grc-query'] },
  { code: 'executive-intelligence-service', port: 4025, layer: 'Product', mods: ['executive', 'proactive-leadership'] },
  { code: 'integrations-service', port: 4026, layer: 'Product', mods: ['integrations', 'fitch'] },
  { code: 'notification-inbox-service', port: 4027, layer: 'Product', mods: ['inbox'] },
  { code: 'portals-service', port: 4028, layer: 'Product', mods: ['portals'] },
  { code: 'records-service', port: 4029, layer: 'Product', mods: ['records'] },
  { code: 'platform-product-service', port: 4030, layer: 'Product', mods: ['team', 'packs', 'operating-cockpit', 'mobile'] },
  { code: 'agrc-os-service', port: 4031, layer: 'Product', mods: ['agrc-os'] },
];

export async function render(el) {
  const rows = ALL_SERVICES.map(s =>
    `<tr>
      <td><strong>${s.code}</strong></td>
      <td>${s.port}</td>
      <td>${s.layer === 'Platform' ? '<span class="badge-pill badge-blue">Platform</span>' : '<span class="badge-pill badge-gray">Product</span>'}</td>
      <td>${s.mods.join(', ')}</td>
      <td>${statusBadge('Registered')}</td>
    </tr>`
  );
  el.innerHTML = dataTable(`All Services (${ALL_SERVICES.length})`, ['Service', 'Port', 'Layer', 'Modules', 'Status'], rows);
}
