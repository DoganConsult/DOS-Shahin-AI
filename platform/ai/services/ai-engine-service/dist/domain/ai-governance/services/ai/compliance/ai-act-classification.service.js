// ============================================
// AGRC-OS -- EU AI Act Risk Classification
// & AI Impact Assessment Service
//
// Implements EU AI Act Article 5-52 classification
// logic, AI impact assessment creation, and
// risk scoring for AI systems under governance.
// ============================================
import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { getFirstRow } from '@dos/db';
// === EU AI Act Classification Rules ===
/** Keywords that indicate unacceptable risk under Article 5 */
const UNACCEPTABLE_KEYWORDS = [
    'social_scoring', 'social scoring', 'citizen scoring',
    'real-time biometric', 'realtime biometric', 'live biometric', 'mass surveillance',
    'subliminal manipulation', 'subliminal', 'dark pattern',
    'exploit vulnerabilities', 'cognitive manipulation',
];
/** Domains and use cases that indicate high risk under Articles 6-51 */
const HIGH_RISK_DOMAINS = [
    'biometric identification', 'biometric', 'facial recognition',
    'critical infrastructure', 'energy grid', 'water supply', 'transport safety',
    'education', 'vocational training', 'student assessment', 'exam scoring',
    'employment', 'recruitment', 'hiring', 'worker management', 'hr screening',
    'law enforcement', 'predictive policing', 'criminal risk',
    'migration', 'border control', 'asylum', 'visa processing',
    'justice', 'judicial', 'court', 'sentencing',
    'credit scoring', 'insurance pricing', 'medical diagnosis', 'medical device',
];
/** Use cases that indicate limited risk under Article 52 */
const LIMITED_RISK_KEYWORDS = [
    'chatbot', 'conversational ai', 'virtual assistant',
    'emotion recognition', 'sentiment analysis', 'emotion detection',
    'deepfake', 'synthetic media', 'generated content',
    'text generation', 'image generation',
];
/** EU AI Act article definitions mapped to risk levels */
const ARTICLE_DEFINITIONS = {
    unacceptable: {
        articles: ['Article 5'],
        description: 'Prohibited AI practices',
    },
    high: {
        articles: [
            'Article 6', 'Article 7', 'Article 8', 'Article 9', 'Article 10',
            'Article 11', 'Article 12', 'Article 13', 'Article 14', 'Article 15',
            'Article 16', 'Article 17', 'Article 18', 'Article 19', 'Article 20',
            'Article 21', 'Article 22', 'Article 23', 'Article 24', 'Article 25',
            'Article 26', 'Article 27', 'Article 28', 'Article 29',
            'Article 40', 'Article 41', 'Article 42', 'Article 43',
            'Article 44', 'Article 45', 'Article 46', 'Article 47',
            'Article 48', 'Article 49', 'Article 50', 'Article 51',
        ],
        description: 'High-risk AI systems with mandatory requirements',
    },
    limited: {
        articles: ['Article 52'],
        description: 'Limited risk with transparency obligations',
    },
    minimal: {
        articles: [],
        description: 'Minimal risk with voluntary codes of conduct',
    },
};
/** Required actions per high-risk article category */
const HIGH_RISK_REQUIRED_ACTIONS = [
    {
        article: 'Article 9',
        requirement_en: 'Establish a risk management system throughout the AI system lifecycle',
        requirement_ar: 'إنشاء نظام إدارة مخاطر على مدار دورة حياة نظام الذكاء الاصطناعي',
        status: 'not_assessed',
        priority: 'critical',
    },
    {
        article: 'Article 10',
        requirement_en: 'Ensure training data governance: quality criteria, bias examination, representativeness',
        requirement_ar: 'ضمان حوكمة بيانات التدريب: معايير الجودة وفحص التحيز والتمثيل',
        status: 'not_assessed',
        priority: 'critical',
    },
    {
        article: 'Article 11',
        requirement_en: 'Maintain technical documentation demonstrating compliance',
        requirement_ar: 'الحفاظ على الوثائق التقنية التي تثبت الامتثال',
        status: 'not_assessed',
        priority: 'high',
    },
    {
        article: 'Article 12',
        requirement_en: 'Implement automatic recording of events (logging) for traceability',
        requirement_ar: 'تنفيذ التسجيل التلقائي للأحداث لتحقيق قابلية التتبع',
        status: 'not_assessed',
        priority: 'high',
    },
    {
        article: 'Article 13',
        requirement_en: 'Design system for sufficient transparency and provision of information to users',
        requirement_ar: 'تصميم النظام لتحقيق شفافية كافية وتوفير المعلومات للمستخدمين',
        status: 'not_assessed',
        priority: 'high',
    },
    {
        article: 'Article 14',
        requirement_en: 'Enable effective human oversight during operation',
        requirement_ar: 'تمكين الرقابة البشرية الفعالة أثناء التشغيل',
        status: 'not_assessed',
        priority: 'critical',
    },
    {
        article: 'Article 15',
        requirement_en: 'Achieve appropriate levels of accuracy, robustness, and cybersecurity',
        requirement_ar: 'تحقيق مستويات مناسبة من الدقة والمتانة والأمن السيبراني',
        status: 'not_assessed',
        priority: 'high',
    },
    {
        article: 'Article 17',
        requirement_en: 'Implement quality management system',
        requirement_ar: 'تنفيذ نظام إدارة الجودة',
        status: 'not_assessed',
        priority: 'medium',
    },
    {
        article: 'Article 29',
        requirement_en: 'Ensure deployer obligations including human oversight and monitoring',
        requirement_ar: 'ضمان التزامات المنشر بما في ذلك الرقابة البشرية والمراقبة',
        status: 'not_assessed',
        priority: 'medium',
    },
];
/** Required actions for limited-risk systems */
const LIMITED_RISK_REQUIRED_ACTIONS = [
    {
        article: 'Article 52(1)',
        requirement_en: 'Notify users that they are interacting with an AI system',
        requirement_ar: 'إبلاغ المستخدمين بأنهم يتعاملون مع نظام ذكاء اصطناعي',
        status: 'not_assessed',
        priority: 'medium',
    },
    {
        article: 'Article 52(2)',
        requirement_en: 'Disclose emotion recognition or biometric categorization to subjects',
        requirement_ar: 'الإفصاح عن التعرف على المشاعر أو التصنيف البيومتري للأشخاص المعنيين',
        status: 'not_assessed',
        priority: 'medium',
    },
    {
        article: 'Article 52(3)',
        requirement_en: 'Label AI-generated or manipulated content (deepfakes) as artificially created',
        requirement_ar: 'تصنيف المحتوى المنشأ أو المعدل بالذكاء الاصطناعي على أنه مصطنع',
        status: 'not_assessed',
        priority: 'high',
    },
];
// === AIIA Section Definitions ===
/** The 6 standard sections for an AI Impact Assessment */
const AIIA_SECTIONS = [
    {
        section_code: 'SYS_DESC',
        title_en: 'System Description',
        title_ar: 'وصف النظام',
        questions: [
            { code: 'SD01', question_en: 'What is the primary purpose of this AI system?', question_ar: 'ما هو الغرض الأساسي من نظام الذكاء الاصطناعي هذا؟', answer: null, risk_impact: null },
            { code: 'SD02', question_en: 'What is the intended scope and scale of deployment?', question_ar: 'ما هو النطاق والحجم المقصود للنشر؟', answer: null, risk_impact: null },
            { code: 'SD03', question_en: 'Who are the primary stakeholders and affected persons?', question_ar: 'من هم أصحاب المصلحة الرئيسيون والأشخاص المتأثرون؟', answer: null, risk_impact: null },
            { code: 'SD04', question_en: 'What decisions does this system make or support?', question_ar: 'ما هي القرارات التي يتخذها أو يدعمها هذا النظام؟', answer: null, risk_impact: null },
        ],
    },
    {
        section_code: 'DATA_GOV',
        title_en: 'Data Governance',
        title_ar: 'حوكمة البيانات',
        questions: [
            { code: 'DG01', question_en: 'What training data sources are used and how were they validated?', question_ar: 'ما هي مصادر بيانات التدريب المستخدمة وكيف تم التحقق منها؟', answer: null, risk_impact: null },
            { code: 'DG02', question_en: 'Has a bias assessment been conducted on the training data?', question_ar: 'هل تم إجراء تقييم للتحيز على بيانات التدريب؟', answer: null, risk_impact: null },
            { code: 'DG03', question_en: 'What data quality measures are in place?', question_ar: 'ما هي تدابير جودة البيانات المعمول بها؟', answer: null, risk_impact: null },
            { code: 'DG04', question_en: 'Does the system process personal or sensitive data?', question_ar: 'هل يعالج النظام بيانات شخصية أو حساسة؟', answer: null, risk_impact: null },
            { code: 'DG05', question_en: 'What data retention and deletion policies apply?', question_ar: 'ما هي سياسات الاحتفاظ بالبيانات وحذفها المطبقة؟', answer: null, risk_impact: null },
        ],
    },
    {
        section_code: 'TECH_ROB',
        title_en: 'Technical Robustness',
        title_ar: 'المتانة التقنية',
        questions: [
            { code: 'TR01', question_en: 'What accuracy metrics are measured and what are the current results?', question_ar: 'ما هي مقاييس الدقة المقاسة وما هي النتائج الحالية؟', answer: null, risk_impact: null },
            { code: 'TR02', question_en: 'What reliability and fault-tolerance mechanisms are implemented?', question_ar: 'ما هي آليات الموثوقية وتحمل الأخطاء المطبقة؟', answer: null, risk_impact: null },
            { code: 'TR03', question_en: 'What cybersecurity measures protect the AI system?', question_ar: 'ما هي تدابير الأمن السيبراني التي تحمي نظام الذكاء الاصطناعي؟', answer: null, risk_impact: null },
            { code: 'TR04', question_en: 'Has adversarial robustness testing been performed?', question_ar: 'هل تم إجراء اختبار المتانة ضد الهجمات العدائية؟', answer: null, risk_impact: null },
        ],
    },
    {
        section_code: 'TRANSP',
        title_en: 'Transparency',
        title_ar: 'الشفافية',
        questions: [
            { code: 'TP01', question_en: 'How are AI decisions explained to end users?', question_ar: 'كيف يتم شرح قرارات الذكاء الاصطناعي للمستخدمين النهائيين؟', answer: null, risk_impact: null },
            { code: 'TP02', question_en: 'Are users notified that they are interacting with an AI system?', question_ar: 'هل يتم إبلاغ المستخدمين بأنهم يتعاملون مع نظام ذكاء اصطناعي؟', answer: null, risk_impact: null },
            { code: 'TP03', question_en: 'What logging and audit trail mechanisms are in place?', question_ar: 'ما هي آليات التسجيل ومسار التدقيق المعمول بها؟', answer: null, risk_impact: null },
        ],
    },
    {
        section_code: 'HUMAN_OV',
        title_en: 'Human Oversight',
        title_ar: 'الرقابة البشرية',
        questions: [
            { code: 'HO01', question_en: 'What human-in-the-loop mechanisms exist for critical decisions?', question_ar: 'ما هي آليات الإنسان في الحلقة للقرارات الحرجة؟', answer: null, risk_impact: null },
            { code: 'HO02', question_en: 'Can human operators override AI decisions?', question_ar: 'هل يمكن للمشغلين البشريين تجاوز قرارات الذكاء الاصطناعي؟', answer: null, risk_impact: null },
            { code: 'HO03', question_en: 'What monitoring dashboards and alerting are available?', question_ar: 'ما هي لوحات المراقبة والتنبيهات المتاحة؟', answer: null, risk_impact: null },
            { code: 'HO04', question_en: 'What escalation procedures exist for AI system failures?', question_ar: 'ما هي إجراءات التصعيد لإخفاقات نظام الذكاء الاصطناعي؟', answer: null, risk_impact: null },
        ],
    },
    {
        section_code: 'SOC_IMP',
        title_en: 'Social Impact',
        title_ar: 'الأثر الاجتماعي',
        questions: [
            { code: 'SI01', question_en: 'What measures prevent discriminatory outcomes?', question_ar: 'ما هي التدابير التي تمنع النتائج التمييزية؟', answer: null, risk_impact: null },
            { code: 'SI02', question_en: 'What is the environmental impact of running this AI system?', question_ar: 'ما هو الأثر البيئي لتشغيل نظام الذكاء الاصطناعي هذا؟', answer: null, risk_impact: null },
            { code: 'SI03', question_en: 'Does this system impact fundamental rights (privacy, non-discrimination, freedom)?', question_ar: 'هل يؤثر هذا النظام على الحقوق الأساسية (الخصوصية، عدم التمييز، الحرية)؟', answer: null, risk_impact: null },
        ],
    },
];
// === Classification Logic ===
/**
 * Classify an AI system/model under the EU AI Act risk framework.
 *
 * Reads model metadata from the ai_asset_inventory table, applies
 * classification rules based on use_case, domain, data_types, and
 * decision_impact fields, then maps to applicable EU AI Act articles.
 */
export async function classifyAiSystem(tenantId, modelId) {
    const schema = tenantSchema(tenantId);
    const assessedAt = new Date().toISOString();
    // Read model from ai_asset_inventory
    const modelResult = await safeQuery(`SELECT asset_id, asset_key, display_name, description, metadata, tags
     FROM "${schema}".ai_asset_inventory
     WHERE asset_id = $1`, [modelId]);
    if (modelResult.rows.length === 0) {
        throw Object.assign(new Error(`Model not found: ${modelId}`), { statusCode: 404 });
    }
    const model = modelResult.rows[0];
    const metadata = (typeof model.metadata === 'string' ? JSON.parse(model.metadata) : model.metadata) || {};
    const tags = model.tags || [];
    const modelName = model.display_name || model.asset_key || modelId;
    // Collect all text fields for keyword matching
    const allText = [
        model.description || '',
        metadata.use_case || '',
        metadata.domain || '',
        metadata.decision_impact || '',
        ...(Array.isArray(metadata.data_types) ? metadata.data_types : []),
        ...tags,
    ].join(' ').toLowerCase();
    // Apply classification rules (most restrictive wins)
    const classificationReasons = [];
    let riskLevel = 'minimal';
    // Check unacceptable risk (Article 5)
    for (const keyword of UNACCEPTABLE_KEYWORDS) {
        if (allText.includes(keyword)) {
            riskLevel = 'unacceptable';
            classificationReasons.push(`Detected prohibited practice keyword: "${keyword}"`);
        }
    }
    // Check high risk (Articles 6-51)
    if (riskLevel !== 'unacceptable') {
        for (const domain of HIGH_RISK_DOMAINS) {
            if (allText.includes(domain)) {
                riskLevel = 'high';
                classificationReasons.push(`High-risk domain detected: "${domain}"`);
            }
        }
    }
    // Check limited risk (Article 52)
    if (riskLevel !== 'unacceptable' && riskLevel !== 'high') {
        for (const keyword of LIMITED_RISK_KEYWORDS) {
            if (allText.includes(keyword)) {
                riskLevel = 'limited';
                classificationReasons.push(`Limited-risk use case detected: "${keyword}"`);
            }
        }
    }
    // If no keywords matched, default to minimal
    if (classificationReasons.length === 0) {
        classificationReasons.push('No high-risk, limited-risk, or prohibited indicators detected. System classified as minimal risk.');
    }
    // Map to applicable articles
    const articleDef = ARTICLE_DEFINITIONS[riskLevel];
    const applicableArticles = [...articleDef.articles];
    // Generate required actions based on risk level
    let requiredActions = [];
    if (riskLevel === 'high') {
        requiredActions = HIGH_RISK_REQUIRED_ACTIONS.map((a) => ({ ...a }));
    }
    else if (riskLevel === 'limited') {
        requiredActions = LIMITED_RISK_REQUIRED_ACTIONS.map((a) => ({ ...a }));
    }
    else if (riskLevel === 'unacceptable') {
        requiredActions = [{
                article: 'Article 5',
                requirement_en: 'This AI practice is prohibited under the EU AI Act and must be discontinued',
                requirement_ar: 'هذه الممارسة في الذكاء الاصطناعي محظورة بموجب قانون الذكاء الاصطناعي الأوروبي ويجب إيقافها',
                status: 'non_compliant',
                priority: 'critical',
            }];
    }
    // Check existing compliance status from stored assessments
    const complianceGaps = await checkExistingCompliance(schema, modelId, requiredActions);
    return {
        model_id: modelId,
        model_name: modelName,
        risk_level: riskLevel,
        classification_reasons: classificationReasons,
        applicable_articles: applicableArticles,
        required_actions: requiredActions,
        compliance_gaps: complianceGaps,
        assessed_at: assessedAt,
    };
}
// === Impact Assessment CRUD ===
/**
 * Create a new AI Impact Assessment (AIIA) for a model.
 *
 * Generates 6 structured sections with bilingual questions.
 * Saves to ai_impact_assessments table and returns the assessment
 * with empty answers for the user to fill.
 */
export async function createAiImpactAssessment(tenantId, modelId, userId) {
    const schema = tenantSchema(tenantId);
    const assessmentId = uuid();
    // Verify model exists
    const modelResult = await safeQuery(`SELECT asset_id FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`, [modelId]);
    if (modelResult.rows.length === 0) {
        throw Object.assign(new Error(`Model not found: ${modelId}`), { statusCode: 404 });
    }
    // Deep-clone section definitions so each assessment gets its own copy
    const sections = JSON.parse(JSON.stringify(AIIA_SECTIONS));
    // Classify the model to attach classification metadata
    let classificationJson = null;
    try {
        classificationJson = await classifyAiSystem(tenantId, modelId);
    }
    catch {
        // Classification is optional; continue without it
    }
    // Insert into the assessment table
    await safeQuery(`INSERT INTO "${schema}".ai_impact_assessments
       (assessment_id, tenant_id, model_id, created_by, status,
        sections_json, recommendations_json, classification_json,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'draft', $5, '[]'::jsonb, $6, NOW(), NOW())`, [
        assessmentId,
        tenantId,
        modelId,
        userId,
        JSON.stringify(sections),
        classificationJson ? JSON.stringify(classificationJson) : null,
    ]);
    return {
        assessment_id: assessmentId,
        model_id: modelId,
        created_by: userId,
        status: 'draft',
        sections,
        overall_risk_score: 0,
        recommendations: [],
    };
}
/**
 * Retrieve an AI Impact Assessment by ID.
 */
export async function getAiImpactAssessment(tenantId, assessmentId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_impact_assessments WHERE assessment_id = $1`, [assessmentId]);
    if (result.rows.length === 0)
        return null;
    const row = getFirstRow(result);
    const sections = typeof row.sections_json === 'string'
        ? JSON.parse(row.sections_json)
        : row.sections_json || [];
    const recommendations = typeof row.recommendations_json === 'string'
        ? JSON.parse(row.recommendations_json)
        : row.recommendations_json || [];
    return {
        assessment_id: row.assessment_id,
        model_id: row.model_id,
        created_by: row.created_by,
        status: row.status,
        sections,
        overall_risk_score: parseFloat(row.overall_risk_score) || 0,
        recommendations,
    };
}
// === Risk Scoring ===
/**
 * Score an AI Impact Assessment based on answered questions.
 *
 * Computes overall risk score from question answers and risk_impact values.
 * Generates recommendations for high-risk areas.
 */
export async function scoreAiImpactAssessment(tenantId, assessmentId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_impact_assessments WHERE assessment_id = $1`, [assessmentId]);
    if (result.rows.length === 0) {
        throw Object.assign(new Error(`Assessment not found: ${assessmentId}`), { statusCode: 404 });
    }
    const row = getFirstRow(result);
    const sections = typeof row.sections_json === 'string'
        ? JSON.parse(row.sections_json)
        : row.sections_json || [];
    // Score based on answered questions and their risk_impact
    const impactWeights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let riskWeight = 0;
    let answeredCount = 0;
    let totalQuestions = 0;
    const recommendations = [];
    const sectionRisks = [];
    for (const section of sections) {
        let sectionRisk = 0;
        let sectionTotal = 0;
        for (const q of section.questions) {
            totalQuestions++;
            if (q.answer !== null && q.answer !== '') {
                answeredCount++;
                const impact = q.risk_impact || 'low';
                const weight = impactWeights[impact] || 1;
                totalWeight += 3; // max weight per question
                riskWeight += weight;
                sectionRisk += weight;
                sectionTotal += 3;
            }
            else {
                // Unanswered questions are treated as any risk (medium)
                totalWeight += 3;
                riskWeight += 2;
                sectionRisk += 2;
                sectionTotal += 3;
            }
        }
        const sectionScore = sectionTotal > 0 ? Math.round((sectionRisk / sectionTotal) * 100) : 50;
        sectionRisks.push({ code: section.section_code, title: section.title_en, risk: sectionScore });
        // Generate recommendations for high-risk sections
        if (sectionScore >= 70) {
            recommendations.push(`High risk identified in "${section.title_en}" (${section.title_ar}). ` +
                `Immediate mitigation actions are recommended.`);
        }
        else if (sectionScore >= 50) {
            recommendations.push(`Moderate risk in "${section.title_en}". Review and strengthen controls.`);
        }
    }
    // Add recommendation if many questions are unanswered
    if (answeredCount < totalQuestions * 0.5) {
        recommendations.unshift(`Only ${answeredCount} of ${totalQuestions} questions answered. ` +
            `Complete the assessment for an accurate risk score.`);
    }
    // Overall risk score: 0 = no risk, 100 = maximum risk
    const riskScore = totalWeight > 0 ? Math.round((riskWeight / totalWeight) * 100) : 50;
    // Determine risk level label
    let riskLevel = null;
    if (riskScore >= 75)
        riskLevel = 'high';
    else if (riskScore >= 50)
        riskLevel = 'limited';
    else
        riskLevel = 'minimal';
    // Update the assessment record with the computed score
    await safeQuery(`UPDATE "${schema}".ai_impact_assessments
     SET overall_risk_score = $1,
         risk_level = $2,
         recommendations_json = $3,
         updated_at = NOW()
     WHERE assessment_id = $4`, [riskScore, riskLevel, JSON.stringify(recommendations), assessmentId]);
    return { risk_score: riskScore, recommendations };
}
// === Helpers ===
/**
 * Check existing compliance status for a model by looking at
 * previously stored assessments.
 */
async function checkExistingCompliance(schema, modelId, _requiredActions) {
    const gaps = [];
    // Check if an impact assessment already exists for this model
    const existingResult = await safeQuery(`SELECT assessment_id, status, overall_risk_score, sections_json
     FROM "${schema}".ai_impact_assessments
     WHERE model_id = $1
     ORDER BY created_at DESC
     LIMIT 1`, [modelId]);
    if (existingResult.rows.length === 0) {
        gaps.push('No AI Impact Assessment has been conducted for this system');
        return gaps;
    }
    const existing = existingResult.rows[0];
    if (existing.status === 'draft') {
        gaps.push('AI Impact Assessment is still in draft status');
    }
    if (existing.status !== 'approved') {
        gaps.push('AI Impact Assessment has not been approved');
    }
    // Check sections for unanswered questions
    const sections = typeof existing.sections_json === 'string'
        ? JSON.parse(existing.sections_json)
        : existing.sections_json || [];
    for (const section of sections) {
        const unanswered = section.questions.filter((q) => !q.answer);
        if (unanswered.length > 0) {
            gaps.push(`${unanswered.length} unanswered question(s) in "${section.title_en}"`);
        }
    }
    return gaps;
}
/**
 * Ensure the ai_impact_assessments table exists in the tenant schema.
 * Called defensively before operations if migrations have not yet run.
 */
export async function ensureAiImpactAssessmentsTable(tenantId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_impact_assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      model_id UUID NOT NULL,
      created_by UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      risk_level VARCHAR(20),
      overall_risk_score NUMERIC(5,2),
      sections_json JSONB DEFAULT '[]',
      recommendations_json JSONB DEFAULT '[]',
      classification_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_aiia_tenant ON "${schema}".ai_impact_assessments(tenant_id)`);
    await safeQuery(`CREATE INDEX IF NOT EXISTS idx_aiia_model ON "${schema}".ai_impact_assessments(model_id)`);
}
//# sourceMappingURL=ai-act-classification.service.js.map