/**
 * Findings cross-module port.
 *
 * Compliance must NOT directly query the `findings` table — it lives in the
 * Audit module's domain. Per Patch 06 §2.5 + DB-USAGE-INVENTORY §9.
 *
 * Hosts bind a real adapter that proxies to the Audit module's service API.
 * Default returns zeros (fail-safe).
 */

export interface FindingsStats {
  totalFindings: number;
  openFindings: number;     // status NOT IN ('Closed','Resolved')
  overdueFindings: number;  // open AND due_date < NOW()
}

export interface FindingsCountInput {
  tenantId: string;
}

export interface FindingsListInRangeInput {
  tenantId: string;
  fromDate: string; // ISO YYYY-MM-DD
  toDate: string;   // ISO YYYY-MM-DD
}

export interface FindingsCalendarItem {
  findingId: string;
  title?: string;
  severity?: string;
  dueDate?: string | null;
  status?: string;
}

export interface FindingsPort {
  getStats(input: FindingsCountInput): Promise<FindingsStats>;
  /** Returns findings whose due_date falls in [from..to]. Used by compliance calendar. */
  listInDateRange(input: FindingsListInRangeInput): Promise<FindingsCalendarItem[]>;
}

const unboundFindingsStats: FindingsStats = { totalFindings: 0, openFindings: 0, overdueFindings: 0 };

let _impl: FindingsPort = {
  async getStats() { return unboundFindingsStats; },
  async listInDateRange() { return []; },
};

export function bindFindingsPort(impl: Partial<FindingsPort>): void {
  _impl = { ..._impl, ...impl };
}
export function getFindingsPort(): FindingsPort { return _impl; }
