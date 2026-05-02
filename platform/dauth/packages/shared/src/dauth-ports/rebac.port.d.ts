/**
 * ReBAC port — relationship-based access checks (owner, reviewer, member,
 * approver, acts_on_behalf_of, etc.). Abstracts whether the verdict comes
 * from the native DAuth scope-resolver + ownership adapter or from an
 * external graph store (OpenFGA, SpiceDB).
 *
 * Native behavior invariant: when no external adapter is enforced, the
 * NativeRebacAdapter returns a **pass-through allow**. This matches the
 * historical runtime where DAuth did not gate on ReBAC at this layer;
 * tenant isolation / scope was enforced by RLS + scope-resolver. Flipping
 * `DAUTH_OPENFGA_ENFORCE=true` swaps the primary to the OpenFGA adapter,
 * which actually gates.
 */
export interface RebacCheckRequest {
    user: string;
    relation: string;
    object: string;
}
export interface RebacCheckResult {
    allowed: boolean;
    source: 'native' | 'openfga' | 'spicedb' | 'custom';
    /** Authorization-model version id (OpenFGA auth_model_id). Present on
     *  external-engine results; null/undefined on native. */
    modelVersion?: string;
    /** Round-trip ms — populated by external-engine adapters. */
    latencyMs?: number;
    /** Human-readable trace — used by explainDecision. */
    trace?: string;
}
export interface RebacAdapter {
    readonly name: 'native' | 'openfga' | 'spicedb' | 'custom';
    check(request: RebacCheckRequest): Promise<RebacCheckResult>;
    currentModelVersion(): Promise<string | null>;
}
