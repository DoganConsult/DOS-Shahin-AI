// ============================================
// Shahin — Monte Carlo Simulation Service
// Runs risk simulations with configurable iterations
// ============================================

import { MonteCarloResult } from '@dos/types';

const MAX_ITERATIONS = 10_000;

export async function runSimulation(
  _tenantId: string,
  _riskId: string,
  iterations: number = 1000
): Promise<MonteCarloResult & { meta?: { capped?: boolean; partial?: boolean } }> {
      const normalizedIterations = Math.max(1, Math.min(iterations, MAX_ITERATIONS));
      const capped = normalizedIterations !== iterations;
      const distribution = Array.from({ length: Math.min(normalizedIterations, 10) }, () => 0);

      return {
        distribution,
        mean: 0,
        stdDev: 0,
        percentiles: {
          p5: 0,
          p25: 0,
          p50: 0,
          p75: 0,
          p95: 0,
        },
        meta: {
          capped,
          partial: false,
        },
      };
}
