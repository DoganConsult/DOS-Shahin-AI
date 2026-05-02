export type PrimeSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export const STATUS_SEVERITY_MAP: Record<string, PrimeSeverity> = {
  // Success states
  'approved': 'success', 'active': 'success', 'resolved': 'success',
  'completed': 'success', 'closed': 'success', 'low': 'success',
  // Danger states
  'critical': 'danger', 'high': 'danger',
  // Warning states
  'pending': 'warning', 'draft': 'warning', 'medium': 'warning',
  'mitigating': 'warning', 'investigating': 'warning', 'in_progress': 'warning',
  // Info states
  'reported': 'info', 'open': 'info',
  // Neutral
  'unrated': 'secondary',
};

export function getStatusSeverity(status: string): PrimeSeverity {
  return STATUS_SEVERITY_MAP[status?.toLowerCase()] || 'info';
}
