/**
 * CSRF Security Policy — per-tenant configurable CSRF behavior.
 * Mirrors csrf_security_policies table in 010_csrf_security_tables.sql.
 */
export interface CsrfPolicyConfig {
    tokenMaxAgeMs: number;
    rotationIntervalMs: number;
    graceWindowMs: number;
    enforcementMode: 'block' | 'warn' | 'log';
    sameIpRequired: boolean;
    sameUaRequired: boolean;
    maxFailuresPerWindow: number;
    failureWindowMs: number;
}
export interface CsrfPolicyRow {
    policy_id: string;
    tenant_id: string;
    token_max_age_ms: number;
    rotation_interval_ms: number;
    grace_window_ms: number;
    enforcement_mode: string;
    same_ip_required: boolean;
    same_ua_required: boolean;
    max_failures_per_window: number;
    failure_window_ms: number;
    is_active: boolean;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface CsrfFailureRow {
    failure_id: string;
    tenant_id: string | null;
    session_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    path: string;
    method: string;
    reason: string;
    hint_returned: string | null;
    correlation_id: string | null;
    occurred_at: Date;
}
export interface SessionSecurityEventRow {
    event_id: string;
    session_id: string;
    tenant_id: string;
    user_id: string;
    event_type: string;
    risk_level: string;
    metadata: Record<string, unknown>;
    occurred_at: Date;
}
export type CsrfFailureReason = 'missing_header' | 'mismatch' | 'token_expired' | 'rate_limited';
export type SessionSecurityEventType = 'ip_changed' | 'ua_changed' | 'csrf_burst' | 'concurrent_limit' | 'token_rotation_failed' | 'session_health_degraded' | 'session_health_recovered';
export type SessionRiskLevel = 'low' | 'medium' | 'high' | 'critical';
