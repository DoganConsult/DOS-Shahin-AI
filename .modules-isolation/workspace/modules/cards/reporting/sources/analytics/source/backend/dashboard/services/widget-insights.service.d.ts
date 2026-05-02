export declare function getGrcTimeLoop(tenantId: string): Promise<{
    years: {
        year: number;
        finding: string;
        repeated: boolean;
    }[];
    insight: string;
}>;
export declare function getImprovementIllusion(tenantId: string): Promise<{
    cosmetic: number;
    operational: number;
    insight: string;
}>;
export declare function getSilentControls(tenantId: string): Promise<{
    controls: {
        name: any;
        days: number;
    }[];
    insight: string;
}>;
export declare function getAuditDejavu(tenantId: string): Promise<{
    pairs: {
        finding: string;
        years: number[];
    }[];
    insight: string;
}>;
export declare function getRiskDenial(tenantId: string): Promise<{
    risks: {
        name: any;
        score: any;
        daysIgnored: number;
    }[];
    insight: string;
}>;
export declare function getOrgAmnesia(tenantId: string): Promise<{
    decisions: {
        date: any;
        decision: string;
        forgotten: boolean;
    }[];
    insight: string;
}>;
export declare function getKnowledgeInPeople(tenantId: string): Promise<{
    concentration: number;
    people: {
        name: any;
        controlsPct: number;
    }[];
    insight: string;
}>;
export declare function getDecisionTrace(tenantId: string): Promise<{
    decisions: {
        type: any;
        date: any;
        description: string;
        hasRationale: any;
    }[];
    insight: string;
}>;
export declare function getCulturalDrift(tenantId: string): Promise<{
    score: number;
    factors: {
        label: string;
        trend: string;
    }[];
    insight: string;
}>;
export declare function getControlAging(tenantId: string): Promise<{
    controls: {
        name: any;
        daysSinceRedesign: number;
        agePct: number;
    }[];
    insight: string;
}>;
export declare function getLifecycleBottleneck(tenantId: string): Promise<{
    stages: {
        name: string;
        count: number;
        pct: number;
        isBottleneck: boolean;
    }[];
    insight: string;
}>;
export declare function getZombieControls(tenantId: string): Promise<{
    controls: {
        name: any;
        reason: string;
    }[];
    insight: string;
}>;
export declare function getEvidenceRot(tenantId: string): Promise<{
    gauges: {
        label: string;
        value: number;
    }[];
    insight: string;
}>;
export declare function getAssessmentHonesty(tenantId: string): Promise<{
    selfScore: number;
    evidenceScore: number;
    gap: number;
    insight: string;
}>;
export declare function getRiskGravity(tenantId: string): Promise<{
    risks: {
        name: any;
        rating: string;
        cascadeScore: number;
    }[];
    insight: string;
}>;
export declare function getUntestedAssumptions(tenantId: string): Promise<{
    items: {
        assumption: string;
        tested: any;
    }[];
    insight: string;
}>;
export declare function getFalseComfort(tenantId: string): Promise<{
    kpis: {
        label: string;
        displayValue: string;
        displayColor: string;
    }[];
    warningCount: number;
    insight: string;
}>;
export declare function getOneSentenceTruth(tenantId: string): Promise<{
    sentence: string;
    severity: string;
    insight: string;
}>;
export declare function getFutureYou(tenantId: string): Promise<{
    narrative: string;
    insight: string;
}>;
export declare function getIfNothingChanges(tenantId: string): Promise<{
    scenarios: {
        months: number;
        description: string;
        probability: number;
        severity: string;
    }[];
    insight: string;
}>;
export declare function getRegulatorLens(tenantId: string): Promise<{
    internalView: {
        control: any;
        status: string;
        isGap: boolean;
    }[];
    regulatorView: {
        control: any;
        status: string;
        isGap: boolean;
    }[];
    insight: string;
}>;
export declare function getBoardReality(tenantId: string): Promise<{
    reported: number;
    hidden: number;
    unreportedRisks: {
        name: any;
        severity: string;
    }[];
    insight: string;
}>;
export declare function getReputationImpact(tenantId: string): Promise<{
    risks: {
        name: any;
        technical: number;
        reputational: number;
    }[];
    insight: string;
}>;
export declare function getRootCauseVsPatch(tenantId: string): Promise<{
    patchCount: number;
    rootCount: number;
    insight: string;
}>;
export declare function getChangeLeverage(tenantId: string): Promise<{
    actions: {
        description: string;
        effort: string;
        impactCount: number;
    }[];
    insight: string;
}>;
export declare function getMomentumIndicator(tenantId: string): Promise<{
    direction: string;
    metrics: {
        label: string;
        trend: number;
    }[];
    insight: string;
}>;
export declare function getYearInGrc(tenantId: string): Promise<{
    stats: {
        icon: string;
        value: string;
        label: string;
    }[];
    summary: string;
}>;
export declare function getMaturityGap(tenantId: string): Promise<{
    perceived: number;
    actual: number;
    gap: number;
    insight: string;
}>;
export declare function getBreakingTheCycle(tenantId: string): Promise<{
    isBroken: boolean;
    failures: string[];
    shift: string;
    insight: string;
}>;
export declare function getPainMirror(_tenantId: string): Promise<{
    pains: {
        en: string;
        ar: string;
    }[];
    responses: {
        en: string;
        ar: string;
    }[];
}>;
export declare function getChartInsight(tenantId: string, widgetId: string): Promise<{
    key: string;
    en: string;
    ar: string;
}>;
