export interface RiskHostBindings {
  eventBus?: unknown;
  logger?: unknown;
  db?: unknown;
}

export interface RegisterRiskOptions {
  bindings?: RiskHostBindings;
}

export interface RegisterRiskResult {
  ok: true;
}

let _bindings: RiskHostBindings = {};

export function bindRiskPorts(bindings: RiskHostBindings): void {
  _bindings = bindings;
}

export async function registerRisk(opts: RegisterRiskOptions = {}): Promise<RegisterRiskResult> {
  if (opts.bindings) bindRiskPorts(opts.bindings);
  return { ok: true };
}

export async function onInstall(): Promise<void> {}
export async function onActivate(): Promise<void> {}
export async function onMigrate(): Promise<void> {}
export async function onUninstall(): Promise<void> {}

