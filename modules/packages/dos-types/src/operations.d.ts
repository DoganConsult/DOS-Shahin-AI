/**
 * @dos/types — operations, monitoring, and observability types
 * Covers SRE metrics, uptime, alerting rules, dashboards, capacity
 */
export type MonitoringStatus = 'active' | 'paused' | 'disabled' | 'error';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type AlertRuleSeverity = 'critical' | 'warning' | 'info';
export interface MonitoringTarget {
    targetId: string;
    tenantId: string;
    name: string;
    type: 'service' | 'api' | 'database' | 'queue' | 'endpoint' | 'host' | 'container';
    address?: string;
    port?: number;
    protocol?: 'http' | 'https' | 'tcp' | 'udp' | 'ping' | 'snmp';
    checkInterval?: number;
    timeout?: number;
    retries?: number;
    status: MonitoringStatus;
    tags?: Record<string, string>;
    ownerId?: string;
    assetId?: string;
    slaTarget?: number;
    createdAt: string;
    updatedAt: string;
}
export interface MonitoringCheck {
    checkId: string;
    targetId: string;
    tenantId: string;
    timestamp: string;
    status: 'up' | 'down' | 'degraded' | 'unknown';
    responseTimeMs?: number;
    statusCode?: number;
    errorMessage?: string;
    checkedFrom?: string;
}
export interface MetricDefinition {
    metricId: string;
    tenantId?: string;
    name: string;
    description?: string;
    type: MetricType;
    unit?: string;
    labels?: string[];
    source?: string;
    isGlobal?: boolean;
    createdAt: string;
}
export interface MetricDataPoint {
    metricId: string;
    tenantId: string;
    labels?: Record<string, string>;
    value: number;
    timestamp: string;
}
export interface MetricAggregation {
    metricId: string;
    tenantId: string;
    period: string;
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    p50?: number;
    p90?: number;
    p95?: number;
    p99?: number;
    count?: number;
    calculatedAt: string;
}
export type AlertRuleStatus = 'active' | 'paused' | 'disabled';
export type AlertRuleConditionType = 'threshold' | 'anomaly' | 'absence' | 'change_rate' | 'composite';
export interface AlertRule {
    ruleId: string;
    tenantId: string;
    name: string;
    description?: string;
    status: AlertRuleStatus;
    severity: AlertRuleSeverity;
    targetId?: string;
    metricId?: string;
    conditionType: AlertRuleConditionType;
    condition?: AlertRuleCondition;
    duration?: number;
    evaluationInterval?: number;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    notifyChannels?: string[];
    notifyUserIds?: string[];
    silenceUntil?: string;
    runbookUrl?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface AlertRuleCondition {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold?: number;
    anomalyStdDev?: number;
    changeRatePercent?: number;
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'last' | 'count';
    window?: number;
}
export interface MonitoringAlertEvent {
    eventId: string;
    ruleId: string;
    tenantId: string;
    severity: AlertRuleSeverity;
    title?: string;
    message?: string;
    status: 'firing' | 'resolved' | 'acknowledged';
    value?: number;
    threshold?: number;
    labels?: Record<string, string>;
    firedAt: string;
    resolvedAt?: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    notificationsSent?: string[];
}
export interface SLODefinition {
    sloId: string;
    tenantId: string;
    serviceId?: string;
    name: string;
    description?: string;
    indicator: 'availability' | 'latency' | 'error_rate' | 'throughput' | 'saturation' | 'custom';
    target: number;
    unit: string;
    window: number;
    windowUnit: 'days' | 'weeks' | 'months' | 'rolling_days';
    metricQuery?: string;
    status?: 'meeting' | 'at_risk' | 'breached';
    currentValue?: number;
    alertingThreshold?: number;
    burnRateThreshold?: number;
    reportEmails?: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SLOBudget {
    sloId: string;
    tenantId: string;
    period: string;
    totalBudgetMinutes: number;
    consumedMinutes: number;
    remainingMinutes: number;
    budgetPercent: number;
    remainingPercent: number;
    burnRate?: number;
    projected?: number;
    status: 'healthy' | 'at_risk' | 'exhausted';
    calculatedAt: string;
}
export interface IncidentPostmortem {
    postmortemId: string;
    tenantId: string;
    incidentId?: string;
    title: string;
    severity?: AlertRuleSeverity;
    impact?: string;
    duration?: number;
    startedAt?: string;
    resolvedAt?: string;
    detectedBy?: string;
    detectionTime?: number;
    timelineEvents?: PostmortemEvent[];
    rootCause?: string;
    contributingFactors?: string[];
    actionItems?: PostmortemAction[];
    whatWentWell?: string[];
    whatToImprove?: string[];
    status: 'draft' | 'review' | 'final';
    reviewedBy?: string;
    reviewedAt?: string;
    fileId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PostmortemEvent {
    eventId?: string;
    timestamp: string;
    description: string;
    type?: 'detection' | 'escalation' | 'action' | 'resolution';
}
export interface PostmortemAction {
    actionId?: string;
    description: string;
    owner?: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'open' | 'in_progress' | 'completed';
    category?: 'detection' | 'mitigation' | 'prevention' | 'process' | 'tooling';
}
export interface CapacityPlan {
    planId: string;
    tenantId: string;
    name: string;
    status: 'draft' | 'approved' | 'active' | 'archived';
    period: string;
    horizon?: 'monthly' | 'quarterly' | 'annual';
    resources?: CapacityResource[];
    forecastModel?: string;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CapacityResource {
    resourceId: string;
    name: string;
    type: 'compute' | 'storage' | 'network' | 'database' | 'ai' | 'license' | 'human';
    unit?: string;
    currentUtilization?: number;
    forecastedUtilization?: number;
    threshold?: number;
    recommendedAction?: string;
    cost?: number;
    currency?: string;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogSource = 'backend' | 'frontend' | 'agent' | 'integration' | 'security' | 'audit' | 'system';
export interface LogEntry {
    logId?: string;
    tenantId: string;
    level: LogLevel;
    source: LogSource;
    service?: string;
    message: string;
    timestamp: string;
    traceId?: string;
    spanId?: string;
    requestId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    error?: LogError;
    metadata?: Record<string, unknown>;
    tags?: string[];
}
export interface LogError {
    message: string;
    stack?: string;
    code?: string;
    type?: string;
}
export interface LogFilter {
    level?: LogLevel[];
    source?: LogSource[];
    service?: string;
    traceId?: string;
    userId?: string;
    from?: string;
    to?: string;
    containsText?: string;
    tags?: string[];
}
export type DeploymentStatus = 'pending' | 'in_progress' | 'success' | 'rolled_back' | 'failed' | 'cancelled';
export type DeploymentEnvironment = 'development' | 'test' | 'staging' | 'production' | 'dr';
export interface Deployment {
    deploymentId: string;
    tenantId?: string;
    service: string;
    version: string;
    environment: DeploymentEnvironment;
    status: DeploymentStatus;
    commitHash?: string;
    branch?: string;
    releaseNotes?: string;
    changeRequestId?: string;
    deployedBy?: string;
    approvedBy?: string;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    rolledBackAt?: string;
    durationMs?: number;
    errorMessage?: string;
    artifacts?: string[];
    checksPassed?: DeploymentCheck[];
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface DeploymentCheck {
    name: string;
    status: 'pass' | 'fail' | 'skip';
    message?: string;
    durationMs?: number;
}
export interface OperationsDashboard {
    tenantId: string;
    services: number;
    healthyServices: number;
    degradedServices: number;
    downServices: number;
    activeAlerts: number;
    criticalAlerts: number;
    slosMeetingTarget: number;
    slosBreach: number;
    activeIncidents: number;
    openProblems: number;
    pendingChanges: number;
    lastDeployments?: string[];
    avgAvailability?: number;
    lastUpdatedAt: string;
}
