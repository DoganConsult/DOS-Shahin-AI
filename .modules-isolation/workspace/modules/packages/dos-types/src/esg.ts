/**
 * @dos/types — ESG (Environmental, Social, Governance) and sustainability types
 * Covers carbon tracking, ESG metrics, reporting frameworks (GRI, TCFD, CSRD)
 */

// ── ESG Framework Types ────────────────────────────────────────────────────

export type ESGFramework = 'GRI' | 'TCFD' | 'SASB' | 'CDP' | 'CSRD' | 'UN_SDGs' | 'IFRS_S1' | 'IFRS_S2' | 'ISO_14001' | 'custom';
export type ESGPillar = 'environmental' | 'social' | 'governance';
export type ESGReportingPeriod = 'monthly' | 'quarterly' | 'annual' | 'biennial';

export interface ESGProgram {
  programId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  status: 'active' | 'draft' | 'archived';
  frameworks?: ESGFramework[];
  reportingPeriod?: ESGReportingPeriod;
  baselineYear?: number;
  targetYear?: number;
  ownerId?: string;
  ratingAgencies?: string[];
  disclosureLevel?: 'limited' | 'comprehensive' | 'statutory';
  certifications?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Environmental Types ────────────────────────────────────────────────────

export type EmissionScope = 'scope_1' | 'scope_2' | 'scope_3';
export type EmissionCategory =
  | 'stationary_combustion'
  | 'mobile_combustion'
  | 'process_emissions'
  | 'fugitive_emissions'
  | 'purchased_electricity'
  | 'purchased_heat'
  | 'business_travel'
  | 'employee_commuting'
  | 'supply_chain'
  | 'waste'
  | 'water'
  | 'other';

export interface GHGEmissionRecord {
  recordId: string;
  tenantId: string;
  programId?: string;
  scope: EmissionScope;
  category: EmissionCategory;
  activityType?: string;
  year: number;
  quarter?: number;
  month?: number;
  orgUnitId?: string;
  facilityId?: string;
  quantity: number;
  unit: string;
  emissionFactor?: number;
  co2eKg: number;
  dataSource?: string;
  quality?: 'measured' | 'estimated' | 'calculated';
  methodology?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  fileId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarbonTarget {
  targetId: string;
  tenantId: string;
  programId?: string;
  name: string;
  scope?: EmissionScope[];
  category?: EmissionCategory[];
  baselineYear: number;
  baselineCo2eKg: number;
  targetYear: number;
  targetReductionPercent: number;
  absoluteTargetCo2eKg?: number;
  methodology?: 'SBTi' | 'GHG_Protocol' | 'custom';
  status?: 'on_track' | 'at_risk' | 'off_track' | 'achieved';
  progressPercent?: number;
  currentCo2eKg?: number;
  lastUpdated?: string;
  actions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnergyConsumption {
  recordId: string;
  tenantId: string;
  year: number;
  quarter?: number;
  month?: number;
  facilityId?: string;
  orgUnitId?: string;
  source: 'electricity' | 'natural_gas' | 'renewables' | 'oil' | 'coal' | 'steam' | 'other';
  renewablePercent?: number;
  consumption: number;
  unit: string;
  costAmount?: number;
  currency?: string;
  co2eKg?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaterUsage {
  recordId: string;
  tenantId: string;
  year: number;
  quarter?: number;
  month?: number;
  facilityId?: string;
  source: 'municipal' | 'groundwater' | 'rainwater' | 'recycled' | 'other';
  withdrawal: number;
  discharge?: number;
  consumption?: number;
  unit: string;
  stressArea?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WasteRecord {
  recordId: string;
  tenantId: string;
  year: number;
  quarter?: number;
  facilityId?: string;
  category: 'hazardous' | 'non_hazardous' | 'e_waste' | 'recyclable' | 'organic';
  disposalMethod: 'landfill' | 'incineration' | 'recycling' | 'composting' | 'reuse' | 'other';
  quantity: number;
  unit: string;
  co2eKg?: number;
  notes?: string;
  createdAt: string;
}

// ── Social Types ───────────────────────────────────────────────────────────

export interface SocialMetric {
  metricId: string;
  tenantId: string;
  year: number;
  category:
    | 'diversity_inclusion'
    | 'employee_wellbeing'
    | 'health_safety'
    | 'community'
    | 'human_rights'
    | 'supply_chain_labor'
    | 'data_privacy';
  indicator: string;
  value: number;
  unit?: string;
  benchmark?: number;
  target?: number;
  notes?: string;
  dataSource?: string;
  reportingStandard?: ESGFramework;
  createdAt: string;
  updatedAt: string;
}

export interface DiversityStats {
  tenantId: string;
  year: number;
  totalHeadcount: number;
  gender: DiversityBreakdown;
  nationality?: DiversityBreakdown;
  ageGroup?: DiversityBreakdown;
  disability?: DiversityBreakdown;
  executiveGender?: DiversityBreakdown;
  boardGender?: DiversityBreakdown;
  payEquityRatio?: number;
  promotionRateGender?: { male: number; female: number };
  turnoverRate?: number;
  turnoverByGender?: { male: number; female: number };
  calculatedAt: string;
}

export interface DiversityBreakdown {
  male?: number;
  female?: number;
  nonBinary?: number;
  undisclosed?: number;
  [key: string]: number | undefined;
}

export interface HealthSafetyRecord {
  recordId: string;
  tenantId: string;
  year: number;
  quarter?: number;
  orgUnitId?: string;
  facilityId?: string;
  totalWorkingHours: number;
  fatalities: number;
  lostTimeInjuries: number;
  recordableIncidents: number;
  nearMisses?: number;
  totalRecordableRate?: number;
  lostTimeRate?: number;
  absenteeismDays?: number;
  trainingHoursPerEmployee?: number;
  notes?: string;
  createdAt: string;
}

// ── ESG KPI & Reporting Types ──────────────────────────────────────────────

export interface ESGKpi {
  kpiId: string;
  tenantId: string;
  programId?: string;
  pillar: ESGPillar;
  framework?: ESGFramework;
  indicator: string;
  description?: string;
  unit?: string;
  reportingPeriod: ESGReportingPeriod;
  target?: number;
  threshold?: number;
  currentValue?: number;
  previousValue?: number;
  trend?: 'improving' | 'stable' | 'worsening';
  status?: 'on_track' | 'at_risk' | 'off_track';
  dataSource?: string;
  ownerId?: string;
  methodology?: string;
  visibleInReport?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ESGDisclosure {
  disclosureId: string;
  tenantId: string;
  programId?: string;
  framework: ESGFramework;
  year: number;
  status: 'draft' | 'review' | 'approved' | 'published' | 'verified';
  completionPercent?: number;
  publishedAt?: string;
  reportFileId?: string;
  externalUrl?: string;
  verifiedBy?: string;
  verificationBody?: string;
  verificationDate?: string;
  assuranceLevel?: 'limited' | 'reasonable';
  disclosureQuality?: 'core' | 'comprehensive';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ESGScorecard {
  tenantId: string;
  period: string;
  overallScore?: number;
  environmentScore?: number;
  socialScore?: number;
  governanceScore?: number;
  carbonIntensity?: number;
  renewableEnergyPercent?: number;
  waterIntensity?: number;
  wasteRecyclingRate?: number;
  genderDiversityPercent?: number;
  ltifr?: number;
  employeeTrainingHours?: number;
  boardIndependencePercent?: number;
  antiCorruptionTrainingPercent?: number;
  dataBreachCount?: number;
  ratingAgencies?: ESGRatingAgencyScore[];
  calculatedAt: string;
}

export interface ESGRatingAgencyScore {
  agency: string;
  rating?: string;
  score?: number;
  percentile?: number;
  date?: string;
  url?: string;
}

// ── Climate Risk ───────────────────────────────────────────────────────────

export type ClimateRiskType = 'physical_acute' | 'physical_chronic' | 'transition_policy' | 'transition_technology' | 'transition_market';

export interface ClimateRisk {
  riskId: string;
  tenantId: string;
  programId?: string;
  type: ClimateRiskType;
  title: string;
  description?: string;
  timeHorizon: 'short' | 'medium' | 'long';
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  financialImpact?: number;
  currency?: string;
  scenario?: string;
  affectedAssets?: string[];
  affectedOperations?: string[];
  mitigationMeasures?: string;
  adaptationMeasures?: string;
  ownerId?: string;
  linkedRiskId?: string;
  tcfdCategory?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClimateOpportunity {
  opportunityId: string;
  tenantId: string;
  programId?: string;
  type: 'resource_efficiency' | 'energy_source' | 'products_services' | 'markets' | 'resilience';
  title: string;
  description?: string;
  timeHorizon: 'short' | 'medium' | 'long';
  likelihood: 'high' | 'medium' | 'low';
  financialImpact?: number;
  currency?: string;
  status?: 'identified' | 'evaluating' | 'pursuing' | 'realized' | 'not_pursued';
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}
