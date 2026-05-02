import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Natural Language Report Generator
// AI-powered report generation from natural language queries
// Uses LLM to interpret user intent and generate structured reports
// ============================================

import { chatCompletion } from '../../../ai/services/gateway/llm.service';
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { generateReport as generateReportExt, ReportFilters } from '../report/report-ext.service';
import { generateComplianceReport as _generateComplianceReport, generateExecutiveSnapshot } from '../report/report.service';
import { toErrorMessage } from '@dos/module-sdk';

// === Types ===

export interface NaturalReportQuery {
  query: string;
  tenantId: string;
  userId: string;
  language?: 'en' | 'ar';
  context?: {
    currentPage?: string;
    selectedFramework?: string;
    selectedPeriod?: { start: string; end: string };
  };
}

export interface ReportIntent {
  reportType: string;
  filters: ReportFilters;
  format?: 'pdf' | 'html' | 'excel' | 'json';
  sections?: string[];
  confidence: number;
  reasoning: string;
}

export interface GeneratedNaturalReport {
  reportId: string;
  title: string;
  content: string;
  structuredData?: any;
  metadata: {
    generatedAt: string;
    generatedBy: string;
    query: string;
    intent: ReportIntent;
    language: 'en' | 'ar';
  };
}

// === Intent classification ===

/**
 * Classify user query into report intent using LLM.
 */
async function classifyReportIntent(
  query: string,
  tenantId: string,
  context?: NaturalReportQuery['context']
): Promise<ReportIntent> {
  const systemPrompt = `You are a GRC report intent classifier. Analyze user queries and extract:
1. Report type (executive-summary, compliance-status, risk-posture, evidence-coverage, custom)
2. Filters (framework, period, domain, entity)
3. Format preference (pdf, html, excel, json)
4. Specific sections requested
5. Confidence level (0-1)

Available report types:
- executive-summary: High-level KPIs and trends
- compliance-status: Framework compliance scores and gaps
- risk-posture: Risk register, heatmaps, treatments
- evidence-coverage: Evidence gaps, freshness, quality
- custom: User-defined report

Respond in JSON format:
{
  "reportType": "string",
  "filters": { "frameworkId": "...", "periodStart": "...", "periodEnd": "...", "domain": "..." },
  "format": "pdf|html|excel|json",
  "sections": ["section1", "section2"],
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}`;

  const contextStr = context
    ? `\nContext: Current page: ${context.currentPage || 'none'}, Framework: ${context.selectedFramework || 'none'}, Period: ${context.selectedPeriod ? `${context.selectedPeriod.start} to ${context.selectedPeriod.end}` : 'none'}`
    : '';

  const userMessage = `User query: "${query}"${contextStr}\n\nClassify the report intent.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'A10', // Report generation agent
      { provider: 'auto', temperature: 0.3 }
    );

    // Parse JSON response
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const intent = JSON.parse(jsonMatch[0]) as ReportIntent;
      return intent;
    }

    // Fallback: keyword-based classification
    return classifyIntentFallback(query, context);
  } catch (err: unknown) {
    logger.warn('[NaturalReport] LLM classification failed, using fallback:', toErrorMessage(err));
    return classifyIntentFallback(query, context);
  }
}

/**
 * Fallback intent classification using keyword matching.
 */
function classifyIntentFallback(
  query: string,
  context?: NaturalReportQuery['context']
): ReportIntent {
  const lower = query.toLowerCase();
  let reportType = 'executive-summary';
  const filters: ReportFilters = {};

  // Extract framework
  if (lower.includes('nca') || lower.includes('ecc')) {
    filters.frameworkId = 'nca-ecc';
    reportType = 'compliance-status';
  } else if (lower.includes('sama') || lower.includes('csf')) {
    filters.frameworkId = 'sama-csf';
    reportType = 'compliance-status';
  } else if (lower.includes('pdpl')) {
    filters.frameworkId = 'pdpl';
    reportType = 'compliance-status';
  }

  // Extract period
  const periodMatch = query.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
  if (periodMatch) {
    filters.periodStart = periodMatch[1];
    filters.periodEnd = periodMatch[2];
  } else if (lower.includes('last month')) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    filters.periodStart = start.toISOString().split('T')[0];
    filters.periodEnd = end.toISOString().split('T')[0];
  } else if (lower.includes('last quarter')) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
    filters.periodStart = start.toISOString().split('T')[0];
    filters.periodEnd = end.toISOString().split('T')[0];
  }

  // Use context if available
  if (context?.selectedFramework) {
    filters.frameworkId = context.selectedFramework;
  }
  if (context?.selectedPeriod) {
    filters.periodStart = context.selectedPeriod.start;
    filters.periodEnd = context.selectedPeriod.end;
  }

  // Determine report type from keywords
  if (lower.includes('risk') || lower.includes('threat') || lower.includes('heatmap')) {
    reportType = 'risk-posture';
  } else if (lower.includes('evidence') || lower.includes('coverage') || lower.includes('gap')) {
    reportType = 'evidence-coverage';
  } else if (lower.includes('compliance') || lower.includes('framework') || lower.includes('score')) {
    reportType = 'compliance-status';
  } else if (lower.includes('executive') || lower.includes('summary') || lower.includes('dashboard')) {
    reportType = 'executive-summary';
  }

  // Format preference
  let format: 'pdf' | 'html' | 'excel' | 'json' = 'html';
  if (lower.includes('pdf') || lower.includes('download')) format = 'pdf';
  else if (lower.includes('excel') || lower.includes('spreadsheet')) format = 'excel';
  else if (lower.includes('json') || lower.includes('api')) format = 'json';

  return {
    reportType,
    filters,
    format,
    confidence: 0.7,
    reasoning: 'Keyword-based classification fallback',
  };
}

// === Report generation ===

/**
 * Generate a natural language report from a user query.
 */
export async function generateNaturalReport(
  input: NaturalReportQuery
): Promise<GeneratedNaturalReport> {
  // Step 1: Classify intent
  const intent = await classifyReportIntent(input.query, input.tenantId, input.context);

  // Step 2: Fetch structured data based on intent
  let structuredData: Record<string, unknown> | null = null;
  try {
    switch (intent.reportType) {
      case 'executive-summary':
        (structuredData as any) = await generateExecutiveSnapshot(input.tenantId);
        break;
      case 'compliance-status':
        (structuredData as any) = await generateReportExt(
          input.tenantId,
          'compliance-status',
          intent.filters,
          input.userId
        );
        break;
      case 'risk-posture':
        (structuredData as any) = await generateReportExt(
          input.tenantId,
          'risk-posture',
          intent.filters,
          input.userId
        );
        break;
      case 'evidence-coverage':
        (structuredData as any) = await generateReportExt(
          input.tenantId,
          'evidence-coverage',
          intent.filters,
          input.userId
        );
        break;
      default:
        (structuredData as any) = await generateExecutiveSnapshot(input.tenantId);
    }
  } catch (err: unknown) {
    logger.error('[NaturalReport] Data fetch failed:', err);
    structuredData = { error: toErrorMessage(err) };
  }

  // Step 3: Generate natural language content from structured data
  const language = input.language || 'en';
  const content = await generateReportContent(
    input.query,
    structuredData,
    intent,
    language,
    input.tenantId
  );

  // Step 4: Create report record
  const reportId = `nat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const schema = tenantSchema(input.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".reports (report_id, report_type, title, data, generated_at, generated_by, metadata)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
    [
      reportId,
      intent.reportType,
      content.title || `Report: ${input.query.substring(0, 50)}`,
      JSON.stringify(structuredData),
      input.userId,
      JSON.stringify({
        query: input.query,
        intent,
        language,
        naturalLanguage: true,
      }),
    ]
  );

  return {
    reportId,
    title: content.title,
    content: content.body,
    structuredData,
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: input.userId,
      query: input.query,
      intent,
      language,
    },
  };
}

/**
 * Generate natural language report content using LLM.
 */
async function generateReportContent(
  query: string,
  data: unknown,
  intent: ReportIntent,
  language: 'en' | 'ar',
  _tenantId: string
): Promise<{ title: string; body: string }> {
  const systemPrompt = language === 'ar'
    ? `أنت مساعد ذكي لتوليد تقارير GRC باللغة العربية. قم بتحويل البيانات المنظمة إلى تقرير طبيعي وواضح يجيب على استفسار المستخدم. استخدم لغة احترافية ومناسبة للسياق التنظيمي.`
    : `You are an intelligent GRC report generator. Convert structured data into a natural, clear report that answers the user's query. Use professional language appropriate for organizational context.`;

  const dataSummary = JSON.stringify(data, null, 2).substring(0, 8000); // Limit token usage

  const userMessage = language === 'ar'
    ? `استفسار المستخدم: "${query}"\n\nالبيانات المنظمة:\n${dataSummary}\n\nأنشئ تقريراً طبيعياً بالعربية يتضمن:\n1. عنوان واضح\n2. ملخص تنفيذي\n3. النتائج الرئيسية\n4. التوصيات (إن وجدت)`
    : `User query: "${query}"\n\nStructured data:\n${dataSummary}\n\nGenerate a natural language report in English that includes:\n1. Clear title\n2. Executive summary\n3. Key findings\n4. Recommendations (if applicable)`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'A10',
      { provider: 'auto', temperature: 0.5, maxTokens: 4000 }
    );

    // Extract title and body
    const content = result.content.trim();
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^Title:\s*(.+)$/mi);
    const title = titleMatch ? titleMatch[1].trim() : `Report: ${query.substring(0, 50)}`;
    const body = content.replace(/^#\s+.+$/m, '').trim();

    return { title, body: body || content };
  } catch (err: unknown) {
    logger.warn('[NaturalReport] LLM generation failed, using template:', toErrorMessage(err));
    return generateTemplateReport(query, data, intent, language);
  }
}

/**
 * Fallback template-based report generation.
 */
function generateTemplateReport(
  query: string,
  data: unknown,
  intent: ReportIntent,
  language: 'en' | 'ar'
): { title: string; body: string } {
  const isAr = language === 'ar';
  const title = isAr ? `تقرير: ${query.substring(0, 50)}` : `Report: ${query.substring(0, 50)}`;

  let body = '';
  if (intent.reportType === 'executive-summary') {

    const score = data.overallScore || data.complianceScore || 0;
    body = isAr
      ? `النتيجة الإجمالية للامتثال: ${score}%\n\nهذا التقرير يعرض ملخصاً تنفيذياً لحالة الامتثال والجودة.`
      : `Overall Compliance Score: ${score}%\n\nThis report provides an executive summary of compliance and quality status.`;
  } else if (intent.reportType === 'compliance-status') {
    body = isAr
      ? `تقرير حالة الامتثال للاطار: ${intent.filters.frameworkId || 'غير محدد'}\n\nيعرض هذا التقرير حالة الامتثال للضوابط المطلوبة.`
      : `Compliance Status Report for Framework: ${intent.filters.frameworkId || 'Unspecified'}\n\nThis report shows the compliance status of required controls.`;
  } else {
    body = isAr
      ? `تم إنشاء التقرير بناءً على استفسارك: "${query}"`
      : `Report generated based on your query: "${query}"`;
  }

  return { title, body };
}

/**
 * Get natural report history for a user.
 */
export async function getNaturalReportHistory(
  tenantId: string,
  userId: string,
  limit = 20
): Promise<GeneratedNaturalReport[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT report_id, report_type, title, data, generated_at, generated_by, metadata
     FROM "${schema}".reports
     WHERE generated_by = $1 AND metadata->>'naturalLanguage' = 'true'
     ORDER BY generated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    reportId: row.report_id,
    title: row.title,
    content: '', // Would need to store separately or regenerate
    structuredData: row.data,
    metadata: {
      generatedAt: row.generated_at,
      generatedBy: row.generated_by,
      query: row.metadata?.query || '',
      intent: row.metadata?.intent || ({} as ReportIntent),
      language: row.metadata?.language || 'en',
    },
  }));
}
