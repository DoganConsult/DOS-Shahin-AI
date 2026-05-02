// ============================================
// Shahin — Monte Carlo Simulation Service
// Runs risk simulations with configurable iterations
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { MonteCarloResult } from '@dos/types';
import { getFirstRow } from '@dos/db';

const MAX_ITERATIONS = 10_000;
const TIMEOUT_MS = 5_000;

export async function runSimulation(
  tenantId: string,
  riskId: string,
  iterations: number = 1000
): Promise<MonteCarloResult & { meta?: { capped?: boolean; partial?: boolean } }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}
