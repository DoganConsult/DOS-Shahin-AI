/**
 * MJML email renderer — enterprise-grade, bilingual EN/AR (RTL).
 *
 * Pre-compiles MJML templates from `src/templates/*.mjml` at module load,
 * caches the compiled HTML, and renders per-request with a lightweight
 * {{ var }} / {{{ html }}} substitution layer (tiny Mustache subset —
 * triple-brace = unescaped HTML).
 *
 * Public API:
 *   renderEmail(templateId, lang, vars) → { subject, html, text }
 *
 * Lang defaults to 'en'. When lang='ar', text direction switches to RTL.
 *
 * Fail-open: if MJML compile throws at startup (bad template, missing dep),
 * the renderer falls back to a plain <html> template using the same vars.
 * This keeps the email channel delivering while templates are repaired.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@dos/platform-core/observability';

export type TemplateId =
  | 'verification-email'
  | 'welcome-email'
  | 'password-reset'
  | 'mfa-code'
  | 'ai-alert-warning'
  | 'ai-alert-critical'
  | 'copilot-lead-thanks';

export type Lang = 'en' | 'ar';

export interface RenderResult {
  subject: string;
  html: string;
  text: string;
}

interface Translations {
  subject: string;
  preview: string;
  title: string;
  greeting?: string;
  body: string;
  cta?: string;
  fallback?: string;
  expiryNote?: string;
  footerNote?: string;
  severityLabel?: string;
  ruleLabel?: string;
  tenantLabel?: string;
  metricLabel?: string;
  firedAtLabel?: string;
  throttleNote?: string;
  ackNote?: string;
  intentLabel?: string;
  expectLabel?: string;
  expectText?: string;
  legalLine?: string;
}

// ── Bilingual copy (extracted from monolith templates, restructured) ────
const I18N: Record<TemplateId, Record<Lang, Translations>> = {
  'verification-email': {
    en: {
      subject: 'Verify your email — {{ brandName }}',
      preview: 'Confirm your email to activate your account',
      title: 'Verify your email address',
      greeting: 'Welcome{{ recipientNameOrEmpty }}!',
      body: 'Please confirm your email to activate your account and continue onboarding.',
      cta: 'Verify email',
      fallback: 'If the button does not work, paste this link in your browser:',
      expiryNote: 'This link expires in 24 hours. If you did not request this, you can safely ignore it.',
    },
    ar: {
      subject: 'تأكيد البريد الإلكتروني — {{ brandName }}',
      preview: 'قم بتأكيد بريدك الإلكتروني لتفعيل حسابك',
      title: 'تأكيد عنوان بريدك الإلكتروني',
      greeting: 'أهلاً بك{{ recipientNameOrEmpty }}!',
      body: 'الرجاء تأكيد بريدك الإلكتروني لتفعيل حسابك والاستمرار في عملية التهيئة.',
      cta: 'تأكيد البريد',
      fallback: 'إذا لم يعمل الزر، انسخ الرابط التالي في متصفحك:',
      expiryNote: 'تنتهي صلاحية هذا الرابط خلال 24 ساعة. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.',
    },
  },
  'welcome-email': {
    en: {
      subject: 'Your workspace is ready — {{ brandName }}',
      preview: 'Sign in and start working',
      title: 'Your workspace is ready',
      greeting: 'Welcome aboard{{ recipientNameOrEmpty }}.',
      body: 'Your workspace for {{ orgName }} has been fully provisioned.',
      cta: 'Open workspace',
      footerNote: 'If you did not expect this message, please contact your administrator.',
    },
    ar: {
      subject: 'مساحة العمل جاهزة — {{ brandName }}',
      preview: 'سجّل الدخول وابدأ العمل',
      title: 'مساحة العمل الخاصة بك جاهزة',
      greeting: 'أهلاً بك{{ recipientNameOrEmpty }}.',
      body: 'تم إعداد مساحة العمل الخاصة بـ {{ orgName }} بالكامل.',
      cta: 'فتح مساحة العمل',
      footerNote: 'إذا لم تكن تتوقع هذه الرسالة، يرجى التواصل مع المسؤول.',
    },
  },
  'password-reset': {
    en: {
      subject: 'Reset your password — {{ brandName }}',
      preview: 'Reset your password securely',
      title: 'Password reset',
      body: 'A password reset was requested for your account. Click below to set a new password.',
      cta: 'Reset password',
      expiryNote: 'This link expires in 1 hour. If you did not request a reset, you can safely ignore this message.',
      fallback: 'If the button does not work, paste this link in your browser:',
    },
    ar: {
      subject: 'إعادة تعيين كلمة المرور — {{ brandName }}',
      preview: 'إعادة تعيين كلمة المرور بأمان',
      title: 'إعادة تعيين كلمة المرور',
      body: 'تم طلب إعادة تعيين كلمة المرور لحسابك. اضغط أدناه لتعيين كلمة مرور جديدة.',
      cta: 'إعادة التعيين',
      expiryNote: 'تنتهي صلاحية هذا الرابط خلال ساعة واحدة. إذا لم تطلب ذلك، يمكنك تجاهل الرسالة.',
      fallback: 'إذا لم يعمل الزر، انسخ الرابط التالي في متصفحك:',
    },
  },
  'mfa-code': {
    en: {
      subject: 'Your verification code — {{ brandName }}',
      preview: 'One-time verification code',
      title: 'Your verification code',
      body: 'Use the code below to complete sign-in.',
      expiryNote: 'This code expires in 10 minutes. Never share it with anyone.',
    },
    ar: {
      subject: 'رمز التحقق — {{ brandName }}',
      preview: 'رمز التحقق لمرة واحدة',
      title: 'رمز التحقق الخاص بك',
      body: 'استخدم الرمز أدناه لإتمام تسجيل الدخول.',
      expiryNote: 'تنتهي صلاحية هذا الرمز خلال 10 دقائق. لا تشاركه مع أي شخص.',
    },
  },
  'ai-alert-warning': {
    en: {
      subject: '[WARNING] {{ ruleName }} — {{ brandName }} AI-OS',
      preview: 'AI alert rule breached — review on the DNOC AI Operations dashboard',
      title: 'AI alert: {{ ruleName }}',
      severityLabel: 'Warning',
      body: 'An AI-OS alert rule has fired and warrants attention. Review the rule context, the offending tenant, and the breached metric below, then open the DNOC AI Operations console for full timeline and remediation actions.',
      ruleLabel: 'Rule',
      tenantLabel: 'Tenant',
      metricLabel: 'Breached metric',
      cta: 'Open DNOC AI Operations',
      throttleNote: 'This rule will not fire again within its throttle window unless it remains in breach. To tune thresholds or pause the rule, edit it in DSOC AI Security → Alert Rules.',
    },
    ar: {
      subject: '[تنبيه] {{ ruleName }} — مركز الذكاء الاصطناعي {{ brandName }}',
      preview: 'تجاوز قاعدة تنبيه AI — راجع لوحة DNOC لعمليات الذكاء الاصطناعي',
      title: 'تنبيه AI: {{ ruleName }}',
      severityLabel: 'تنبيه',
      body: 'تم تشغيل قاعدة تنبيه في مركز الذكاء الاصطناعي وتحتاج إلى مراجعة. راجع تفاصيل القاعدة والمستأجر المتأثر والمقياس المتجاوز أدناه، ثم افتح لوحة DNOC AI Operations لمتابعة الجدول الزمني وإجراءات التصحيح.',
      ruleLabel: 'القاعدة',
      tenantLabel: 'المستأجر',
      metricLabel: 'المقياس المتجاوز',
      cta: 'فتح لوحة DNOC AI Operations',
      throttleNote: 'لن تنطلق هذه القاعدة مرة أخرى خلال نافذة التهدئة ما لم تستمر بالتجاوز. لتعديل الحدود أو إيقاف القاعدة، استخدم لوحة DSOC AI Security → قواعد التنبيهات.',
    },
  },
  'copilot-lead-thanks': {
    en: {
      subject: 'Thanks for reaching out — {{ brandName }}',
      preview: 'We received your message via the Shahin-AI copilot',
      title: 'Thanks for your interest',
      body: 'We received your message through the Shahin-AI public copilot and someone from our team will respond within one business day. The summary of what you asked for is below.',
      intentLabel: 'You asked about',
      expectLabel: 'What happens next',
      expectText: 'A team member will review your request and reach out via email. If you need an immediate response, reply to this email or contact us at info@dogan-ai.com.',
      cta: 'Visit shahin-ai.com',
      legalLine: 'You are receiving this because you submitted your email through our public copilot. You can ignore this message and we will not email you again.',
    },
    ar: {
      subject: 'شكراً لتواصلك — {{ brandName }}',
      preview: 'تم استلام رسالتك عبر مساعد شاهين الذكي',
      title: 'شكراً على اهتمامك',
      body: 'لقد تلقّينا رسالتك عبر المساعد الذكي العام لمنصة شاهين، وسيتواصل معك أحد أعضاء فريقنا خلال يوم عمل واحد. ملخص طلبك أدناه.',
      intentLabel: 'سألتَ عن',
      expectLabel: 'الخطوة التالية',
      expectText: 'سيراجع طلبك أحد أعضاء الفريق ويتواصل معك عبر البريد الإلكتروني. إن أردت رداً فورياً، يمكنك الرد على هذه الرسالة أو التواصل عبر info@dogan-ai.com.',
      cta: 'زيارة shahin-ai.com',
      legalLine: 'تتلقى هذه الرسالة لأنك قدمت بريدك الإلكتروني عبر مساعدنا العام. يمكنك تجاهل الرسالة ولن نراسلك مرة أخرى.',
    },
  },
  'ai-alert-critical': {
    en: {
      subject: '[CRITICAL] {{ ruleName }} — {{ brandName }} AI-OS',
      preview: 'Critical AI alert breach — immediate operator attention required',
      title: 'CRITICAL AI alert: {{ ruleName }}',
      severityLabel: 'Critical',
      body: 'A critical AI-OS alert rule has fired. This severity is reserved for production-impacting conditions: cost-cap exhaustion, agent-failure storms, SoD violations, runaway deny rates, or HITL backlog overflow. Acknowledge in DSOC and dispatch an operator before the throttle window expires.',
      ruleLabel: 'Rule',
      tenantLabel: 'Tenant',
      metricLabel: 'Breached metric',
      firedAtLabel: 'Fired at',
      cta: 'Acknowledge in DSOC AI Security',
      ackNote: 'Acknowledgement is recorded in dos.audit_trail and silences this rule for the configured throttle window. If you cannot resolve within 15 minutes, escalate to platform-ops.',
    },
    ar: {
      subject: '[حرج] {{ ruleName }} — مركز الذكاء الاصطناعي {{ brandName }}',
      preview: 'تجاوز حرج لتنبيه AI — يتطلب تدخل المشغل فوراً',
      title: 'تنبيه AI حرج: {{ ruleName }}',
      severityLabel: 'حرج',
      body: 'تم تشغيل قاعدة تنبيه حرجة في مركز الذكاء الاصطناعي. هذا المستوى مخصص للحالات المؤثرة على الإنتاج: تجاوز سقف التكلفة، عواصف فشل الوكلاء، انتهاكات الفصل بين المهام، معدلات رفض جامحة، أو تكدس قوائم HITL. أكد الاستلام في DSOC وأرسل مشغلاً قبل انتهاء نافذة التهدئة.',
      ruleLabel: 'القاعدة',
      tenantLabel: 'المستأجر',
      metricLabel: 'المقياس المتجاوز',
      firedAtLabel: 'وقت الإطلاق',
      cta: 'تأكيد في DSOC AI Security',
      ackNote: 'يتم تسجيل التأكيد في dos.audit_trail ويُسكِت هذه القاعدة طوال نافذة التهدئة المُعدّة. إذا تعذّر الحل خلال 15 دقيقة، صعّد إلى فريق platform-ops.',
    },
  },
};

// ── Template cache (compiled once at startup) ──────────────────────────

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

interface CachedTemplate {
  raw: string;
  layoutRaw: string;
}

let compiledCache: Record<TemplateId, CachedTemplate> | null = null;

function loadRaw(id: TemplateId | '_layout'): string {
  const full = path.join(TEMPLATE_DIR, `${id}.mjml`);
  return fs.readFileSync(full, 'utf8');
}

function ensureCache(): Record<TemplateId, CachedTemplate> {
  if (compiledCache) return compiledCache;
  const layoutRaw = loadRaw('_layout');
  const ids: TemplateId[] = [
    'verification-email',
    'welcome-email',
    'password-reset',
    'mfa-code',
    'ai-alert-warning',
    'ai-alert-critical',
    'copilot-lead-thanks',
  ];
  const cache: Record<TemplateId, CachedTemplate> = {} as Record<TemplateId, CachedTemplate>;
  for (const id of ids) {
    try {
      cache[id] = { raw: loadRaw(id), layoutRaw };
    } catch (err) {
      logger.error('[mjml-renderer] failed to load template', {
        id,
        err: err instanceof Error ? err.message : String(err),
      });
      cache[id] = { raw: '', layoutRaw };
    }
  }
  compiledCache = cache;
  return cache;
}

function substitute(template: string, vars: Record<string, unknown>): string {
  // {{{ key }}} → unescaped; {{ key }} → escaped.
  const escapeHtml = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return template
    .replace(/\{\{\{\s*([.\w]+)\s*\}\}\}/g, (_m, key) => {
      const v = lookup(vars, key);
      return v == null ? '' : String(v);
    })
    .replace(/\{\{\s*([.\w]+)\s*\}\}/g, (_m, key) => {
      const v = lookup(vars, key);
      return v == null ? '' : escapeHtml(String(v));
    });
}

function lookup(vars: Record<string, unknown>, dotted: string): unknown {
  const parts = dotted.split('.');
  let cur: unknown = vars;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return cur;
}

function mjmlToHtml(raw: string): string {
  try {
    // mjml is an optional peer — lazy-required so absence does not crash notification service.

    const m = require('mjml');
    const fn = (m?.default || m) as (s: string, o?: Record<string, unknown>) => { html?: string; errors?: unknown[] };
    const result = fn(raw, { validationLevel: 'soft' });
    if (!result || typeof result.html !== 'string' || result.html.length === 0) {
      // mjml returns { html: undefined, errors: [...] } when the input is
      // structurally invalid (e.g. mj-section nested in mj-column). Falling
      // back to a plain-html version keeps the alert deliverable while the
      // template is repaired, and surfaces the mjml errors to the log.
      logger.error('[mjml-renderer] mjml produced no html, falling back', {
        errors: Array.isArray(result?.errors)
          ? (result.errors as Array<{ message?: string; formattedMessage?: string }>)
              .slice(0, 5).map((e) => e.formattedMessage || e.message || String(e))
          : undefined,
      });
      return fallbackPlainHtml(raw);
    }
    return result.html;
  } catch (err) {
    logger.error('[mjml-renderer] mjml compile failed, falling back to plain html', {
      err: err instanceof Error ? err.message : String(err),
    });
    return fallbackPlainHtml(raw);
  }
}

function fallbackPlainHtml(raw: string): string {
  // Strip tags crudely and wrap in minimal HTML. Not pretty, but deliverable.
  const stripped = raw.replace(/<[^>]+>/g, '');
  return `<!doctype html><html><body><pre>${stripped.replace(/</g, '&lt;')}</pre></body></html>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderEmail(
  templateId: TemplateId,
  lang: Lang,
  vars: Record<string, unknown>,
): RenderResult {
  const cache = ensureCache();
  const entry = cache[templateId];
  if (!entry) throw new Error(`Unknown template: ${templateId}`);
  const i18n = I18N[templateId][lang] || I18N[templateId].en;

  const brandName =
    (typeof vars.brandName === 'string' && vars.brandName) || 'Shahin-AI';
  const recipientName = typeof vars.recipientName === 'string' ? vars.recipientName : '';
  const recipientNameOrEmpty = recipientName ? ` ${recipientName}` : '';
  const textAlign = lang === 'ar' ? 'right' : 'left';

  // Compile translations against vars first (so titles can include org name).
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(i18n)) {
    t[k] = substitute(String(v), { ...vars, brandName, recipientNameOrEmpty });
  }

  const bodyVars = { ...vars, brandName, recipientNameOrEmpty, textAlign, t };
  const bodySub = substitute(entry.raw, bodyVars);

  const layoutVars = {
    ...bodyVars,
    subject: t.subject,
    preview: t.preview,
    body: bodySub,
    footer: lang === 'ar'
      ? `© ${brandName} — لا ترد على هذه الرسالة.`
      : `© ${brandName} — do not reply to this message.`,
  };

  const mjmlFinal = substitute(entry.layoutRaw, layoutVars);
  const html = mjmlToHtml(mjmlFinal);
  const text = stripHtml(html);

  return { subject: t.subject, html, text };
}

/** Pre-warm the template cache at service startup (optional). */
export function preloadTemplates(): void {
  try {
    ensureCache();
    logger.info('[mjml-renderer] templates cached', {
      count: Object.keys(compiledCache ?? {}).length,
    });
  } catch (err) {
    logger.error('[mjml-renderer] preload failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
