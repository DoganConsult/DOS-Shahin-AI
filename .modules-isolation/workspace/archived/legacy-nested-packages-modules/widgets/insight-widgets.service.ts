import { logger } from '@dos/platform-core/observability';

export async function list(...args: any[]): Promise<any[]> { return []; }
export async function getById(...args: any[]): Promise<any> { return null; }
export async function create(...args: any[]): Promise<any> { return {}; }
export async function update(...args: any[]): Promise<any> { return {}; }
export async function remove(...args: any[]): Promise<void> {}

export const INSIGHT_WIDGET_KEYS = new Set([
  'risk_heatmap', 'compliance_trend', 'incident_summary',
  'audit_progress', 'vendor_risk_overview', 'policy_coverage',
]);
