/**
 * ReBAC port — relationship-based access checks (owner/reviewer/member/team/
 * department, `acts_on_behalf_of`). Abstracts whether checks run against the
 * native scope-resolver or an external graph store (OpenFGA / SpiceDB).
 *
 * DAuth still wraps with tenant validation, SoD, and the final decision.
 */
export interface RebacCheckRequest {
    /** Tuple: user, relation, object — e.g. `user:123 approver evidence:456`. */
    user: string;
    relation: string;
    object: string;
    /** Optional contextual tuples for conditional relations. */
    contextualTuples?: Array<{
        user: string;
        relation: string;
        object: string;
    }>;
}
export interface RebacCheckResult {
    allowed: boolean;
    /** Adapter that produced this result. */
    source: 'native' | 'openfga' | 'spicedb' | 'custom';
    /** Authorization model version id (OpenFGA: `auth_model_id`). */
    modelVersion?: string;
    latencyMs?: number;
    /** Human-readable trace — useful for `explainDecision`. */
    trace?: string;
}
export interface RebacListRequest {
    user: string;
    relation: string;
    type: string;
}
export interface RebacListResult {
    objectIds: string[];
    source: RebacCheckResult['source'];
    modelVersion?: string;
}
export interface RebacTupleWrite {
    user: string;
    relation: string;
    object: string;
    op: 'write' | 'delete';
}
export interface RebacAdapter {
    readonly name: 'native' | 'openfga' | 'spicedb' | 'custom';
    check(request: RebacCheckRequest): Promise<RebacCheckResult>;
    listObjects(request: RebacListRequest): Promise<RebacListResult>;
    /**
     * Write tuples in a batch. Called by the outbox subscriber when
     * delegations / ownership changes are committed to the source-of-truth DB.
     */
    writeTuples(tuples: RebacTupleWrite[]): Promise<void>;
    currentModelVersion(): Promise<string>;
}
