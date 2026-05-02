export interface BatteryResult {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  score: number;
  failures: Array<{ testCase: string; reason: string }>;
}

export interface Verdict {
  passed: boolean;
  overallScore: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalTests: number;
  batteryScores: Record<string, number>;
  failedBatteries: string[];
}

export function computeVerdict(results: BatteryResult[], passingThreshold = 0.8): Verdict {
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);

  const overallScore = totalTests > 0 ? totalPassed / totalTests : 1;
  const batteryScores: Record<string, number> = {};
  const failedBatteries: string[] = [];

  for (const result of results) {
    batteryScores[result.name] = result.score;
    if (result.score < passingThreshold) {
      failedBatteries.push(result.name);
    }
  }

  return {
    passed: overallScore >= passingThreshold && failedBatteries.length === 0,
    overallScore,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalTests,
    batteryScores,
    failedBatteries,
  };
}
