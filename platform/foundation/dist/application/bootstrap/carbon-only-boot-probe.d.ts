export interface CarbonOnlyBootProbeReport {
    ok: boolean;
    catalog_total: number;
    non_ibm_catalog: number;
    registry_total: number;
    registry_unapproved: number;
    registry_pointing_to_blocked: number;
    blocked_with_dynamic_allowed: number;
    duration_ms: number;
}
export declare function runCarbonOnlyBootProbe(): Promise<CarbonOnlyBootProbeReport>;
