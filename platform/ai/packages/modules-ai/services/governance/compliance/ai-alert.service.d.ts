export type AlertSourceType = 'agent' | 'signal' | 'sla' | 'event';
export type AlertType = 'sla_breach' | 'anomaly' | 'threshold' | 'compliance_gap' | 'security';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
export interface AlertInput {
    tenantId: string;
    sourceType?: AlertSourceType;
    sourceId?: string;
    entityType?: string;
    entityId?: string;
    alertType: AlertType;
    title: string;
    description?: string;
    severity?: AlertSeverity;
}
export interface Alert {
    alert_id: string;
    tenant_id: string;
    source_type: AlertSourceType;
    source_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    alert_type: AlertType;
    title: string;
    description: string | null;
    severity: AlertSeverity;
    status: AlertStatus;
    acknowledged_by: string | null;
    acknowledged_at: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    auto_resolved: boolean;
    escalation_level: number;
    created_at: string;
}
export declare function createAlert(input: AlertInput): Promise<Alert | null>;
export declare function listAlerts(tenantId: string, filters?: {
    alertType?: string;
    severity?: string;
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    items: Alert[];
    total: number;
}>;
export declare function getAlertsForEntity(tenantId: string, entityType: string, entityId: string): Promise<Alert[]>;
export declare function acknowledgeAlert(tenantId: string, alertId: string, userId: string): Promise<boolean>;
export declare function resolveAlert(tenantId: string, alertId: string, userId: string, autoResolved?: boolean): Promise<boolean>;
export declare function escalateAlert(tenantId: string, alertId: string): Promise<boolean>;
export declare function dismissAlert(tenantId: string, alertId: string, userId: string): Promise<boolean>;
export declare function getAlertStats(tenantId: string): Promise<{
    open: number;
    acknowledged: number;
    investigating: number;
    resolved: number;
    dismissed: number;
    total: number;
    bySeverity: {
        info: number;
        warning: number;
        critical: number;
    };
    byType: Record<string, number>;
}>;
