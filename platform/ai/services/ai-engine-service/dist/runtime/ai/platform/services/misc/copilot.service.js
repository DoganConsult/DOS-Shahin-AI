import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { runAgentWithTools } from '../../../ports/agent-executor.port';
import crypto from 'crypto';
import { logger } from '../../../ports/logger.port';
// ── Table setup (memoized) ────────────────────────────────────────
const _ensuredSchemas = new Set();
async function ensureCopilotTables(schema) {
    if (_ensuredSchemas.has(schema))
        return;
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".copilot_sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      agent_id VARCHAR(10),
      page_context TEXT,
      message_count INT DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_copilot_sessions_tenant ON "${schema}".copilot_sessions (tenant_id, user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".copilot_messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      tenant_id VARCHAR(64) NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      agent_id VARCHAR(10),
      tool_calls JSONB DEFAULT '[]',
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      duration_ms INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_copilot_messages_session ON "${schema}".copilot_messages (session_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS "${schema}".agent_performance_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(10) NOT NULL,
      session_id VARCHAR(255),
      duration_ms INT NOT NULL,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      tool_calls INT DEFAULT 0,
      stop_reason VARCHAR(50),
      is_error BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agent_perf_agent ON "${schema}".agent_performance_log (agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_perf_tenant ON "${schema}".agent_performance_log (tenant_id, created_at DESC);
  `).catch(() => null);
    _ensuredSchemas.add(schema);
}
// ── Main query handler ────────────────────────────────────────────
export async function handleQuery(tenantId, userId, sessionId, query, opts) {
    const agentId = opts.activeAgentId || 'A01';
    const schema = tenantSchema(tenantId);
    await ensureCopilotTables(schema);
    // Upsert session
    await safeQuery(`INSERT INTO "${schema}".copilot_sessions (session_id, tenant_id, user_id, agent_id, page_context, message_count)
     VALUES ($1, $2, $3, $4, $5, 1)
     ON CONFLICT (session_id) DO UPDATE SET message_count = copilot_sessions.message_count + 1, agent_id = $4`, [sessionId, tenantId, userId, agentId, opts.pageContext || null]).catch(() => null);
    // Persist user message
    await safeQuery(`INSERT INTO "${schema}".copilot_messages (session_id, tenant_id, role, content, agent_id) VALUES ($1, $2, 'user', $3, $4)`, [sessionId, tenantId, query, agentId]).catch(() => null);
    const context = { userId, pageContext: opts.pageContext, sessionId };
    const runResult = await runAgentWithTools(tenantId, agentId, context, query, { maxSteps: 5 });
    const proposedActions = runResult.toolResults.map(tool => ({
        id: tool.toolCallId || crypto.randomUUID(),
        type: tool.toolName,
        title: `Executed: ${tool.toolName.replace(/_/g, ' ')}`,
        description: tool.isError ? `Error: ${JSON.stringify(tool.output)}` : 'Successfully completed autonomously.',
        priority: 'medium',
        status: tool.isError ? 'failed' : 'auto_completed',
        actionData: tool.output
    }));
    const responseMessage = runResult.finalText || 'I have completed your request, but no explicit text was generated.';
    // Persist assistant message
    await safeQuery(`INSERT INTO "${schema}".copilot_messages (session_id, tenant_id, role, content, agent_id, tool_calls, tokens_in, tokens_out, duration_ms)
     VALUES ($1, $2, 'assistant', $3, $4, $5, $6, $7, $8)`, [sessionId, tenantId, responseMessage, agentId, JSON.stringify(proposedActions),
        runResult.totalInputTokens, runResult.totalOutputTokens, runResult.durationMs]).catch(() => null);
    // Record performance
    await recordAgentPerformance(tenantId, agentId, runResult.durationMs, {
        inputTokens: runResult.totalInputTokens,
        outputTokens: runResult.totalOutputTokens,
        toolCalls: runResult.totalToolCalls,
        stopReason: runResult.stopReason,
        isError: runResult.toolResults.some(t => t.isError),
        sessionId,
    }).catch(() => null);
    return {
        sessionId,
        message: responseMessage,
        agentId,
        proposedActions,
        toolName: runResult.toolResults.length > 0 ? runResult.toolResults[runResult.toolResults.length - 1].toolName : undefined,
        durationMs: runResult.durationMs,
        tokens: {
            inputTokens: runResult.totalInputTokens,
            outputTokens: runResult.totalOutputTokens
        }
    };
}
// ── Session history ───────────────────────────────────────────────
export async function getSessionHistory(sessionId, tenantId) {
    const schema = tenantSchema(tenantId);
    await ensureCopilotTables(schema);
    const result = await safeQuery(`SELECT message_id, session_id, role, content, agent_id, tool_calls, tokens_in, tokens_out, duration_ms, created_at
     FROM "${schema}".copilot_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 200`, [sessionId]);
    return result.rows;
}
// ── Agent performance ─────────────────────────────────────────────
export async function getAgentPerformance(agentId) {
    // Return aggregated performance across all tenants that have data
    // Uses the public schema for cross-tenant aggregation, or per-tenant if scoped
    try {
        const query = agentId
            ? `SELECT agent_id, COUNT(*) as total_runs,
            AVG(duration_ms)::int as avg_duration_ms,
            SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out,
            SUM(tool_calls) as total_tool_calls,
            COUNT(*) FILTER (WHERE is_error) as error_count,
            MAX(created_at) as last_run_at
          FROM public.agent_performance_log WHERE agent_id = $1
          GROUP BY agent_id`
            : `SELECT agent_id, COUNT(*) as total_runs,
            AVG(duration_ms)::int as avg_duration_ms,
            SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out,
            SUM(tool_calls) as total_tool_calls,
            COUNT(*) FILTER (WHERE is_error) as error_count,
            MAX(created_at) as last_run_at
          FROM public.agent_performance_log
          GROUP BY agent_id ORDER BY agent_id`;
        const result = await safeQuery(query, agentId ? [agentId] : []);
        return result.rows;
    }
    catch {
        return [];
    }
}
// ── Suggestions ───────────────────────────────────────────────────
export async function buildSuggestions(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    // Build context-aware suggestions based on agent domain and recent activity
    const suggestions = [];
    try {
        // Check for recent errors or pending items in the agent's domain
        const recentErrors = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".agent_performance_log
       WHERE agent_id = $1 AND is_error = TRUE AND created_at > NOW() - INTERVAL '24 hours'`, [agentId]);
        if (recentErrors.rows[0]?.cnt > 0) {
            suggestions.push({
                type: 'warning',
                text: `${recentErrors.rows[0].cnt} error(s) in the last 24h for this agent. Review recent runs.`,
                action: 'review_errors',
            });
        }
        // Check for pending delegations to this agent
        const pendingDelegations = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".agent_delegations
       WHERE target_agent_id = $1 AND status = 'pending'`, [agentId]).catch(() => ({ rows: [{ cnt: 0 }] }));
        if (pendingDelegations.rows[0]?.cnt > 0) {
            suggestions.push({
                type: 'info',
                text: `${pendingDelegations.rows[0].cnt} pending delegation(s) await this agent.`,
                action: 'view_delegations',
            });
        }
    }
    catch { /* suggestions must never break the UI */ }
    return { suggestions };
}
// ── Landing-page public agents (canonical; matches Shahin-AI Website + agrc-agents) ──
export function getCanonicalPublicAgentsForLanding() {
    return [
        {
            id: 'A01',
            name: 'Onboarding Agent',
            nameAr: 'وكيل الإعداد',
            summary: 'Guides new tenants through onboarding: collects industry, size, licenses, IT landscape, and recommends applicable KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, etc.). Generates workspace seed configuration.',
            summaryAr: 'يوجه المستأجرين الجدد عبر الإعداد: يجمع بيانات القطاع والحجم والتراخيص ويوصي بالأطر التنظيمية السعودية المناسبة.',
            image: 'agents/A01.png',
            quickPrompts: [
                { en: 'Check workspace health', ar: 'فحص صحة مساحة العمل' },
                { en: 'What frameworks should we adopt?', ar: 'ما الأطر التي يجب اعتمادها؟' },
                { en: 'Show onboarding progress', ar: 'عرض تقدم الإعداد' },
            ],
        },
        {
            id: 'A02',
            name: 'Identity Provisioning Agent',
            nameAr: 'وكيل توفير الهويات',
            summary: 'User provisioning and RBAC: detects access anomalies, enforces least-privilege and MFA posture, supports SSO patterns (Azure AD / OIDC), and surfaces role distribution and over-privileged accounts for review.',
            summaryAr: 'توفير المستخدمين وRBAC: يكشف حالات الوصول الشاذة ويفرض أقل الصلاحيات ووضع المصادقة الثنائية، ويدعم أنماط SSO، ويعرض توزيع الأدوار والحسابات ذات الصلاحيات المفرطة للمراجعة.',
            image: 'agents/A02.png',
            quickPrompts: [
                { en: 'Show users without MFA', ar: 'عرض المستخدمين بدون مصادقة ثنائية' },
                { en: 'Check role distribution', ar: 'فحص توزيع الأدوار' },
                { en: 'Flag over-privileged accounts', ar: 'تحديد الحسابات ذات الصلاحيات المفرطة' },
            ],
        },
        {
            id: 'A03',
            name: 'Framework Mapping Agent',
            nameAr: 'وكيل رسم الأطر',
            summary: 'Maps controls across KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, ISO 27001, PCI-DSS). Identifies overlapping requirements, reduces duplicate effort, and produces unified control matrices with confidence scores.',
            summaryAr: 'يربط الضوابط عبر الأطر التنظيمية السعودية ويحدد المتطلبات المتداخلة وينتج مصفوفات ضوابط موحدة.',
            image: 'agents/A03.png',
            quickPrompts: [
                { en: 'Show framework coverage gaps', ar: 'عرض فجوات تغطية الأطر' },
                { en: 'Compare NCA-ECC vs SAMA-CSF', ar: 'مقارنة NCA-ECC مع SAMA-CSF' },
                { en: 'List unmapped controls', ar: 'عرض الضوابط غير المربوطة' },
            ],
        },
        {
            id: 'A04',
            name: 'Control Authoring Agent',
            nameAr: 'وكيل تأليف الضوابط',
            summary: 'Drafts compliance controls, security policies, and implementation procedures aligned with KSA regulatory requirements. Generates bilingual (EN/AR) content with proper regulatory citations, maturity level targets, and evidence requirements.',
            summaryAr: 'يصيغ ضوابط الامتثال والسياسات الأمنية وإجراءات التنفيذ المتوافقة مع المتطلبات التنظيمية السعودية.',
            image: 'agents/A04.png',
            quickPrompts: [
                { en: 'Draft missing control documentation', ar: 'صياغة توثيق الضوابط المفقودة' },
                { en: 'Show controls needing test procedures', ar: 'عرض الضوابط التي تحتاج إجراءات اختبار' },
                { en: 'Generate implementation guidance', ar: 'إنشاء دليل التنفيذ' },
            ],
        },
        {
            id: 'A05',
            name: 'Evidence Collection Agent',
            nameAr: 'وكيل جمع الأدلة',
            summary: 'Automates evidence gathering for compliance assessments. Analyzes uploaded documents (policies, screenshots, logs, certificates) to determine which controls they satisfy. Tracks evidence freshness, identifies gaps, and suggests required artifacts.',
            summaryAr: 'يؤتمت جمع الأدلة لتقييمات الامتثال ويحلل المستندات المرفوعة ويتتبع حداثة الأدلة ويحدد الثغرات.',
            image: 'agents/A05.png',
            quickPrompts: [
                { en: 'Show expired evidence items', ar: 'عرض الأدلة المنتهية' },
                { en: 'Which controls lack evidence?', ar: 'ما الضوابط التي تفتقر إلى أدلة؟' },
                { en: 'Check evidence freshness', ar: 'فحص حداثة الأدلة' },
            ],
        },
        {
            id: 'A06',
            name: 'Gap Remediation Agent',
            nameAr: 'وكيل معالجة الثغرات',
            summary: 'Analyzes assessment results to identify compliance gaps, calculates risk-weighted priority scores, generates phased remediation roadmaps with timelines, resource estimates, and projected compliance score improvements.',
            summaryAr: 'يحلل نتائج التقييم لتحديد فجوات الامتثال ويحسب أولويات المخاطر وينشئ خرائط طريق معالجة مرحلية.',
            image: 'agents/A06.png',
            quickPrompts: [
                { en: 'Show overdue remediations', ar: 'عرض المعالجات المتأخرة' },
                { en: 'Analyze open compliance gaps', ar: 'تحليل ثغرات الامتثال المفتوحة' },
                { en: 'Generate remediation roadmap', ar: 'إنشاء خريطة طريق المعالجة' },
            ],
        },
        {
            id: 'A07',
            name: 'Risk Register Agent',
            nameAr: 'وكيل سجل المخاطر',
            summary: 'Manages the enterprise risk register; identifies cyber, compliance, and operational risks; scores using likelihood x impact matrices (5x5); recommends treatment strategies (Mitigate, Transfer, Accept, Avoid); tracks Key Risk Indicators (KRIs) and risk appetite thresholds.',
            summaryAr: 'يدير سجل المخاطر المؤسسية ويحدد المخاطر السيبرانية والامتثالية ويقيّم باستخدام مصفوفات الاحتمال × الأثر.',
            image: 'agents/A07.png',
            quickPrompts: [
                { en: 'Show top risks by score', ar: 'عرض أعلى المخاطر حسب الدرجة' },
                { en: 'Score unscored risks', ar: 'تقييم المخاطر غير المسجلة' },
                { en: 'Check risk appetite breaches', ar: 'فحص تجاوزات شهية المخاطر' },
                { en: 'Generate risk heatmap', ar: 'إنشاء خريطة حرارية للمخاطر' },
            ],
        },
        {
            id: 'A08',
            name: 'Policy Lifecycle Agent',
            nameAr: 'وكيل دورة حياة السياسات',
            summary: 'Manages the complete policy lifecycle: drafting, review, approval, publication, distribution, acknowledgment tracking, periodic review, and retirement. Monitors regulatory changes that require policy updates and triggers review workflows automatically.',
            summaryAr: 'يدير دورة حياة السياسات الكاملة من الصياغة إلى المراجعة والاعتماد والنشر والتقاعد.',
            image: 'agents/A08.png',
            quickPrompts: [
                { en: 'Show policies overdue for review', ar: 'عرض السياسات المتأخرة للمراجعة' },
                { en: 'List pending policy approvals', ar: 'عرض الموافقات المعلقة' },
                { en: 'Check policy expiry dates', ar: 'فحص تواريخ انتهاء السياسات' },
            ],
        },
        {
            id: 'A09',
            name: 'Third-Party Risk Agent',
            nameAr: 'وكيل مخاطر الأطراف الثالثة',
            summary: 'Assesses and monitors third-party/vendor risks: conducts due diligence questionnaires, evaluates vendor security posture, tracks SLA compliance, monitors for vendor breaches, and ensures supply chain alignment with NCA-ECC Third-Party Cybersecurity and SAMA-CSF requirements.',
            summaryAr: 'يقيّم ويراقب مخاطر الأطراف الثالثة ويجري استبيانات العناية الواجبة ويتتبع الامتثال لـ SLA.',
            image: 'agents/A09.png',
            quickPrompts: [
                { en: 'Show high-risk vendors', ar: 'عرض الموردين عاليي الخطورة' },
                { en: 'Vendors due for assessment', ar: 'الموردين المستحقين للتقييم' },
                { en: 'Check vendor SLA compliance', ar: 'فحص امتثال الموردين لاتفاقيات الخدمة' },
            ],
        },
        {
            id: 'A10',
            name: 'Audit Reporting Agent',
            nameAr: 'وكيل التقارير التدقيقية',
            summary: 'Generates comprehensive audit reports for regulators (NCA, SAMA, SDAIA), produces executive compliance dashboards, tracks certification status, and automates regulatory submission packages with proper formatting, Arabic translations, and evidence attachments.',
            summaryAr: 'ينشئ تقارير تدقيق شاملة للجهات الرقابية وينتج لوحات امتثال تنفيذية ويؤتمت حزم التقديم التنظيمية.',
            image: 'agents/A10.png',
            quickPrompts: [
                { en: 'Show open audit findings', ar: 'عرض نتائج التدقيق المفتوحة' },
                { en: 'Check audit readiness score', ar: 'فحص درجة جاهزية التدقيق' },
                { en: 'Generate compliance summary', ar: 'إنشاء ملخص الامتثال' },
            ],
        },
        {
            id: 'A11',
            name: 'BCP Continuity Agent',
            nameAr: 'وكيل استمرارية الأعمال',
            summary: 'Monitors business continuity readiness: BIA alignment, exercise cadence, RTO/RPO targets, dependency maps, and crisis communications discipline aligned with resilience expectations under national cybersecurity baselines.',
            summaryAr: 'يراقب جاهزية استمرارية الأعمال: محاذاة تحليل الأثر التجاري، وتيرة التمارين، وأهداف RTO/RPO، وخرائط التبعيات.',
            image: 'agents/A11.png',
            quickPrompts: [
                { en: 'Show BCP readiness score', ar: 'عرض درجة جاهزية استمرارية الأعمال' },
                { en: 'Check overdue exercises', ar: 'فحص التمارين المتأخرة' },
                { en: 'Detect single points of failure', ar: 'كشف نقاط الفشل الأحادية' },
                { en: 'Show RTO/RPO drift', ar: 'عرض انحراف RTO/RPO' },
            ],
        },
        {
            id: 'A12',
            name: 'Security Awareness & Training Agent',
            nameAr: 'وكيل التوعية والتدريب الأمني',
            summary: 'Tracks security awareness and training programs: completion rates, overdue assignments, skill-gap themes, and campaign effectiveness — supporting human-risk reduction alongside technical controls.',
            summaryAr: 'يتتبع برامج التوعية والتدريب الأمني: معدلات الإنجاز والتعيينات المتأخرة ومواضيع فجوات المهارات.',
            image: 'agents/A12.png',
            quickPrompts: [
                { en: 'Show overdue training assignments', ar: 'عرض تعيينات التدريب المتأخرة' },
                { en: 'Check training completion rate', ar: 'فحص معدل إتمام التدريب' },
                { en: 'Identify training gaps', ar: 'تحديد فجوات التدريب' },
                { en: 'Recommend training programs', ar: 'اقتراح برامج تدريبية' },
            ],
        },
        {
            id: 'A13',
            name: 'Landing Copilot Agent',
            nameAr: 'وكيل المساعد في الصفحة الرئيسية',
            summary: 'Public-facing assistant for anonymous visitors: explains Shahin-AI GRC capabilities, KSA regulatory context, and safe next steps — without tenant data or write actions.',
            summaryAr: 'مساعد عام للزوار المجهولين: يشرح قدرات شاهين والسياق التنظيمي السعودي دون بيانات مستأجر أو إجراءات كتابة.',
            image: 'agents/A13.png',
            quickPrompts: [
                { en: 'What is Shahin-AI?', ar: 'ما هو شاهين الذكي؟' },
                { en: 'How do you handle GRC for banks?', ar: 'كيف تتعاملون مع الحوكمة للبنوك؟' },
                { en: 'Show me a sample compliance dashboard', ar: 'أظهر لي لوحة امتثال نموذجية' },
                { en: 'Book a demo', ar: 'احجز عرضاً تجريبياً' },
            ],
        },
    ];
}
function publicStr(v) {
    return typeof v === 'string' ? v : v != null ? String(v) : '';
}
/** Deterministic, structured tool outputs for public chat (no tenant DB). */
async function executePublicBuiltinTool(name, input) {
    const clip = (s, n = 7500) => (s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s);
    if (name === 'explain_grc_concept') {
        const concept = publicStr(input.concept).trim() || 'GRC';
        return clip(`## ${concept} (GRC context)\n\n` +
            `**Governance** sets direction, accountability, and oversight (policies, roles, boards, management reviews).\n` +
            `**Risk management** identifies, assesses, and treats risks within appetite (inherent/residual, treatments, monitoring).\n` +
            `**Compliance** maps obligations to controls and evidence (frameworks, audits, attestations).\n\n` +
            `**KSA relevance:** NCA-ECC (cybersecurity controls), SAMA-CSF (financial sector), PDPL (personal data), plus sector regulators.\n` +
            `**Practical takeaway:** define scope → select baseline → assign owners → collect evidence on a cadence → measure and remediate gaps.\n`);
    }
    if (name === 'compare_frameworks') {
        const a = publicStr(input.framework_a).trim() || 'Framework A';
        const b = publicStr(input.framework_b).trim() || 'Framework B';
        return clip(`## Comparison: ${a} vs ${b}\n\n` +
            `| Dimension | ${a} | ${b} |\n` +
            `|---|---|---|\n` +
            `| Primary intent | Control/security baseline vs. assurance model varies by framework | Same |\n` +
            `| Evidence style | Policies, configs, logs, tickets, attestations | Similar; mapping reduces duplicate work |\n` +
            `| Overlap | Often 60–80% on access, logging, incident, vendor, change topics when mapped carefully |\n\n` +
            `**Recommendation:** maintain a **unified control library** with framework tags; assess once, satisfy many where controls align.\n`);
    }
    if (name === 'suggest_controls') {
        const req = publicStr(input.requirement).toLowerCase();
        const base = [
            'Access control policy + periodic access reviews',
            'Logging/monitoring and retention aligned to regulatory minimums',
            'Secure configuration / hardening baseline for critical systems',
            'Incident response plan with tabletop exercises',
            'Vendor/third-party risk assessment and contractual security clauses',
            'Backup, restore testing, and continuity planning evidence',
        ];
        const extra = [];
        if (/(pdpl|privacy|pii|personal data)/i.test(req))
            extra.push('Data inventory, RoPA-style processing records, DPIA where applicable, breach notification workflow');
        if (/(pci|payment|card)/i.test(req))
            extra.push('Cardholder data environment scoping, segmentation evidence, ASV scanning where applicable');
        if (/(sama|bank|finance)/i.test(req))
            extra.push('SAMA-CSF-aligned control themes: governance, defense, resilience, third-party');
        if (/(nca|ecc|cyber)/i.test(req))
            extra.push('NCA-ECC subdomains: cybersecurity governance, defense, resilience, third-party/industrial as applicable');
        const all = [...base, ...extra];
        return clip(`## Suggested controls for: ${publicStr(input.requirement).slice(0, 200)}\n\n` + all.map((c, i) => `${i + 1}. ${c}`).join('\n'));
    }
    return JSON.stringify({ error: 'unknown_builtin_tool', name });
}
async function buildOpenClawToolsForPublic() {
    const allowEnv = (process.env.PUBLIC_OPENCLAW_TOOL_ALLOWLIST || '').trim();
    if (!allowEnv) {
        return { tools: [], runOpenClaw: async () => JSON.stringify({ error: 'PUBLIC_OPENCLAW_TOOL_ALLOWLIST not set' }) };
    }
    const allowed = new Set(allowEnv.split(',').map((s) => s.trim()).filter(Boolean));
    try {
        const { isOpenClawAvailable, listOpenClawTools, executeOpenClawTool } = await import('@dos/platform-core');
        if (!(await isOpenClawAvailable())) {
            return { tools: [], runOpenClaw: async () => JSON.stringify({ error: 'openclaw_unavailable' }) };
        }
        const listed = await listOpenClawTools({
            tenantId: 'public',
            correlationId: `pub-list-${Date.now()}`,
        });
        const syntheticToReal = new Map();
        const tools = [];
        for (const row of listed) {
            const rawName = publicStr(row.name);
            if (!rawName || !allowed.has(rawName))
                continue;
            const synthetic = `oc_${crypto.createHash('sha256').update(rawName).digest('hex')}`;
            if (syntheticToReal.has(synthetic))
                continue;
            syntheticToReal.set(synthetic, rawName);
            const schema = row.inputSchema && typeof row.inputSchema === 'object'
                ? row.inputSchema
                : { type: 'object', properties: { input: { type: 'object' } } };
            tools.push({
                name: synthetic,
                description: `[OpenClaw] ${rawName}: ${publicStr(row.description).slice(0, 400)}`,
                input_schema: schema,
            });
        }
        const bearer = process.env.OPENCLAW_PUBLIC_BEARER_TOKEN?.trim() ||
            process.env.OPENCLAW_HTTP_BEARER_TOKEN?.trim();
        const runOpenClaw = async (syntheticName, input) => {
            const real = syntheticToReal.get(syntheticName);
            if (!real || !allowed.has(real)) {
                return JSON.stringify({ error: 'tool_not_allowlisted', syntheticName });
            }
            try {
                const out = await executeOpenClawTool(real, input, {
                    tenantId: 'public',
                    correlationId: `pub-exec-${crypto.randomUUID()}`,
                    authorization: bearer ? (bearer.toLowerCase().startsWith('bearer ') ? bearer : `Bearer ${bearer}`) : undefined,
                });
                const text = typeof out === 'string' ? out : JSON.stringify(out);
                return text.slice(0, 16000);
            }
            catch (e) {
                logger.warn('[handlePublicQuery] OpenClaw execute failed', { real, err: String(e) });
                return JSON.stringify({ error: 'openclaw_execution_failed', tool: real, detail: String(e) }).slice(0, 4000);
            }
        };
        return { tools, runOpenClaw };
    }
    catch (e) {
        logger.warn('[handlePublicQuery] OpenClaw tool registration skipped', String(e));
        return { tools: [], runOpenClaw: async () => JSON.stringify({ error: 'openclaw_registration_failed' }) };
    }
}
const AGENT_PERSONA = {
    A01: 'You are the Onboarding Agent: scoping, regulatory applicability, and first-run readiness.',
    A02: 'You are the Identity Provisioning Agent: user provisioning, RBAC, least privilege, SSO/MFA patterns, access reviews.',
    A03: 'You are the Framework Mapping Agent: control overlap, unified baselines, mapping discipline.',
    A04: 'You are the Control Authoring Agent: control statements, evidence expectations, audit-ready tone.',
    A05: 'You are the Evidence Collection Agent: artifact types, freshness, chain-of-custody.',
    A06: 'You are the Gap Remediation Agent: prioritization, roadmaps, realistic timelines.',
    A07: 'You are the Risk Register Agent: likelihood/impact, treatments, KRIs.',
    A08: 'You are the Policy Lifecycle Agent: draft/review/approve/publish cadence.',
    A09: 'You are the Third-Party Risk Agent: due diligence, SLAs, vendor monitoring.',
    A10: 'You are the Audit Reporting Agent: regulator-ready narratives and traceability.',
    A11: 'You are the BCP Continuity Agent: resilience, RTO/RPO, exercises, dependencies, crisis readiness.',
    A12: 'You are the Security Awareness & Training Agent: campaigns, completion, skill gaps, culture.',
    A13: 'You are the Landing Copilot Agent: concise public explanations of Shahin-AI GRC, KSA frameworks (NCA-ECC, SAMA-CSF, PDPL), and demo/next-step CTAs — never claim access to tenant data.',
};
// ── Public query (no auth, rate-limited) ──────────────────────────
export async function handlePublicQuery(query, agentId) {
    const publicTools = [
        {
            name: 'explain_grc_concept',
            description: 'Explain a GRC concept (governance, risk, compliance, frameworks, controls, policies, ISO 27001, SOC2, NCA-ECC, SAMA, GDPR, etc.)',
            input_schema: { type: 'object', properties: { concept: { type: 'string', description: 'The GRC concept to explain' } }, required: ['concept'] },
        },
        {
            name: 'compare_frameworks',
            description: 'Compare two compliance frameworks (e.g., ISO 27001 vs SOC2, NCA-ECC vs SAMA-CSF)',
            input_schema: { type: 'object', properties: { framework_a: { type: 'string' }, framework_b: { type: 'string' } }, required: ['framework_a', 'framework_b'] },
        },
        {
            name: 'suggest_controls',
            description: 'Suggest relevant controls for a given risk or compliance requirement',
            input_schema: { type: 'object', properties: { requirement: { type: 'string', description: 'The risk or compliance requirement' } }, required: ['requirement'] },
        },
    ];
    const aid = agentId || 'A01';
    const sessionId = crypto.randomUUID();
    const maxSteps = Math.min(10, Math.max(1, parseInt(process.env.PUBLIC_CHAT_MAX_TOOL_STEPS || '6', 10) || 6));
    const executedTools = [];
    const { tools: ocTools, runOpenClaw } = await buildOpenClawToolsForPublic();
    const allTools = [...publicTools, ...ocTools];
    const persona = AGENT_PERSONA[aid] || AGENT_PERSONA.A01;
    const systemPrompt = `You are Shahin, an expert GRC AI assistant (Dogan Consulting). ${persona}

You have tools:
- Built-ins: explain_grc_concept, compare_frameworks, suggest_controls — **call them** when they improve factual grounding; their outputs are real structured references (not hallucinated tenant data).
- Optional OpenClaw tools: names start with **oc_** — they execute **only** if the platform operator allowlisted them via PUBLIC_OPENCLAW_TOOL_ALLOWLIST. Never invent tool results.

Rules:
- Do not claim access to private tenant data.
- After tools return, synthesize a concise answer for the user (markdown ok).
- If a tool errors, explain briefly and continue with safe guidance.`;
    try {
        const { callClaude } = await import('../../../config/claude-client');
        const messages = [{ role: 'user', content: query.slice(0, 8000) }];
        let totalIn = 0;
        let totalOut = 0;
        let lastText = '';
        for (let step = 0; step < maxSteps; step++) {
            const response = await callClaude({
                tenantId: 'public',
                agentId: aid,
                systemPrompt,
                messages,
                tools: allTools.length ? allTools : undefined,
                temperature: 0.3,
            });
            totalIn += response.inputTokens || 0;
            totalOut += response.outputTokens || 0;
            lastText = response.content || lastText;
            if (!response.toolCalls.length) {
                return {
                    sessionId,
                    message: response.content || 'I can help with governance, risk, and compliance questions. Sign up for full capabilities.',
                    agentId: aid,
                    tokens: { inputTokens: totalIn, outputTokens: totalOut },
                    executedTools,
                };
            }
            messages.push({
                role: 'assistant',
                content: response.rawBlocks,
            });
            const toolResults = [];
            for (const tc of response.toolCalls) {
                let out;
                if (tc.name === 'explain_grc_concept' || tc.name === 'compare_frameworks' || tc.name === 'suggest_controls') {
                    out = await executePublicBuiltinTool(tc.name, tc.input);
                    executedTools.push(`${tc.name}`);
                }
                else if (tc.name.startsWith('oc_')) {
                    out = await runOpenClaw(tc.name, tc.input);
                    executedTools.push(`${tc.name}`);
                }
                else {
                    out = JSON.stringify({ error: 'tool_not_available_public', tool: tc.name });
                }
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: out.slice(0, 24000) });
            }
            messages.push({
                role: 'user',
                content: toolResults,
            });
        }
        const final = await callClaude({
            tenantId: 'public',
            agentId: aid,
            systemPrompt: `${systemPrompt}\n\nProvide a final concise answer. Do not use tools.`,
            messages,
            temperature: 0.2,
        });
        totalIn += final.inputTokens || 0;
        totalOut += final.outputTokens || 0;
        return {
            sessionId,
            message: final.content || lastText || 'I can help with governance, risk, and compliance questions.',
            agentId: aid,
            tokens: { inputTokens: totalIn, outputTokens: totalOut },
            executedTools,
        };
    }
    catch (e) {
        logger.warn('[handlePublicQuery] failed', String(e));
        return {
            sessionId,
            message: 'I can help with governance, risk, and compliance questions. Sign up for full platform access.',
            agentId: aid,
            executedTools,
        };
    }
}
// ── Audit export ──────────────────────────────────────────────────
export async function exportCopilotAudit(tenantId, opts) {
    const schema = tenantSchema(tenantId);
    await ensureCopilotTables(schema);
    const conditions = ['m.tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (opts.from) {
        conditions.push(`m.created_at >= $${idx++}`);
        params.push(opts.from);
    }
    if (opts.to) {
        conditions.push(`m.created_at <= $${idx++}`);
        params.push(opts.to);
    }
    if (opts.topic) {
        conditions.push(`m.content ILIKE $${idx++}`);
        params.push(`%${opts.topic}%`);
    }
    const result = await safeQuery(`SELECT m.message_id, m.session_id, m.role, m.content, m.agent_id, m.tokens_in, m.tokens_out, m.duration_ms, m.created_at
     FROM "${schema}".copilot_messages m
     WHERE ${conditions.join(' AND ')}
     ORDER BY m.created_at DESC LIMIT 1000`, params);
    if (opts.format === 'csv') {
        const header = 'message_id,session_id,role,agent_id,tokens_in,tokens_out,duration_ms,created_at,content';
        const rows = result.rows.map((r) => `${r.message_id},${r.session_id},${r.role},${r.agent_id || ''},${r.tokens_in},${r.tokens_out},${r.duration_ms},${r.created_at},"${(r.content || '').replace(/"/g, '""').slice(0, 500)}"`);
        return { csv: [header, ...rows].join('\n'), count: result.rows.length };
    }
    return { messages: result.rows, count: result.rows.length };
}
// ── Performance recording ─────────────────────────────────────────
export async function recordAgentPerformance(tenantId, agentId, durationMs, tokens) {
    const schema = tenantSchema(tenantId);
    await ensureCopilotTables(schema);
    await safeQuery(`INSERT INTO "${schema}".agent_performance_log (tenant_id, agent_id, session_id, duration_ms, tokens_in, tokens_out, tool_calls, stop_reason, is_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [tenantId, agentId, tokens.sessionId || `auto-${crypto.randomUUID()}`, durationMs,
        tokens.inputTokens || 0, tokens.outputTokens || 0, tokens.toolCalls || 0,
        tokens.stopReason || 'unknown', tokens.isError || false]).catch(() => null);
}
//# sourceMappingURL=copilot.service.js.map