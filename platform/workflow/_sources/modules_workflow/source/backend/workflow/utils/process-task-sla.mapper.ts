/**
 * Adds `sla_due_at` and `sla_status` to process_tasks API rows for list/detail consumers.
 * `due_date` remains the canonical DB column; `sla_due_at` mirrors it for API clarity (TOP-10).
 */
export type SlaStatus = 'on_track' | 'at_risk' | 'overdue' | 'unknown';

export function enrichProcessTaskRow<T extends Record<string, unknown>>(row: T): T & {
  sla_due_at: string | Date | null;
  sla_status: SlaStatus;
} {
  const due = row.due_date as Date | string | null | undefined;
  const breached = row.breached_at != null;
  let sla_status: SlaStatus = 'unknown';

  if (due) {
    const d = typeof due === 'string' ? new Date(due) : due;
    const t = d.getTime();
    if (Number.isNaN(t)) {
      sla_status = breached ? 'overdue' : 'unknown';
    } else {
      const now = Date.now();
      if (breached || t < now) sla_status = 'overdue';
      else if (t - now <= 24 * 60 * 60 * 1000) sla_status = 'at_risk';
      else sla_status = 'on_track';
    }
  } else {
    sla_status = breached ? 'overdue' : 'on_track';
  }

  return {
    ...row,
    sla_due_at: due ?? null,
    sla_status,
  };
}
