// ============================================
// Shahin-Ai — Shared report utilities
// Interfaces, data fetchers, HTML helpers
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ──────────────────────────────────────────────────────────

export interface TenantFramework {
  code: string;
  name: string;
  controlCount: number;
  score: number;
}

export interface TenantControl {
  controlId: string;
  title: string;
  status: string;
  effectiveness: number;
  frameworkCode: string;
}

export interface TenantRisk {
  riskId: string;
  title: string;
  riskScore: number;
  likelihood: string;
  impact: string;
  status: string;
  category: string;
}

export interface TenantPolicy {
  policyId: string;
  title: string;
  status: string;
  version: string;
  approvedAt: string | null;
}

export interface TenantEvidenceTask {
  taskId: string;
  controlId: string;
  status: string;
  dueDate: string | null;
  collectedAt: string | null;
}

// ── Data Fetchers ───────────────────────────────────────────────────────

/** Fetches frameworks with control counts and average scores from tenant schema. */
export async function fetchFrameworks(tenantId: string): Promise<TenantFramework[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT f.framework_id AS code,
            f.name AS name,
            COUNT(c.control_id) AS control_count,
            COALESCE(AVG(c.effectiveness), 0) AS avg_score
     FROM "${schema}".frameworks f
     LEFT JOIN "${schema}".controls c ON c.framework_id = f.framework_id
     GROUP BY f.framework_id, f.name
     ORDER BY f.name`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    code: r.code,
    name: r.name,
    controlCount: Number(r.control_count),
    score: Math.round(Number(r.avg_score)),
  }));
}

/** Fetches controls from tenant schema. */
export async function fetchControls(tenantId: string): Promise<TenantControl[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT c.control_id, c.title, c.status,
            COALESCE(c.effectiveness, 0) AS effectiveness,
            COALESCE(f.framework_id, '') AS framework_code
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_id = c.framework_id
     ORDER BY c.control_id
     LIMIT 200`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    controlId: r.control_id,
    title: r.title,
    status: r.status,
    effectiveness: Number(r.effectiveness),
    frameworkCode: r.framework_code,
  }));
}

/** Fetches risks from tenant schema. */
export async function fetchRisks(tenantId: string): Promise<TenantRisk[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT risk_id, title,
            COALESCE(risk_score, 0) AS risk_score,
            COALESCE(likelihood, 'medium') AS likelihood,
            COALESCE(impact, 'medium') AS impact,
            COALESCE(status, 'open') AS status,
            COALESCE(category, 'general') AS category
     FROM "${schema}".risks
     ORDER BY risk_score DESC
     LIMIT 100`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    riskId: r.risk_id,
    title: r.title,
    riskScore: Number(r.risk_score),
    likelihood: r.likelihood,
    impact: r.impact,
    status: r.status,
    category: r.category,
  }));
}

/** Fetches policies from tenant schema. */
export async function fetchPolicies(tenantId: string): Promise<TenantPolicy[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT policy_id, title, status, COALESCE(version::text, '1.0') AS version,
            approved_at
     FROM "${schema}".governance_policies
     ORDER BY title
     LIMIT 100`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    policyId: r.policy_id,
    title: r.title,
    status: r.status,
    version: r.version,
    approvedAt: r.approved_at,
  }));
}

/** Fetches evidence tasks from tenant schema. */
export async function fetchEvidenceTasks(tenantId: string): Promise<TenantEvidenceTask[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT task_id, control_id, status,
            due_date, assigned_at
     FROM "${schema}".evidence_tasks
     ORDER BY due_date DESC NULLS LAST
     LIMIT 200`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    taskId: r.task_id,
    controlId: r.control_id,
    status: r.status,
    dueDate: r.due_date,
    collectedAt: r.assigned_at,
  }));
}

/** Fetches tenant name from public schema. */
export async function fetchTenantName(tenantId: string): Promise<string> {
  try {
    const result = await safeQuery(
      `SELECT name FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    return result.rows[0]?.name ?? tenantId;
  } catch {
    return tenantId;
  }
}

// ── HTML Helpers ────────────────────────────────────────────────────────

export function shell(titleEn: string, titleAr: string, body: string, chartScript: string = "", isLive: boolean = false): string {
  const date = new Date().toISOString().split("T")[0];
  const badgeLabel = isLive ? "LIVE DATA" : "SAMPLE";
  const badgeLabelAr = isLive ? "بيانات حية" : "تقرير تجريبي";
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titleAr} — Shahin-AI</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;background:#f8fafc;line-height:1.7}
html[dir=rtl] body{direction:rtl}
html[dir=ltr] body{direction:ltr}
.container{max-width:1040px;margin:0 auto;padding:24px}

/* ── Sticky Top Bar ── */
.topbar{position:sticky;top:0;z-index:100;background:linear-gradient(135deg,#0c4a6e,#0369a1);color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 12px rgba(0,0,0,.15)}
.topbar .logo{font-size:18px;font-weight:800;letter-spacing:-.02em}
.topbar .logo span{color:#7dd3fc}
.topbar-actions{display:flex;gap:8px;align-items:center}
.lang-toggle{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1.5px solid rgba(255,255,255,.3)}
.lang-btn{padding:5px 16px;background:transparent;color:rgba(255,255,255,.7);border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
.lang-btn.active{background:rgba(255,255,255,.2);color:#fff}
.print-btn{padding:6px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.3);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px}
.print-btn:hover{background:rgba(255,255,255,.25)}

/* ── Navigation ── */
.nav-bar{background:#fff;border-bottom:1px solid #e2e8f0;padding:8px 24px;display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:52px;z-index:99}
.nav-pill{padding:6px 14px;border-radius:99px;font-size:12px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;text-decoration:none;cursor:pointer;transition:all .2s;white-space:nowrap}
.nav-pill:hover,.nav-pill.active{background:#0ea5e9;color:#fff;border-color:#0ea5e9}

/* ── Header ── */
.rpt-header{background:linear-gradient(135deg,#0c4a6e,#0369a1,#0ea5e9);color:#fff;padding:36px 32px;border-radius:16px;margin-bottom:28px;position:relative;overflow:hidden}
.rpt-header::after{content:'';position:absolute;top:-50%;right:-20%;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,.05)}
.rpt-header h1{font-size:26px;font-weight:800;margin-bottom:4px}
.rpt-header .sub{font-size:16px;opacity:.85;font-weight:600}
.rpt-header .meta{margin-top:14px;display:flex;gap:20px;flex-wrap:wrap;font-size:12px;opacity:.7}
.sample-badge{display:inline-block;padding:4px 14px;border-radius:99px;font-size:11px;font-weight:700;background:${isLive ? '#bbf7d0;color:#14532d' : '#fef3c7;color:#92400e'}}

/* ── Section cards ── */
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;margin-bottom:20px;scroll-margin-top:120px}
.card h2{font-size:18px;font-weight:700;color:#0369a1;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e0f2fe}

/* ── KPI grid ── */
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.kpi{text-align:center;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
.kpi .n{font-size:28px;font-weight:800;color:#0369a1}.kpi .l{font-size:11px;color:#64748b;margin-top:4px}

/* ── Table ── */
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#f0f9ff;color:#0369a1;font-weight:700;text-align:start;padding:10px 12px;border-bottom:2px solid #bae6fd}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
tr:hover td{background:#f8fafc}

/* ── Badges ── */
.badge{display:inline-block;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.3px}
.b-red{background:#fecaca;color:#991b1b}.b-org{background:#fed7aa;color:#9a3412}.b-grn{background:#bbf7d0;color:#14532d}
.b-ylw{background:#fde68a;color:#78350f}.b-blue{background:#bfdbfe;color:#1e40af}

/* ── Score ── */
.score{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;font-size:14px;font-weight:800;color:#fff}
.s-hi{background:#16a34a}.s-md{background:#f59e0b}.s-lo{background:#dc2626}
.bar-bg{background:#e2e8f0;border-radius:8px;height:10px;overflow:hidden}.bar-fg{height:100%;border-radius:8px}
.bg{background:linear-gradient(90deg,#16a34a,#22c55e)}.by{background:linear-gradient(90deg,#f59e0b,#fbbf24)}.br{background:linear-gradient(90deg,#dc2626,#ef4444)}

/* ── Charts ── */
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px}
.chart-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;position:relative}
.chart-box canvas{width:100%!important;max-height:280px}
.chart-box h3{font-size:14px;font-weight:700;color:#334155;margin-bottom:10px;text-align:center}

/* ── Company info ── */
.co-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.co-grid .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
.co-grid .val{font-size:14px;font-weight:600;color:#1e293b}

/* ── Terms ── */
.terms{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin-top:28px;font-size:11px;color:#64748b}
.terms h3{color:#0369a1;font-size:13px;margin-bottom:8px}
.terms p{margin-top:6px}
.footer{text-align:center;padding:28px 0;color:#94a3b8;font-size:11px}
.footer a{color:#0ea5e9}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:72px;font-weight:900;color:rgba(14,165,233,.05);pointer-events:none;z-index:0;white-space:nowrap}

/* ── Bilingual toggle ── */
[data-lang=en]{display:none}
html[lang=en] [data-lang=en]{display:initial}
html[lang=en] [data-lang=ar]{display:none}
html[lang=ar] [data-lang=en]{display:none}
html[lang=ar] [data-lang=ar]{display:initial}

@media print{.topbar,.nav-bar,.watermark,.print-btn,.lang-toggle{display:none!important}body{background:#fff}}
@media(max-width:768px){.kpi-row{grid-template-columns:repeat(2,1fr)}.chart-row{grid-template-columns:1fr}.co-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${isLive ? '' : `<div class="watermark" data-lang="ar">تقرير تجريبي</div>
<div class="watermark" data-lang="en">SAMPLE REPORT</div>`}

<!-- Sticky Top Bar -->
<div class="topbar">
  <div class="logo">Shahin<span>-AI</span> &nbsp;|&nbsp; <span data-lang="ar">${titleAr}</span><span data-lang="en">${titleEn}</span></div>
  <div class="topbar-actions">
    <div class="lang-toggle">
      <button class="lang-btn" onclick="setLang('ar')" id="btn-ar">عربي</button>
      <button class="lang-btn active" onclick="setLang('en')" id="btn-en">EN</button>
    </div>
    <button class="print-btn" onclick="window.print()">&#x1F5A8; <span data-lang="ar">طباعة</span><span data-lang="en">Print</span></button>
  </div>
</div>

${body}

<!-- Terms -->
<div class="container">
  <div class="terms">
    <h3 data-lang="ar">${isLive ? 'الشروط والأحكام — تقرير حي' : 'الشروط والأحكام — تقرير تجريبي'}</h3>
    <h3 data-lang="en">${isLive ? 'Terms & Conditions — Live Report' : 'Terms & Conditions — Sample Report'}</h3>
    ${isLive ? `
    <p data-lang="ar"><strong>سرية:</strong> هذا التقرير يحتوي على بيانات حية من مساحة العمل الخاصة بمنظمتك. يُعامل كمعلومات سرية.</p>
    <p data-lang="en"><strong>CONFIDENTIAL:</strong> This report contains live data from your organization's workspace. Treat as confidential information.</p>
    ` : `
    <p data-lang="ar"><strong>إخلاء مسؤولية:</strong> هذا التقرير مُنشأ ببيانات وهمية لأغراض العرض فقط. أسماء الشركات والنتائج خيالية تمامًا.</p>
    <p data-lang="en"><strong>DISCLAIMER:</strong> This report uses fictional demo data for demonstration only. Company names and scores are entirely fictional.</p>
    `}
    <p data-lang="ar"><strong>الاستخدام:</strong> يوضح هذا النموذج شكل وعمق التقارير المُنتجة بواسطة منصة Shahin-AI. التقارير الفعلية تعتمد على بيانات تقييم منظمتك الحقيقية.</p>
    <p data-lang="en"><strong>Usage:</strong> This sample illustrates the format and depth of Shahin-AI reports. Actual reports use your organization's real assessment data.</p>
    <p data-lang="ar"><strong>السرية:</strong> جميع بيانات التقارير مشفرة ومخزنة بأمان. تُعامل كمعلومات سرية.</p>
    <p data-lang="en"><strong>Confidentiality:</strong> All report data is encrypted and stored securely. Treat as confidential information.</p>
    <p>&copy; ${new Date().getFullYear()} Shahin-AI — info@shahin-ai.com</p>
  </div>
  <div class="footer">
    <strong>AGRC-OS by Dogan Consult</strong> — KSA GRC Platform · <a href="https://www.doganconsult.com" target="_blank" style="color:#0369a1;text-decoration:none;font-weight:700">Dogan Consult</a><br>
    <span style="font-size:11px;color:#94a3b8"><a href="https://www.doganconsult.com" target="_blank" style="color:#0369a1;text-decoration:none">www.doganconsult.com</a> — Innovative ICT Solutions</span><br>
    <span data-lang="ar">تاريخ الإنشاء: ${date}</span><span data-lang="en">Generated: ${date}</span> &nbsp;|&nbsp; <span class="sample-badge">${bi(badgeLabelAr, badgeLabel)}</span><br>
    <span data-lang="ar">زُر <a href="https://www.shahin-ai.com">www.shahin-ai.com</a> لإنشاء تقارير منظمتك</span>
    <span data-lang="en">Visit <a href="https://www.shahin-ai.com">www.shahin-ai.com</a> to generate your company reports</span>
  </div>
</div>

<script>
function setLang(l){
  document.documentElement.lang=l;
  document.documentElement.dir=l==='ar'?'rtl':'ltr';
  document.getElementById('btn-ar').classList.toggle('active',l==='ar');
  document.getElementById('btn-en').classList.toggle('active',l==='en');
}
// Default: Arabic
setLang('ar');
</script>
${chartScript}
</body></html>`;
}

export function bi(ar: string, en: string): string {
  return `<span data-lang="ar">${ar}</span><span data-lang="en">${en}</span>`;
}

/** Escapes HTML special characters to prevent XSS in dynamic data. */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
