/**
 * @dos/types — financial risk, fraud, and AML types
 * Covers financial exposure, credit risk, fraud detection, AML
 */
export type FinancialRiskCategory = 'credit_risk' | 'market_risk' | 'liquidity_risk' | 'operational_risk' | 'concentration_risk' | 'counterparty_risk' | 'currency_risk' | 'interest_rate_risk' | 'commodity_risk' | 'regulatory_risk';
export type FinancialRiskStatus = 'open' | 'monitoring' | 'mitigated' | 'accepted' | 'closed';
export interface FinancialRisk {
    riskId: string;
    tenantId: string;
    workspaceId?: string;
    category: FinancialRiskCategory;
    title: string;
    description?: string;
    status: FinancialRiskStatus;
    exposure?: FinancialExposure;
    probability?: number;
    expectedLoss?: number;
    worstCaseLoss?: number;
    currency?: string;
    horizon?: 'short' | 'medium' | 'long';
    entityType?: string;
    entityId?: string;
    ownerId?: string;
    controlIds?: string[];
    hedgingMechanisms?: string[];
    stressTestResults?: StressTestResult[];
    limitBreach?: boolean;
    limitBreachDetails?: string;
    regulatoryCapital?: number;
    vatRisk?: boolean;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FinancialExposure {
    grossExposure: number;
    netExposure?: number;
    currency: string;
    collateral?: number;
    netting?: number;
    grossVaR?: number;
    netVaR?: number;
    confidenceLevel?: number;
    measurementDate?: string;
}
export interface StressTestResult {
    scenarioId: string;
    scenarioName: string;
    loss?: number;
    currency?: string;
    impactDescription?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    probability?: number;
    testedAt: string;
}
export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D';
export type CreditRatingOutlook = 'stable' | 'positive' | 'negative' | 'watch';
export interface CounterpartyCredit {
    creditId: string;
    tenantId: string;
    entityType: 'bank' | 'supplier' | 'customer' | 'insurer' | 'broker' | 'other';
    entityId?: string;
    name: string;
    rating?: CreditRating;
    ratingAgency?: string;
    outlook?: CreditRatingOutlook;
    ratingDate?: string;
    probabilityOfDefault?: number;
    lossGivenDefault?: number;
    exposureAtDefault?: number;
    expectedLoss?: number;
    currency?: string;
    creditLimit?: number;
    creditUsed?: number;
    limitUtilization?: number;
    paymentTerms?: number;
    paymentHistory?: PaymentHistoryRecord[];
    sector?: string;
    countryCode?: string;
    lastReviewedAt?: string;
    nextReviewDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PaymentHistoryRecord {
    period: string;
    paidOnTime: boolean;
    daysLate?: number;
    amount?: number;
}
export type FraudType = 'identity_theft' | 'account_takeover' | 'payment_fraud' | 'procurement_fraud' | 'expense_fraud' | 'asset_misappropriation' | 'financial_statement_fraud' | 'bribery' | 'corruption' | 'insider_trading' | 'cyber_fraud' | 'other';
export type FraudStatus = 'suspected' | 'investigating' | 'confirmed' | 'unfounded' | 'prosecuted' | 'closed';
export interface FraudCase {
    caseId: string;
    tenantId: string;
    type: FraudType;
    title: string;
    description?: string;
    status: FraudStatus;
    severity: 'critical' | 'high' | 'medium' | 'low';
    detectedAt: string;
    detectedBy?: string;
    reportedAt: string;
    closedAt?: string;
    estimatedLoss?: number;
    confirmedLoss?: number;
    recoveredAmount?: number;
    currency?: string;
    perpetrators?: FraudPerpetrator[];
    affectedControls?: string[];
    investigationNotes?: string;
    investigatedBy?: string;
    lawEnforcementNotified?: boolean;
    lawEnforcementRef?: string;
    insuranceClaimed?: boolean;
    insuranceClaimRef?: string;
    rootCause?: string;
    preventiveMeasures?: string[];
    correlatedIncidentId?: string;
    assignedTo?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FraudPerpetrator {
    perpetratorId?: string;
    type: 'internal' | 'external' | 'collusion';
    name?: string;
    role?: string;
    userId?: string;
    confirmed?: boolean;
}
export interface FraudAlert {
    alertId: string;
    tenantId: string;
    ruleId?: string;
    ruleName?: string;
    type: FraudType;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    description?: string;
    triggeredAt: string;
    resolvedAt?: string;
    entityType?: string;
    entityId?: string;
    score?: number;
    signals?: FraudSignal[];
    caseId?: string;
    assignedTo?: string;
    notes?: string;
    createdAt: string;
}
export interface FraudSignal {
    signalId: string;
    type: string;
    description: string;
    value?: unknown;
    weight?: number;
    timestamp?: string;
}
export type AMLAlertStatus = 'new' | 'investigating' | 'escalated' | 'cleared' | 'sar_filed';
export type AMLRiskLevel = 'high' | 'medium' | 'low';
export interface AMLProfile {
    profileId: string;
    tenantId: string;
    entityType: 'customer' | 'counterparty' | 'vendor' | 'employee';
    entityId?: string;
    name: string;
    riskLevel: AMLRiskLevel;
    riskScore?: number;
    riskFactors?: AMLRiskFactor[];
    politicallyExposed?: boolean;
    pepDetails?: string;
    sanctioned?: boolean;
    adverseMedia?: boolean;
    kyc?: KYCRecord;
    lastReviewedAt?: string;
    nextReviewDate?: string;
    reviewFrequency?: 'annual' | 'biannual' | 'quarterly';
    status: 'active' | 'under_review' | 'blocked';
    createdAt: string;
    updatedAt: string;
}
export interface AMLRiskFactor {
    factor: string;
    weight?: number;
    value?: unknown;
}
export interface KYCRecord {
    kycId?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
    completedAt?: string;
    expiresAt?: string;
    provider?: string;
    verificationLevel?: 'basic' | 'enhanced' | 'full';
    documentsChecked?: string[];
    notes?: string;
}
export interface AMLAlert {
    alertId: string;
    tenantId: string;
    profileId?: string;
    type: 'structuring' | 'unusual_activity' | 'high_risk_country' | 'pep' | 'sanctions_match' | 'rapid_movement' | 'other';
    status: AMLAlertStatus;
    riskLevel: AMLRiskLevel;
    description?: string;
    transactionIds?: string[];
    triggeredAt: string;
    investigatedBy?: string;
    investigationNotes?: string;
    sarFiled?: boolean;
    sarReference?: string;
    clearedAt?: string;
    escalatedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface RegulatoryReturn {
    returnId: string;
    tenantId: string;
    type: string;
    regulator?: string;
    period: string;
    dueDate: string;
    submittedAt?: string;
    status: 'draft' | 'review' | 'submitted' | 'accepted' | 'rejected' | 'amendment_required';
    submittedBy?: string;
    fileId?: string;
    reference?: string;
    rejectionReason?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface RiskLimit {
    limitId: string;
    tenantId: string;
    name: string;
    category: FinancialRiskCategory;
    entityType?: string;
    entityId?: string;
    limit: number;
    currency?: string;
    current?: number;
    utilizationPercent?: number;
    warningThresholdPercent?: number;
    status?: 'within_limit' | 'warning' | 'breached';
    breachedAt?: string;
    ownerId?: string;
    approvedBy?: string;
    approvedAt?: string;
    reviewDate?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FinancialRiskDashboard {
    tenantId: string;
    totalExposure?: number;
    currency?: string;
    openRisks: number;
    limitBreaches: number;
    openFraudCases: number;
    openAMLAlerts: number;
    overdueReturns: number;
    highRiskProfiles: number;
    byCategory?: Record<FinancialRiskCategory, number>;
    lastUpdatedAt: string;
}
