export interface CockpitSignalRecord extends Record<string, unknown> {
	recorded_at?: string;
	signal_value?: number | string;
}

const signalStore = new Map<string, CockpitSignalRecord[]>();

export async function recordSignal(tenantId: string, signal: Record<string, unknown>): Promise<void> {
	const storedSignals = signalStore.get(tenantId) ?? [];
	const signalCode = signal.signalCode ?? signal.signal_code;
	const rawSignalValue = signal.signalValue ?? signal.signal_value ?? 0;
	const signalValue = typeof rawSignalValue === 'number' || typeof rawSignalValue === 'string'
		? rawSignalValue
		: Number(rawSignalValue ?? 0);

	storedSignals.unshift({
		...signal,
		signalCode,
		signal_code: signalCode,
		signalValue,
		signal_value: signalValue,
		recorded_at: new Date().toISOString(),
	});

	signalStore.set(tenantId, storedSignals.slice(0, 1000));
}

export async function getSignalHistory(
	tenantId: string,
	signalCode?: string,
	limit: number = 50,
): Promise<CockpitSignalRecord[]> {
	const storedSignals = signalStore.get(tenantId) ?? [];
	const filteredSignals = signalCode
		? storedSignals.filter(signal => String(signal.signalCode ?? signal.signal_code ?? '') === signalCode)
		: storedSignals;

	return filteredSignals.slice(0, Math.max(limit, 0));
}
