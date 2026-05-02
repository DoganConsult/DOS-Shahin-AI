// ============================================
// Shahin-Ai — Inbox Template Service
// Message templates, variable substitution,
// i18n (EN/AR), template versioning
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type SupportedLocale = "en" | "ar";

export interface MessageTemplate {
  templateId: string;
  name: string;
  messageType: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderedMessage {
  subject: string;
  body: string;
  locale: SupportedLocale;
}

// === Pure Functions ===

export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

export function renderMessage(
  tmpl: MessageTemplate,
  variables: Record<string, string>,
  locale: SupportedLocale = "en"
): RenderedMessage {
  const subject = renderTemplate(locale === "ar" ? tmpl.subjectAr : tmpl.subjectEn, variables);
  const body = renderTemplate(locale === "ar" ? tmpl.bodyAr : tmpl.bodyEn, variables);
  return { subject, body, locale };
}

export function validateVariables(
  template: MessageTemplate,
  provided: Record<string, string>
): string[] {
  const missing: string[] = [];
  for (const v of template.variables) {
    if (!(v in provided) || provided[v] === undefined) {
      missing.push(v);
    }
  }
  return missing;
}

// === DB-backed Functions ===

function mapTemplate( r: Record<string, unknown>): MessageTemplate {
  return {

    templateId: r.template_id,

    name: r.name,

    messageType: r.message_type,

    subjectEn: r.subject_en,

    subjectAr: r.subject_ar,

    bodyEn: r.body_en,

    bodyAr: r.body_ar,

    variables: r.variables || [],

    version: r.version || 1,

    isActive: r.is_active,

    createdBy: r.created_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

export async function createTemplate(
  tenantId: string,
  data: {
    name: string;
    messageType: string;
    subjectEn: string;
    subjectAr: string;
    bodyEn: string;
    bodyAr: string;
    createdBy: string;
  }
): Promise<MessageTemplate> {
  const schema = tenantSchema(tenantId);
  const variables = [
    ...extractVariables(data.subjectEn),
    ...extractVariables(data.bodyEn),
    ...extractVariables(data.bodyAr),
  ];
  const uniqueVars = [...new Set(variables)];

  const result = await safeQuery(
    `INSERT INTO "${schema}".inbox_templates
      (name, message_type, subject_en, subject_ar, body_en, body_ar, variables, version, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8)
     RETURNING *`,
    [
      data.name, data.messageType,
      data.subjectEn, data.subjectAr,
      data.bodyEn, data.bodyAr,
      JSON.stringify(uniqueVars),
      data.createdBy,
    ]
  );
  return mapTemplate(getFirstRow(result)!);
}

export async function updateTemplate(
  tenantId: string,
  templateId: string,
  data: {
    subjectEn?: string;
    subjectAr?: string;
    bodyEn?: string;
    bodyAr?: string;
  }
): Promise<MessageTemplate> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.inbox_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getTemplate(
  tenantId: string,
  templateId: string
): Promise<MessageTemplate | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_templates WHERE template_id = $1 AND is_active = true`,
    [templateId]
  );
  const row = getFirstRow(result)!;
  return row ? mapTemplate(row) : null;
}

export async function getTemplateByType(
  tenantId: string,
  messageType: string
): Promise<MessageTemplate | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_templates
     WHERE message_type = $1 AND is_active = true
     ORDER BY version DESC LIMIT 1`,
    [messageType]
  );
  const row = getFirstRow(result)!;
  return row ? mapTemplate(row) : null;
}

export async function renderFromTemplate(
  tenantId: string,
  templateId: string,
  variables: Record<string, string>,
  locale: SupportedLocale = "en"
): Promise<RenderedMessage> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.inbox_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function listTemplates(tenantId: string): Promise<MessageTemplate[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_templates WHERE is_active = true ORDER BY message_type, name`
  );
  return result.rows.map(mapTemplate);
}
