import { safeQuery } from '@dos/db';

export interface TelemetrySignal {
	subjectKey?: string;
	signalType?: string;
	value?: number;
	observedAt?: string;
	payload?: Record<string, unknown>;
	[key: string]: unknown;
}

export async function ingestSignal(tenantId: string, signal: TelemetrySignal): Promise<Record<string, unknown>> {
	void safeQuery;
	return {
		tenantId,
		accepted: 1,
		signal,
	};
}

export async function ingestSignals(tenantId: string, signals: TelemetrySignal[]): Promise<Record<string, unknown>> {
	void safeQuery;
	return {
		tenantId,
		accepted: Array.isArray(signals) ? signals.length : 0,
	};
}

export async function getThreatProbability(tenantId: string, subjectKey: string, windowHours = 24): Promise<Record<string, unknown>> {
	void safeQuery;
	return {
		tenantId,
		subjectKey,
		windowHours,
		probability: 0,
		samples: 0,
	};
}

export async function getSignals(tenantId: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
	void safeQuery;
	return {
		tenantId,
		filters: options,
		items: [],
		total: 0,
	};
}