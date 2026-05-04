import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';

/**
 * Phase M0 — Public marketing brand resolver.
 *
 * GET /brand?brand_code=<shahin-ai|dogan-ai-os>
 *   → { brandCode, tokens, assets }
 *
 * GET /marketing/config?brand=<code>&locale=<en|ar>
 *   → { brandCode, locale, direction, publicMarketingEnabled, navItems,
 *       footerGroups, flags }
 *
 * Both endpoints are PUBLIC (no tenant header, no auth) — they are consumed
 * by the unauthenticated marketing surface. Refuses unknown brand codes.
 *
 * Rows come from:
 *   • dos.marketing_brand_tokens   (M0 migration 20260503_0023)
 *   • dos.marketing_brand_assets   (M0 migration 20260503_0023)
 */

const ALLOWED_BRANDS = new Set(['shahin-ai', 'dogan-ai-os']);
const ALLOWED_LOCALES = new Set(['en', 'ar']);

type Tx = (en: string, ar: string) => string;

/** Per-route breadcrumb so each marketing page shows its own trail. */
function buildBreadcrumb(
  routePath: string,
  tx: Tx,
): Array<{ label: string; href?: string; current?: boolean }> {
  const home = { label: tx('Home', 'الرئيسية'), href: '/' };
  const pageLabels: Record<string, string> = {
    '/':         tx('Home', 'الرئيسية'),
    '/platform': tx('Platform', 'المنصة'),
    '/pricing':  tx('Pricing', 'التسعير'),
    '/trust':    tx('Trust', 'الثقة'),
    '/security': tx('Security', 'الأمن'),
    '/contact':  tx('Contact', 'تواصل'),
    '/about':    tx('About', 'حولنا'),
    '/legal':    tx('Legal', 'القانوني'),
  };
  const label = pageLabels[routePath] ?? routePath;
  // Root / — breadcrumb is just [Home(current)]
  if (routePath === '/') return [{ label, current: true }];
  return [home, { label, current: true }];
}

function buildMarketingHomeContent(brandCode: string, locale: string, tx: Tx, routePath = '/') {
  const brandLabel = brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI';
  return {
    brandLabel,
    hero: {
      badge: tx('Enterprise GRC · AI-Native · Bilingual', 'حوكمة مؤسسية · ذكاء اصطناعي أصيل · ثنائي اللغة'),
      eyebrow: tx('Purpose-built for regulated enterprises', 'مصمم خصيصًا للمؤسسات الخاضعة للتنظيم'),
      title: tx('Governance, Risk & Compliance — fully autonomous.', 'الحوكمة والمخاطر والامتثال — مستقلة بالكامل.'),
      sub: tx(
        'Nine specialised AI agents observe, decide, and act across your GRC lifecycle — every step approved, cryptographically logged, and fully reversible.',
        'تسعة وكلاء ذكاء متخصصون يراقبون ويقررون ويتصرفون عبر دورة حياة الحوكمة — كل خطوة معتمدة ومسجلة بتشفير وقابلة للعكس.',
      ),
      microcopy: tx(
        '14-day free trial · No credit card required · Full EN/AR bilingual · On-prem available',
        'تجربة مجانية ١٤ يومًا · بدون بطاقة ائتمان · ثنائي اللغة كامل · متوفر للنشر الداخلي',
      ),
      ctaPrimary:   { label: tx('Start free trial', 'ابدأ التجربة المجانية'), href: '/register' },
      ctaSecondary: { label: tx('Book a live demo', 'احجز عرضًا مباشرًا'),   href: '/contact' },
    },
    trustPills: [
      { id: 'iso', label: tx('ISO 27001', 'آيزو ٢٧٠٠١') },
      { id: 'soc2', label: tx('SOC 2 Type II', 'SOC 2 النوع الثاني') },
      { id: 'gdpr', label: tx('GDPR', 'اللائحة العامة لحماية البيانات') },
      { id: 'nca', label: tx('NCA ECC', 'الهيئة الوطنية - ECC') },
      { id: 'sama', label: tx('SAMA CSF', 'إطار ساما للأمن السيبراني') },
    ],
    valueProps: [
      { id: 'one', title: tx('One platform', 'منصة واحدة'),
        body: tx('GRC, security ops, AI agents, evidence — unified.',
                 'الحوكمة والمخاطر، عمليات الأمن، وكلاء الذكاء، الأدلة — موحدة.') },
      { id: 'auto', title: tx('Automated proof', 'إثبات آلي'),
        body: tx('Continuous evidence with cryptographic audit trail.',
                 'أدلة مستمرة مع سجل تدقيق مشفر.') },
      { id: 'safe', title: tx('Human-in-the-loop', 'الإنسان في الحلقة'),
        body: tx('Every agent action approved, traceable, reversible.',
                 'كل إجراء وكيل معتمد، قابل للتتبع والعكس.') },
    ],
    agentic: {
      eyebrow: tx('Agentic proof', 'إثبات وكيل'),
      title: tx('Nine agents already at work.', 'تسعة وكلاء يعملون بالفعل.'),
      readinessPercent: 90,
      // Wave 1 — labels consumed by DosAgentStatusStripComponent + DosProgressBarComponent.
      emptyLabel:       tx('No agents active', 'لا توجد وكلاء نشطون'),
      failedLabel:      tx('Agent error', 'خطأ في الوكيل'),
      readinessLabel:   tx('Agentic readiness', 'مستوى الاستعداد الوكيل'),
      readinessHelper:  tx('90% of actions are fully autonomous', '٩٠٪ من الإجراءات مستقلة تماماً'),
      tiles: [
        { agentCode: 'A01', displayName: 'Onboarding Agent',      displayNameAr: 'وكيل التهيئة',            role: 'onboarding' },
        { agentCode: 'A02', displayName: 'Identity Provisioning', displayNameAr: 'وكيل توفير الهوية',       role: 'identity' },
        // A03 intentionally omitted — this agent slot was retired before launch.
        // The code A03 (Compliance Mapping) was merged into A04 Control Authoring.
        // Do NOT reuse A03; next new agent should be A11.
        { agentCode: 'A04', displayName: 'Control Authoring',     displayNameAr: 'وكيل تأليف الضوابط',     role: 'controls' },
        { agentCode: 'A05', displayName: 'Evidence Collection',   displayNameAr: 'وكيل جمع الأدلة',         role: 'evidence' },
        { agentCode: 'A06', displayName: 'Gap Remediation',       displayNameAr: 'وكيل معالجة الفجوات',     role: 'remediation' },
        { agentCode: 'A07', displayName: 'Risk Register',         displayNameAr: 'وكيل سجل المخاطر',        role: 'risk' },
        { agentCode: 'A08', displayName: 'Policy Lifecycle',      displayNameAr: 'وكيل دورة حياة السياسات', role: 'policy' },
        { agentCode: 'A09', displayName: 'Third-Party Risk',      displayNameAr: 'وكيل مخاطر الأطراف',     role: 'vendor' },
        { agentCode: 'A10', displayName: 'Audit Reporting',       displayNameAr: 'وكيل تقارير التدقيق',     role: 'audit' },
      ],
    },
    downloadKit: {
      eyebrow: tx('Take it with you', 'خذها معك'),
      title: tx(`Download the ${brandLabel} Executive Kit`, `حمّل الحزمة التنفيذية لـ ${brandLabel}`),
      body: tx('A concise pack for executives evaluating AI-native GRC.',
               'حزمة موجزة للتنفيذيين الذين يقيمون حوكمة الذكاء الاصطناعي.'),
      ctaLabel: tx('Download kit', 'تحميل الحزمة'),
      featuredAssetKey: 'shahin-executive-overview',
      notification: {
        title: tx('Free executive kit', 'حزمة تنفيذية مجانية'),
        subtitle: tx('Bilingual EN/AR. PDF + slides.', 'ثنائي اللغة. PDF + شرائح.'),
      },
      toast: {
        title: tx('Your kit is ready', 'حزمتك جاهزة'),
        subtitle: tx('Check your inbox for the download link.', 'تحقق من بريدك للحصول على رابط التحميل.'),
      },
    },
    platform: {
      title: tx('A platform, not a checklist tool.', 'منصة، لا قائمة فحص.'),
      body: tx('Foundation, DAuth, Dynamic UI, AI engine, Audit ledger — composable from day one.',
               'Foundation و DAuth وواجهة ديناميكية ومحرك ذكاء اصطناعي وسجل تدقيق — قابلة للتركيب منذ اليوم الأول.'),
      tabs: [
        { id: 'foundation', label: tx('Foundation', 'الأساس'),
          body: tx('Org, identity, SoD, lifecycle — the unconditional DNA layer.',
                   'المنظمة والهوية والفصل بين الواجبات ودورة الحياة — طبقة الحمض النووي.') },
        { id: 'dauth', label: tx('DAuth', 'DAuth'),
          body: tx('Identity, session, MFA, authority, SoD enforcement at the edge.',
                   'الهوية والجلسات والمصادقة المتعددة والصلاحيات عند الحافة.') },
        { id: 'dynamic-ui', label: tx('Dynamic UI', 'واجهة ديناميكية'),
          body: tx('Routes, navigation, widgets resolved from the DB registry.',
                   'المسارات والتنقل والعناصر تُحل من سجل قاعدة البيانات.') },
        { id: 'ai-engine', label: tx('AI Engine', 'محرك الذكاء'),
          body: tx('Provider-agnostic AI orchestration with audit-grade provenance.',
                   'تنسيق ذكاء اصطناعي مستقل عن المزود مع تتبع بمستوى التدقيق.') },
        { id: 'audit', label: tx('Audit Ledger', 'سجل التدقيق'),
          body: tx('Cryptographic ledger for every approved agent action.',
                   'سجل مشفر لكل إجراء وكيل معتمد.') },
      ],
    },
    modules: [
      { id: 'risk',     title: tx('Risk', 'المخاطر'),         body: tx('Quantified risk register, AI explainability built in.', 'سجل مخاطر كمي مع قابلية شرح مدمجة.') },
      { id: 'controls', title: tx('Controls', 'الضوابط'),     body: tx('Author once, prove everywhere.', 'كتابة واحدة، إثبات في كل مكان.') },
      { id: 'evidence', title: tx('Evidence', 'الأدلة'),      body: tx('Continuous collection, cryptographic ledger.', 'جمع مستمر، سجل مشفر.') },
      { id: 'audit',    title: tx('Audit', 'التدقيق'),        body: tx('Always-ready, examiner-grade exports.', 'جاهز دائماً، تصدير بمستوى المراجع.') },
      { id: 'policy',   title: tx('Policy', 'السياسات'),      body: tx('Lifecycle, approvals, attestations.', 'دورة الحياة، الموافقات، الإقرارات.') },
      { id: 'vendor',   title: tx('Third-party', 'الأطراف الخارجية'), body: tx('Continuous vendor monitoring.', 'مراقبة موردين مستمرة.') },
    ],
    industries: [
      { id: 'finance', label: tx('Financial services', 'الخدمات المالية') },
      { id: 'health',  label: tx('Healthcare', 'الرعاية الصحية') },
      { id: 'gov',     label: tx('Government', 'الحكومة') },
      { id: 'energy',  label: tx('Energy', 'الطاقة') },
      { id: 'tech',    label: tx('Technology', 'التقنية') },
    ],
    architecture: {
      title: tx('Built on platform DNA.', 'مبني على حمض نووي للمنصة.'),
      body: tx('Four tiers — products → modules → services → platform. Never reverse.',
               'أربع طبقات — منتجات ← وحدات ← خدمات ← منصة. لا عكس.'),
      rows: [
        { key: 'tier-1', label: tx('Tier 1 — Platform DNA', 'الطبقة ١ — الحمض النووي'),
          value: tx('Foundation, DAuth, DSOC, DNOC, AI, UI-System, Workflow',
                    'Foundation و DAuth و DSOC و DNOC والذكاء وواجهة ونظام عمل') },
        { key: 'tier-2', label: tx('Tier 2 — Microservices', 'الطبقة ٢ — الخدمات المصغرة'),
          value: tx('35+ Express services managed by PM2', 'أكثر من ٣٥ خدمة Express تُدار بواسطة PM2') },
        { key: 'tier-3', label: tx('Tier 3 — Module Library', 'الطبقة ٣ — مكتبة الوحدات'),
          value: tx('60+ kebab-case business modules, tenant-entitled', 'أكثر من ٦٠ وحدة عمل بحقوق المستأجر') },
        { key: 'tier-4', label: tx('Tier 4 — Product Consumers', 'الطبقة ٤ — منتجات مستهلكة'),
          value: 'Shahin-AI, Dogan-AI, Dogan-Consult, Dogan-Hub, Dogan-Lab' },
      ],
    },
    ai: {
      eyebrow: tx('How agents act safely', 'كيف يعمل الوكلاء بأمان'),
      title: tx('AI agents you can audit.', 'وكلاء ذكاء يمكن تدقيقهم.'),
      body: tx('Every model decision carries provenance, confidence, and reversal path.',
               'كل قرار يحمل مصدراً وثقة ومسار تراجع.'),
      currentStep: 5,
      steps: [
        { state: 'complete', label: tx('Observe', 'مراقبة'),  description: tx('Telemetry + signals', 'قياس وإشارات') },
        { state: 'complete', label: tx('Suggest', 'اقتراح'),  description: tx('Model proposes', 'النموذج يقترح') },
        { state: 'complete', label: tx('Approve', 'موافقة'),  description: tx('Human-in-the-loop', 'إنسان في الحلقة') },
        { state: 'complete', label: tx('Execute', 'تنفيذ'),   description: tx('Action issued', 'إصدار الإجراء') },
        { state: 'complete', label: tx('Verify', 'تحقق'),     description: tx('Outcome checked', 'فحص النتيجة') },
        { state: 'current',  label: tx('Log', 'تسجيل'),       description: tx('Cryptographic ledger', 'سجل مشفر') },
      ],
    },
    pricing: {
      title: tx('Pricing that scales with proof, not seats.', 'تسعير يقاس بالأدلة، لا بالمقاعد.'),
      ctaLabel: tx('See pricing', 'استعرض التسعير'),
      href: '/pricing',
      columns: [] as Array<{ key: string; header: string; width?: string; align?: 'left' | 'center' | 'right' }>,
      rows: [] as Array<Record<string, string>>,
    },
    testimonials: [
      { id: '1', quote: tx('Our auditors finished in days, not weeks.', 'انتهى المدققون في أيام، لا أسابيع.'),
        author: tx('Head of GRC', 'رئيس الحوكمة'), role: tx('Bank', 'مصرف') },
      { id: '2', quote: tx('The first GRC tool people actually use.', 'أول أداة حوكمة يستعملها الناس فعلاً.'),
        author: tx('CISO', 'مدير الأمن'),          role: tx('Insurer', 'تأمين') },
      { id: '3', quote: tx('Continuous evidence, finally.', 'أدلة مستمرة، أخيراً.'),
        author: tx('VP Risk', 'نائب رئيس المخاطر'), role: tx('Telco', 'اتصالات') },
    ],
    customerLogos: [
      { id: '1', name: 'BankCo' }, { id: '2', name: 'GovDept' },
      { id: '3', name: 'HealthOrg' }, { id: '4', name: 'Energy+' }, { id: '5', name: 'Telco9' },
    ],
    resources: [
      { id: 'docs',  title: tx('Docs', 'الوثائق'),         body: tx('Build with the platform SDK.', 'ابنِ مع SDK المنصة.'), href: '/docs' },
      { id: 'blog',  title: tx('Blog', 'المدونة'),         body: tx('Field notes from agentic GRC.', 'ملاحظات ميدانية من الحوكمة الوكيلة.'), href: '/blog' },
      { id: 'wp',    title: tx('White papers', 'أوراق بيضاء'), body: tx('In-depth research.', 'بحث متعمق.'), href: '/whitepapers' },
    ],
    faq: [
      { q: tx('Is this on-prem ready?', 'هل جاهز للنشر الداخلي؟'),
        a: tx('Yes — same product, same DB topology.', 'نعم — نفس المنتج، نفس بنية قاعدة البيانات.') },
      { q: tx('How are agent actions authorised?', 'كيف يُصرّح بإجراءات الوكلاء؟'),
        a: tx('Through dauth + module-level RBAC, with audit trail.', 'عبر DAuth + صلاحيات على مستوى الوحدة مع سجل تدقيق.') },
      { q: tx('Can we bring our own AI model?', 'هل يمكن استخدام نموذجنا الخاص؟'),
        a: tx('Yes — the AI engine is provider-agnostic.', 'نعم — محرك الذكاء مستقل عن المزود.') },
    ],
    ctaBanner: {
      eyebrow: tx('Get started', 'ابدأ'),
      title: tx('Ready to see it run?', 'جاهز لتراها تعمل؟'),
      sub: tx('Spin up a sandbox in 90 seconds. No credit card. Bring your own LLM.',
              'صندوق رمل في ٩٠ ثانية. بدون بطاقة. نموذجك الخاص.'),
    },
    breadcrumb: buildBreadcrumb(routePath, tx),
  };
}

interface BrandTokenRow { token_key: string; token_value: string }
interface BrandAssetRow {
  asset_kind: string;
  asset_code: string | null;
  theme: string;
  locale: string | null;
  direction: string | null;
  source_kind: string;
  svg: string | null;
  url: string | null;
  mime: string | null;
  width: number;
  height: number;
  alt_en: string;
  alt_ar: string;
  version: number;
}

export function createBrandRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/brand', async (req: Request, res: Response) => {
    const brandCode = String(req.query.brand_code ?? '').trim();
    if (!ALLOWED_BRANDS.has(brandCode)) {
      res.status(404).json({ error: 'unknown_brand', brand_code: brandCode });
      return;
    }
    try {
      const tokensQ = await pool.query<BrandTokenRow>(
        `SELECT token_key, token_value
           FROM dos.marketing_brand_tokens
          WHERE brand_code = $1`,
        [brandCode],
      );
      const assetsQ = await pool.query<BrandAssetRow>(
        `SELECT asset_kind, asset_code, theme, locale, direction, source_kind,
                svg, url, mime, width, height, alt_en, alt_ar, version
           FROM dos.marketing_brand_assets
          WHERE brand_code = $1 AND active = TRUE
          ORDER BY asset_kind, asset_code NULLS FIRST, theme`,
        [brandCode],
      );

      const tokens: Record<string, string> = {};
      for (const r of tokensQ.rows) tokens[r.token_key.replace(/^--/, '')] = r.token_value;

      const assets = assetsQ.rows.map((r) => ({
        brandCode,
        assetKind: r.asset_kind,
        assetCode: r.asset_code,
        theme: r.theme,
        locale: r.locale,
        direction: r.direction,
        source:
          r.source_kind === 'svg'
            ? { kind: 'svg', svg: r.svg ?? '' }
            : { kind: 'url', url: r.url ?? '', mime: r.mime ?? 'image/svg+xml' },
        width: r.width,
        height: r.height,
        altEn: r.alt_en,
        altAr: r.alt_ar,
        version: r.version,
      }));

      // Sanity refusal: brand must have at least the eagle asset, otherwise
      // serving an empty bundle would silently break the public landing.
      if (!assets.some((a) => a.assetKind === 'logo-eagle')) {
        res.status(503).json({ error: 'brand_incomplete', detail: 'logo-eagle missing' });
        return;
      }

      res.json({ brandCode, tokens, assets });
    } catch (e) {
      res.status(500).json({ error: 'brand_get_failed', message: (e as Error).message });
    }
  });

  router.get('/marketing/config', async (req: Request, res: Response) => {
    const brandCode = String(req.query.brand ?? '').trim();
    const locale    = String(req.query.locale ?? 'en').trim();
    if (!ALLOWED_BRANDS.has(brandCode)) {
      res.status(404).json({ error: 'unknown_brand', brand: brandCode });
      return;
    }
    if (!ALLOWED_LOCALES.has(locale)) {
      res.status(400).json({ error: 'invalid_locale', locale });
      return;
    }
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    const tx = (en: string, ar: string) => (locale === 'ar' ? ar : en);

    try {
      // ── DB-driven nav + footer (replaces all hardcoded arrays) ───────────
      // Carbon registry: nav items carry carbon_key (link|button|header-menu-item)
      // verified active in dos.ui_carbon_components.
      const [navQ, navGroupQ, footerGroupQ, footerItemQ] = await Promise.all([
        pool.query(
          `SELECT id, label_en, label_ar, label_key, href, variant, carbon_key,
                  hide_for_locales, nav_group
             FROM dos.marketing_nav_items
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, label_en, label_ar, sort_order
             FROM dos.marketing_nav_groups
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, title_en, title_ar, title_key
             FROM dos.marketing_footer_groups
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, group_id, label_en, label_ar, label_key, href
             FROM dos.marketing_footer_items
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY group_id, sort_order`,
          [brandCode],
        ),
      ]);

      // Assemble navItems — locale label + group resolved server-side
      const navItems = navQ.rows.map((r) => ({
        id:              r.id,
        labelKey:        r.label_key,
        label:           locale === 'ar' ? r.label_ar : r.label_en,
        href:            r.href,
        variant:         r.variant,
        carbonKey:       r.carbon_key,
        navGroup:        r.nav_group ?? null,
        hideForLocales:  r.hide_for_locales ?? null,
      }));

      // Assemble navGroups (dropdown menu descriptors)
      const navGroupsByKey = new Map(navQ.rows.filter((r) => r.nav_group).map((r) => [r.nav_group, r]));
      const navGroups = navGroupQ.rows.map((g) => ({
        id:    g.id,
        label: locale === 'ar' ? g.label_ar : g.label_en,
        items: navItems.filter((n) => n.navGroup === g.id),
      }));

      // Group footer items by group_id
      const itemsByGroup = new Map<string, typeof footerItemQ.rows>();
      for (const item of footerItemQ.rows) {
        const g = itemsByGroup.get(item.group_id) ?? [];
        g.push(item);
        itemsByGroup.set(item.group_id, g);
      }

      // Assemble footerGroups
      const footerGroups = footerGroupQ.rows.map((g) => ({
        id:       g.id,
        titleKey: g.title_key,
        title:    locale === 'ar' ? g.title_ar : g.title_en,
        items: (itemsByGroup.get(g.id) ?? []).map((it) => ({
          id:       it.id,
          labelKey: it.label_key,
          label:    locale === 'ar' ? it.label_ar : it.label_en,
          href:     it.href,
        })),
      }));

      res.json({
        brandCode,
        locale,
        direction,
        publicMarketingEnabled: true,
        navItems,
        navGroups,
        footerGroups,
        flags: {
          landingHeroVideo:        false,
          landingLiveStatusPill:   false,
          landingAgenticProof:     true,
        },
        homeContent: buildMarketingHomeContent(brandCode, locale, tx, String(req.path || '/')),
      });
    } catch (e) {
      res.status(500).json({ error: 'marketing_config_failed', message: (e as Error).message });
    }
  });

  return router;
}
