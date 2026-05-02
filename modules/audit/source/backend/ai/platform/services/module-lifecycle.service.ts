import { getRegistryEntry } from '@dos/platform-core/lifecycle';

interface LifecycleTransitionRequest {
	moduleCode: string;
	entityId: string;
	toStatus: string;
	fromStatus?: string;
	entityType?: string;
	table?: string;
	idColumn?: string;
	actorUserId?: string;
	statusColumn?: string;
	extraSets?: string;
	extraParams?: unknown[];
}

interface LifecycleTransitionEvaluation {
	allowed: boolean;
	reason?: string;
}

interface EnforceStatusTransitionResult {
	success: boolean;
	blocked: boolean;
	pendingApproval: boolean;
	reason?: string;
	approvalId?: string;
}

interface TryLifecycleTransitionResult {
	handled: boolean;
	denied: boolean;
	pendingApproval: boolean;
	approvalId?: string;
	result?: {
		reason?: string;
	};
}

function normalizeTransitionRequest(
	requestOrModuleCode: LifecycleTransitionRequest | string,
	entityId?: string,
	fromStatus?: string,
	toStatus?: string,
	actorUserId?: string,
): { request: LifecycleTransitionRequest; legacySignature: boolean } {
	if (typeof requestOrModuleCode === 'string') {
		return {
			request: {
				moduleCode: requestOrModuleCode,
				entityType: requestOrModuleCode,
				entityId: entityId ?? '',
				fromStatus,
				toStatus: toStatus ?? '',
				actorUserId,
			},
			legacySignature: true,
		};
	}

	return {
		request: requestOrModuleCode,
		legacySignature: false,
	};
}

function resolveEntityTypes(request: LifecycleTransitionRequest): string[] {
	const candidates = [request.entityType, request.table, request.moduleCode].filter(
		(value): value is string => typeof value === 'string' && value.length > 0,
	);

	return Array.from(new Set(candidates));
}

function findLifecycleEntry(request: LifecycleTransitionRequest): { moduleCode: string; entityType: string; transitions: Record<string, string[]> } | null {
	for (const entityType of resolveEntityTypes(request)) {
		try {
			const entry = getRegistryEntry(request.moduleCode, entityType);
			if (entry) {
				return entry;
			}
		} catch {
			return null;
		}
	}

	return null;
}

function evaluateTransition(request: LifecycleTransitionRequest): LifecycleTransitionEvaluation {
	if (!request.moduleCode || !request.toStatus || !request.fromStatus) {
		return { allowed: true };
	}

	const entry = findLifecycleEntry(request);
	if (!entry || request.fromStatus === request.toStatus) {
		return { allowed: true };
	}

	const allowed = entry.transitions[request.fromStatus];
	if (!Array.isArray(allowed) || !allowed.includes(request.toStatus)) {
		return {
			allowed: false,
			reason: `Lifecycle transition denied for ${entry.moduleCode}/${entry.entityType}: ${request.fromStatus} -> ${request.toStatus} is not allowed.`,
		};
	}

	return { allowed: true };
}

export async function enforceStatusTransition(
	tenantId: string,
	requestOrModuleCode: LifecycleTransitionRequest | string,
	entityId?: string,
	fromStatus?: string,
	toStatus?: string,
	actorUserId?: string,
): Promise<EnforceStatusTransitionResult> {
	void tenantId;
	const normalized = normalizeTransitionRequest(
		requestOrModuleCode,
		entityId,
		fromStatus,
		toStatus,
		actorUserId,
	);
	const evaluation = evaluateTransition(normalized.request);

	if (!evaluation.allowed) {
		if (normalized.legacySignature) {
			const error = new Error(evaluation.reason ?? 'Lifecycle transition denied.');
			(error as Error & { statusCode?: number }).statusCode = 403;
			throw error;
		}

		return {
			success: false,
			blocked: true,
			pendingApproval: false,
			reason: evaluation.reason,
		};
	}

	return {
		success: false,
		blocked: false,
		pendingApproval: false,
	};
}

export async function tryLifecycleTransition(
	tenantId: string,
	request: LifecycleTransitionRequest,
): Promise<TryLifecycleTransitionResult> {
	void tenantId;
	const evaluation = evaluateTransition(request);

	if (!evaluation.allowed) {
		return {
			handled: true,
			denied: true,
			pendingApproval: false,
			result: {
				reason: evaluation.reason,
			},
		};
	}

	return {
		handled: false,
		denied: false,
		pendingApproval: false,
	};
}
