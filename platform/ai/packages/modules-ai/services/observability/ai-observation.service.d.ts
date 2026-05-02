export type ObservationType = 'anomaly' | 'drift' | 'gap' | 'pattern' | 'correlation';
export type ObservationSeverity = 'info' | 'low' | 'medium' | 'high' | 'warning' | 'critical';
export type ObservationStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export interface ObservationInput {
    tenantId: string;
    agentId?: string;
    runId?: string;
    entityType?: string;
    entityId?: string;
    observationType: ObservationType;
    title: string;
    description?: string;
    severity?: ObservationSeverity;
    confidence?: number;
    evidenceJson?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface Observation {
    observation_id: string;
    tenant_id: string;
    agent_id: string | null;
    run_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    observation_type: ObservationType;
    title: string;
    description: string | null;
    severity: ObservationSeverity;
    confidence: number | null;
    evidence_json: Record<string, unknown>;
    status: ObservationStatus;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
}
export declare function recordObservation(input: ObservationInput): Promise<Observation | null>;
export declare function listObservations(tenantId: string, filters?: {
    agentId?: string;
    entityType?: string;
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    items: Observation[];
    total: number;
}>;
export declare function getObservationsForEntity(tenantId: string, entityType: string, entityId: string): Promise<Observation[]>;
export declare function acknowledgeObservation(tenantId: string, observationId: string, _userId: string): Promise<boolean>;
export declare function resolveObservation(tenantId: string, observationId: string, userId: string): Promise<boolean>;
export declare function dismissObservation(tenantId: string, observationId: string, userId: string): Promise<boolean>;
export declare function getObservationStats(tenantId: string): Promise<{
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
    total: number;
    bySeverity: {
        info: number;
        warning: number;
        critical: number;
    };
}>;
