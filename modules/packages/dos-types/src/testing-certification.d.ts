/**
 * @dos/types — lab, testing and certification management types
 * Covers lab environments, penetration tests, vulnerability assessments,
 * security ratings, red team, certifications, and testing dashboards
 */
export type LabEnvironmentType = 'development' | 'staging' | 'uat' | 'sandbox' | 'qa' | 'pre_prod' | 'pen_test' | 'forensics' | 'isolated';
export type LabEnvironmentStatus = 'active' | 'inactive' | 'provisioning' | 'decommissioned' | 'quarantined';
export interface LabEnvironment {
    labId: string;
    tenantId: string;
    name: string;
    type?: LabEnvironmentType;
    status?: LabEnvironmentStatus;
    description?: string;
    cloud?: 'azure' | 'aws' | 'gcp' | 'on_premise' | 'hybrid';
    region?: string;
    resourceGroupRef?: string;
    networkCidr?: string;
    isolationLevel?: 'full' | 'partial' | 'none';
    containsLiveData?: boolean;
    dataClassification?: 'real' | 'synthetic' | 'anonymized' | 'masked';
    ownerId?: string;
    teamIds?: string[];
    accessList?: LabAccessEntry[];
    autoShutdownEnabled?: boolean;
    autoShutdownAt?: string;
    billingGroup?: string;
    monthlyCostUSD?: number;
    tags?: string[];
    expiresAt?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface LabAccessEntry {
    userId?: string;
    role?: 'admin' | 'developer' | 'tester' | 'read_only';
    grantedAt?: string;
    expiresAt?: string;
}
export type PenTestType = 'external_network' | 'internal_network' | 'web_application' | 'mobile_application' | 'api' | 'social_engineering' | 'physical' | 'cloud' | 'red_team' | 'purple_team' | 'ics_ot';
export type PenTestStatus = 'planned' | 'scoping' | 'in_progress' | 'remediation_review' | 'completed' | 'cancelled';
export type PenTestMethodology = 'ptes' | 'owasp' | 'nist' | 'crest' | 'osstmm' | 'internal' | 'custom';
export interface PenetrationTest {
    testId: string;
    tenantId: string;
    name: string;
    type: PenTestType;
    status: PenTestStatus;
    methodology?: PenTestMethodology;
    description?: string;
    scope?: PenTestScope;
    exclusions?: string;
    rules?: string;
    vendor?: string;
    leadTester?: string;
    testerIds?: string[];
    labId?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    budgetUSD?: number;
    actualCostUSD?: number;
    approvedBy?: string;
    approvedAt?: string;
    threatModel?: string;
    targetType?: 'application' | 'network' | 'infrastructure' | 'people' | 'physical';
    openFindings?: number;
    criticalFindings?: number;
    highFindings?: number;
    mediumFindings?: number;
    lowFindings?: number;
    informationalFindings?: number;
    riskRating?: 'critical' | 'high' | 'medium' | 'low';
    cvssMaxScore?: number;
    remediationDeadline?: string;
    reportId?: string;
    retestPlanned?: boolean;
    retestDate?: string;
    retestStatus?: 'pending' | 'in_progress' | 'passed' | 'failed';
    certificationImpact?: boolean;
    notes?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface PenTestScope {
    ipRanges?: string[];
    domains?: string[];
    applications?: string[];
    apiEndpoints?: string[];
    buildings?: string[];
    cloudAccounts?: string[];
    userGroups?: string[];
    dataClassifications?: string[];
}
export type VulnAssessmentType = 'authenticated' | 'unauthenticated' | 'credentialed' | 'agent_based' | 'passive';
export type VulnAssessmentStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface VulnerabilityAssessment {
    assessmentId: string;
    tenantId: string;
    name?: string;
    type?: VulnAssessmentType;
    status?: VulnAssessmentStatus;
    scannerTool?: 'nessus' | 'qualys' | 'rapid7' | 'openvas' | 'defect_dojo' | 'custom';
    scanProfile?: string;
    labId?: string;
    targetAssetIds?: string[];
    targetIpRanges?: string[];
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    durationSeconds?: number;
    totalTargets?: number;
    scannedTargets?: number;
    totalFindings?: number;
    criticalCount?: number;
    highCount?: number;
    mediumCount?: number;
    lowCount?: number;
    infoCount?: number;
    patchedCount?: number;
    cvssAvg?: number;
    riskScore?: number;
    reportUrl?: string;
    rawOutputRef?: string;
    baselineId?: string;
    newFindings?: number;
    resolvedFindings?: number;
    regressedFindings?: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type SecurityRatingProvider = 'bitsight' | 'securityscorecard' | 'riskrecon' | 'black_kite' | 'upguard' | 'internal';
export interface SecurityRating {
    ratingId: string;
    tenantId: string;
    entityId?: string;
    entityType?: 'self' | 'vendor' | 'partner' | 'customer';
    provider?: SecurityRatingProvider;
    overallScore?: number;
    grade?: 'A' | 'B' | 'C' | 'D' | 'F';
    previousScore?: number;
    scoreChange?: number;
    trend?: 'improving' | 'declining' | 'stable';
    breakdown?: SecurityRatingBreakdown[];
    industryAvg?: number;
    industryRank?: number;
    industryPercentile?: number;
    openFindings?: number;
    criticalFindings?: number;
    assessedAt: string;
    nextAssessmentAt?: string;
    reportUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface SecurityRatingBreakdown {
    category?: string;
    score?: number;
    grade?: 'A' | 'B' | 'C' | 'D' | 'F';
    weight?: number;
    findings?: number;
}
export type ExerciseType = 'red_team' | 'purple_team' | 'blue_team' | 'tabletop' | 'wargame';
export interface RedTeamExercise {
    exerciseId: string;
    tenantId: string;
    name: string;
    type?: ExerciseType;
    status?: PenTestStatus;
    description?: string;
    scenario?: string;
    objectives?: string[];
    assumptions?: string[];
    redTeamIds?: string[];
    blueTeamIds?: string[];
    refereeId?: string;
    labId?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    attackVectors?: string[];
    ttpsSimulated?: string[];
    detectionRate?: number;
    containmentRate?: number;
    responseTimeMins?: number;
    objectives_achieved?: number;
    totalObjectives?: number;
    findings?: string[];
    lessons?: string;
    reportId?: string;
    approvedBy?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type SecurityCertType = 'iso_27001' | 'iso_22301' | 'soc2_type1' | 'soc2_type2' | 'pci_dss' | 'hipaa' | 'csa_star' | 'fedramp' | 'nist_csf' | 'cis_controls' | 'tisax' | 'custom';
export type CertStatus = 'targeted' | 'in_progress' | 'certified' | 'renewal' | 'lapsed' | 'withdrawn';
export interface SecurityCertification {
    certId: string;
    tenantId: string;
    entityId?: string;
    type: SecurityCertType;
    certName?: string;
    status: CertStatus;
    certBody?: string;
    certBodyCountry?: string;
    scope?: string;
    scopeExclusions?: string;
    certificationDate?: string;
    expiryDate?: string;
    surveillanceDate?: string;
    renewalDate?: string;
    certNumber?: string;
    certUrl?: string;
    documentId?: string;
    projectId?: string;
    leadAuditorId?: string;
    previousCertId?: string;
    targetDate?: string;
    gapCount?: number;
    closedGaps?: number;
    openGaps?: number;
    readinessScore?: number;
    notes?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface TestingAndCertificationDashboard {
    tenantId: string;
    asOf: string;
    activePenTests?: number;
    completedPenTestsLast12m?: number;
    openPenTestFindings?: number;
    criticalPenTestFindings?: number;
    scheduledAssessments?: number;
    avgSecurityRating?: number;
    securityRatingTrend?: 'improving' | 'declining' | 'stable';
    activeCertifications?: number;
    expiringCertifications?: number;
    lapsedCertifications?: number;
    activeLabEnvironments?: number;
    labMonthlySpendUSD?: number;
    openRedTeamExercises?: number;
    upcomingTests?: Array<{
        id: string;
        name: string;
        type: string;
        plannedStartDate?: string;
        status?: string;
    }>;
    expiringCertsList?: Array<{
        certId: string;
        certName?: string;
        expiryDate?: string;
        status?: CertStatus;
    }>;
    recentRatings?: Array<{
        ratingId: string;
        entityType?: string;
        grade?: string;
        score?: number;
        assessedAt: string;
    }>;
}
