import { v4 as uuid } from "uuid";
import { safeQuery } from "@dos/db";

export interface SignalDefinition {
  id: string;
  name: string;
  type: string;
  weight: number;
}

export interface EmittedSignal {
  signalId: string;
  source: string;
  value: string;
  confidence: number;
}

export interface InferenceResult {
  regulators: InferredEntity[];
  frameworks: InferredEntity[];
  controls: InferredControl[];
  reasons: ExplainabilityEntry[];
  signalSummary: EmittedSignal[];
  questionCount: number;
}

export interface InferredEntity {
  id: string;
  name: string;
  confidence: number;
  priority: string;
  reasons: string[];
}

export interface InferredControl {
  id: string;
  title: string;
  frameworks: string[];
  automatable: boolean;
  priority: string;
}

export interface ExplainabilityEntry {
  targetId: string;
  targetName: string;
  targetType: "regulator" | "framework" | "control";
  reason: string;
  reasonAr?: string;
  confidence: number;
  triggeringSignals: string[];
}

const SIGNAL_MAP: Record<string, SignalDefinition> = {
  "sig-ksa-ops": { id: "sig-ksa-ops", name: "KSA Operations", type: "region", weight: 1.0 },
  "sig-gcc-ops": { id: "sig-gcc-ops", name: "GCC Operations", type: "region", weight: 0.8 },
  "sig-eu-ops": { id: "sig-eu-ops", name: "EU Operations", type: "region", weight: 0.9 },
  "sig-us-ops": { id: "sig-us-ops", name: "US Operations", type: "region", weight: 0.9 },
  "sig-pii-data": { id: "sig-pii-data", name: "Handles PII", type: "data", weight: 1.0 },
  "sig-health-data": { id: "sig-health-data", name: "Health Data", type: "data", weight: 1.0 },
  "sig-financial-data": { id: "sig-financial-data", name: "Financial Data", type: "data", weight: 1.0 },
  "sig-classified-data": { id: "sig-classified-data", name: "Classified Data", type: "data", weight: 1.0 },
  "sig-finance-sector": { id: "sig-finance-sector", name: "Finance Sector", type: "sector", weight: 1.0 },
  "sig-health-sector": { id: "sig-health-sector", name: "Healthcare Sector", type: "sector", weight: 1.0 },
  "sig-tech-sector": { id: "sig-tech-sector", name: "Technology Sector", type: "sector", weight: 0.8 },
  "sig-gov-sector": { id: "sig-gov-sector", name: "Government Sector", type: "sector", weight: 1.0 },
  "sig-energy-sector": { id: "sig-energy-sector", name: "Energy Sector", type: "sector", weight: 0.9 },
  "sig-critical-infra": { id: "sig-critical-infra", name: "Critical Infrastructure", type: "classification", weight: 1.0 },
  "sig-maturity-low": { id: "sig-maturity-low", name: "Low Maturity", type: "maturity", weight: 0.5 },
  "sig-maturity-high": { id: "sig-maturity-high", name: "High Maturity", type: "maturity", weight: 0.3 },
  "sig-audit-goal": { id: "sig-audit-goal", name: "Audit Goal", type: "goal", weight: 0.7 },
  "sig-vendor-risk": { id: "sig-vendor-risk", name: "Vendor Risk", type: "goal", weight: 0.6 },
  "sig-customer-trust": { id: "sig-customer-trust", name: "Customer Trust", type: "goal", weight: 0.7 },
};

const ANSWER_TO_SIGNAL: Record<string, Record<string, string[]>> = {
  regions: {
    ksa: ["sig-ksa-ops"],
    gcc: ["sig-gcc-ops", "sig-ksa-ops"],
    eu: ["sig-eu-ops"],
    us: ["sig-us-ops"],
    uk: ["sig-eu-ops"],
    global: ["sig-ksa-ops", "sig-eu-ops", "sig-us-ops"],
  },
  industry: {
    finance: ["sig-finance-sector", "sig-financial-data"],
    healthcare: ["sig-health-sector", "sig-health-data"],
    technology: ["sig-tech-sector"],
    government: ["sig-gov-sector"],
    energy: ["sig-energy-sector", "sig-critical-infra"],
    manufacturing: ["sig-critical-infra"],
  },
  data_types: {
    pii: ["sig-pii-data"],
    health: ["sig-health-data"],
    financial: ["sig-financial-data"],
    classified: ["sig-classified-data"],
    auth: ["sig-pii-data"],
    children: ["sig-pii-data"],
  },
  maturity: {
    none: ["sig-maturity-low"],
    basic: ["sig-maturity-low"],
    moderate: [],
    advanced: ["sig-maturity-high"],
  },
  goals: {
    customer_trust: ["sig-customer-trust"],
    audit_ready: ["sig-audit-goal"],
    vendor_risk: ["sig-vendor-risk"],
  },
};

interface RuleDefinition {
  targetType: "regulator" | "framework";
  targetId: string;
  targetName: string;
  requiredSignals: string[];
  optionalSignals: string[];
  baseConfidence: number;
  reason: string;
  reasonAr: string;
  priority: string;
}

const INFERENCE_RULES: RuleDefinition[] = [
  { targetType: "regulator", targetId: "REG-KSA-NCA", targetName: "National Cybersecurity Authority (NCA)", requiredSignals: ["sig-ksa-ops"], optionalSignals: [], baseConfidence: 1.0, reason: "All organizations operating in KSA must comply with NCA regulations", reasonAr: "جميع المنظمات العاملة في السعودية يجب أن تلتزم بأنظمة الهيئة الوطنية للأمن السيبراني", priority: "essential" },
  { targetType: "regulator", targetId: "REG-KSA-SDAIA", targetName: "Saudi Data & AI Authority (SDAIA)", requiredSignals: ["sig-ksa-ops", "sig-pii-data"], optionalSignals: [], baseConfidence: 0.95, reason: "PDPL applies to all personal data processing in KSA", reasonAr: "نظام حماية البيانات الشخصية ينطبق على جميع عمليات معالجة البيانات الشخصية في السعودية", priority: "essential" },
  { targetType: "regulator", targetId: "REG-KSA-SAMA", targetName: "Saudi Central Bank (SAMA)", requiredSignals: ["sig-ksa-ops", "sig-finance-sector"], optionalSignals: ["sig-financial-data"], baseConfidence: 1.0, reason: "Financial institutions in KSA are regulated by SAMA", reasonAr: "المؤسسات المالية في السعودية تخضع لرقابة البنك المركزي السعودي", priority: "essential" },
  { targetType: "regulator", targetId: "REG-KSA-MOH", targetName: "Ministry of Health (MOH)", requiredSignals: ["sig-ksa-ops", "sig-health-sector"], optionalSignals: ["sig-health-data"], baseConfidence: 0.9, reason: "Healthcare entities in KSA are regulated by MOH", reasonAr: "الجهات الصحية في السعودية تخضع لرقابة وزارة الصحة", priority: "essential" },
  { targetType: "framework", targetId: "INST-KSA-NCA-ECC", targetName: "NCA ECC (Essential Cybersecurity Controls)", requiredSignals: ["sig-ksa-ops"], optionalSignals: [], baseConfidence: 1.0, reason: "NCA ECC is mandatory for all KSA organizations", reasonAr: "الضوابط الأساسية للأمن السيبراني إلزامية لجميع المنظمات السعودية", priority: "essential" },
  { targetType: "framework", targetId: "INST-KSA-SDAIA-PDPL", targetName: "PDPL (Personal Data Protection Law)", requiredSignals: ["sig-ksa-ops", "sig-pii-data"], optionalSignals: [], baseConfidence: 0.95, reason: "PDPL applies to personal data processing in KSA", reasonAr: "نظام حماية البيانات الشخصية ينطبق على معالجة البيانات الشخصية في السعودية", priority: "essential" },
  { targetType: "framework", targetId: "INST-KSA-SAMA-CSF", targetName: "SAMA Cyber Security Framework", requiredSignals: ["sig-ksa-ops", "sig-finance-sector"], optionalSignals: ["sig-financial-data"], baseConfidence: 1.0, reason: "SAMA CSF mandatory for financial institutions", reasonAr: "إطار الأمن السيبراني للبنك المركزي إلزامي للمؤسسات المالية", priority: "essential" },
  { targetType: "framework", targetId: "INST-KSA-NCA-CCC", targetName: "NCA CCC (Critical Systems Controls)", requiredSignals: ["sig-ksa-ops", "sig-critical-infra"], optionalSignals: ["sig-energy-sector"], baseConfidence: 0.85, reason: "CCC applies to critical infrastructure operators", reasonAr: "ضوابط الأنظمة الحساسة تنطبق على مشغلي البنى التحتية الحرجة", priority: "essential" },
  { targetType: "framework", targetId: "GDPR", targetName: "General Data Protection Regulation", requiredSignals: ["sig-eu-ops", "sig-pii-data"], optionalSignals: [], baseConfidence: 0.9, reason: "GDPR applies when processing EU data subjects' data", reasonAr: "اللائحة العامة لحماية البيانات تنطبق عند معالجة بيانات مواطني الاتحاد الأوروبي", priority: "essential" },
  { targetType: "framework", targetId: "HIPAA", targetName: "HIPAA", requiredSignals: ["sig-us-ops", "sig-health-data"], optionalSignals: ["sig-health-sector"], baseConfidence: 0.9, reason: "HIPAA applies to US health data", reasonAr: "قانون HIPAA ينطبق على البيانات الصحية في الولايات المتحدة", priority: "essential" },
  { targetType: "framework", targetId: "SOC2", targetName: "SOC 2", requiredSignals: ["sig-tech-sector"], optionalSignals: ["sig-customer-trust"], baseConfidence: 0.7, reason: "SOC 2 is the industry standard for technology trust", reasonAr: "SOC 2 هو المعيار الصناعي لثقة التقنية", priority: "recommended" },
  { targetType: "framework", targetId: "ISO27001", targetName: "ISO 27001", requiredSignals: [], optionalSignals: ["sig-audit-goal", "sig-customer-trust"], baseConfidence: 0.6, reason: "ISO 27001 is the international gold standard", reasonAr: "ISO 27001 هو المعيار الذهبي الدولي", priority: "recommended" },
];

export function emitSignals(answers: Record<string, unknown>): EmittedSignal[] {
  const emitted = new Map<string, EmittedSignal>();

  for (const [answerKey, mapping] of Object.entries(ANSWER_TO_SIGNAL)) {
    const answerValue = answers[answerKey];
    if (!answerValue) continue;

    const values = Array.isArray(answerValue) ? answerValue : [answerValue];
    for (const val of values) {
      const signalIds = mapping[val];
      if (!signalIds) continue;

      for (const sigId of signalIds) {
        const def = SIGNAL_MAP[sigId];
        if (!def) continue;
        if (!emitted.has(sigId)) {
          emitted.set(sigId, { signalId: sigId, source: answerKey, value: val, confidence: def.weight });
        }
      }
    }
  }

  return Array.from(emitted.values());
}

export function runInference(answers: Record<string, unknown>): InferenceResult {
  const signals = emitSignals(answers);
  const signalIds = new Set(signals.map(s => s.signalId));

  const regulators: InferredEntity[] = [];
  const frameworks: InferredEntity[] = [];
  const reasons: ExplainabilityEntry[] = [];

  for (const rule of INFERENCE_RULES) {
    const hasAllRequired = rule.requiredSignals.every(s => signalIds.has(s));
    if (!hasAllRequired && rule.requiredSignals.length > 0) continue;

    const optionalHits = rule.optionalSignals.filter(s => signalIds.has(s)).length;
    const optionalBoost = rule.optionalSignals.length > 0 ? (optionalHits / rule.optionalSignals.length) * 0.1 : 0;
    const confidence = Math.min(1.0, rule.baseConfidence + optionalBoost);

    if (rule.requiredSignals.length === 0 && confidence < 0.5) continue;

    const entity: InferredEntity = {
      id: rule.targetId,
      name: rule.targetName,
      confidence,
      priority: rule.priority,
      reasons: [rule.reason],
    };

    const explainEntry: ExplainabilityEntry = {
      targetId: rule.targetId,
      targetName: rule.targetName,
      targetType: rule.targetType,
      reason: rule.reason,
      reasonAr: rule.reasonAr,
      confidence,
      triggeringSignals: [...rule.requiredSignals, ...rule.optionalSignals.filter(s => signalIds.has(s))],
    };

    if (rule.targetType === "regulator") {
      regulators.push(entity);
    } else {
      frameworks.push(entity);
    }
    reasons.push(explainEntry);
  }

  const fwIds = frameworks.map(f => f.id);
  const controls = generateControlsFromFrameworks(fwIds);

  return {
    regulators: regulators.sort((a, b) => b.confidence - a.confidence),
    frameworks: frameworks.sort((a, b) => b.confidence - a.confidence),
    controls,
    reasons,
    signalSummary: signals,
    questionCount: Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null).length,
  };
}

function generateControlsFromFrameworks(frameworkIds: string[]): InferredControl[] {
  const controls: InferredControl[] = [
    { id: uuid().slice(0, 8), title: "Multi-Factor Authentication", frameworks: frameworkIds, automatable: true, priority: "critical" },
    { id: uuid().slice(0, 8), title: "Encryption at Rest & Transit", frameworks: frameworkIds, automatable: true, priority: "critical" },
    { id: uuid().slice(0, 8), title: "Access Reviews (Quarterly)", frameworks: frameworkIds, automatable: false, priority: "high" },
    { id: uuid().slice(0, 8), title: "Vulnerability Scanning", frameworks: frameworkIds, automatable: true, priority: "high" },
    { id: uuid().slice(0, 8), title: "Security Awareness Training", frameworks: frameworkIds, automatable: false, priority: "high" },
    { id: uuid().slice(0, 8), title: "Backup & Recovery Testing", frameworks: frameworkIds, automatable: true, priority: "medium" },
    { id: uuid().slice(0, 8), title: "Logging & Monitoring", frameworks: frameworkIds, automatable: true, priority: "critical" },
    { id: uuid().slice(0, 8), title: "Change Management Process", frameworks: frameworkIds, automatable: false, priority: "medium" },
    { id: uuid().slice(0, 8), title: "Incident Response Plan", frameworks: frameworkIds, automatable: false, priority: "critical" },
    { id: uuid().slice(0, 8), title: "Asset Inventory Management", frameworks: frameworkIds, automatable: true, priority: "high" },
  ];

  if (frameworkIds.includes("INST-KSA-NCA-ECC")) {
    controls.push(
      { id: uuid().slice(0, 8), title: "Cybersecurity Strategy Document", frameworks: ["INST-KSA-NCA-ECC"], automatable: false, priority: "critical" },
      { id: uuid().slice(0, 8), title: "Cybersecurity Committee Establishment", frameworks: ["INST-KSA-NCA-ECC"], automatable: false, priority: "high" },
    );
  }

  if (frameworkIds.includes("INST-KSA-SDAIA-PDPL")) {
    controls.push(
      { id: uuid().slice(0, 8), title: "Data Subject Rights Process", frameworks: ["INST-KSA-SDAIA-PDPL"], automatable: false, priority: "critical" },
      { id: uuid().slice(0, 8), title: "Privacy Impact Assessment", frameworks: ["INST-KSA-SDAIA-PDPL"], automatable: false, priority: "high" },
    );
  }

  if (frameworkIds.includes("INST-KSA-SAMA-CSF")) {
    controls.push(
      { id: uuid().slice(0, 8), title: "Financial Transaction Monitoring", frameworks: ["INST-KSA-SAMA-CSF"], automatable: true, priority: "critical" },
    );
  }

  return controls;
}
