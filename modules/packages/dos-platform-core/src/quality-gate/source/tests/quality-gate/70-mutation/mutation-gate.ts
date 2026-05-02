export interface MutantResult {
  id: string;
  mutatorName: string;
  status: 'Killed' | 'Survived' | 'NoCoverage' | 'Timeout' | 'CompileError' | 'RuntimeError';
  location?: { file: string; line: number };
}

export interface MutationReport {
  totalMutants: number;
  killed: number;
  survived: number;
  noCoverage: number;
  timeout: number;
  compileErrors: number;
  runtimeErrors: number;
  mutants?: MutantResult[];
}

export interface MutationGateOptions {
  minMutationScore?: number;
  maxSurvivedRatio?: number;
  failOnNoCoverage?: boolean;
}

export interface MutationGateResult {
  passed: boolean;
  mutationScore: number;
  survivedRatio: number;
  noCoverageRatio: number;
  reasons: string[];
  report: MutationReport;
}

export function evaluateMutationReport(
  report: MutationReport,
  opts: MutationGateOptions = {},
): MutationGateResult {
  const {
    minMutationScore = 0.8,
    maxSurvivedRatio = 0.1,
    failOnNoCoverage = false,
  } = opts;

  const reasons: string[] = [];
  const effective = report.totalMutants - report.compileErrors - report.runtimeErrors;
  const mutationScore = effective > 0 ? report.killed / effective : 1;
  const survivedRatio = effective > 0 ? report.survived / effective : 0;
  const noCoverageRatio = report.totalMutants > 0 ? report.noCoverage / report.totalMutants : 0;

  if (mutationScore < minMutationScore) {
    reasons.push(
      `Mutation score ${(mutationScore * 100).toFixed(1)}% is below required ${(minMutationScore * 100).toFixed(1)}%`,
    );
  }

  if (survivedRatio > maxSurvivedRatio) {
    reasons.push(
      `Survived ratio ${(survivedRatio * 100).toFixed(1)}% exceeds max ${(maxSurvivedRatio * 100).toFixed(1)}%`,
    );
  }

  if (failOnNoCoverage && report.noCoverage > 0) {
    reasons.push(`${report.noCoverage} mutants have no coverage (failOnNoCoverage=true)`);
  }

  return {
    passed: reasons.length === 0,
    mutationScore,
    survivedRatio,
    noCoverageRatio,
    reasons,
    report,
  };
}
