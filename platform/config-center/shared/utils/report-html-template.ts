// ============================================
// Shahin GRC — Shared HTML Report Template
// Standardized header, footer, authority & disclaimer
// Used by all frontend client-side HTML exports
// ============================================

const REPORT_META = {
  platform: 'Shahin-AI GRC Platform',
  platformAr: 'منصة شاهين للحوكمة والمخاطر والامتثال',
  authority: 'Dogan Consult — Innovative ICT Solutions',
  authorityAr: 'دوغان للاستشارات — حلول تقنية مبتكرة',
  website: 'www.shahin-ai.com',
  email: 'info@shahin-ai.com',
  classification: 'CONFIDENTIAL',
  classificationAr: 'سري',
};

/**
 * Wraps report body HTML with standardized header, footer, authority, stamp & disclaimer.
 */
export function wrapReportHTML(options: {
  title: string;
  titleAr?: string;
  accentColor?: string;
  bodyHTML: string;
  generatedDate?: string;
  path?: string;
}): string {
  const date = options.generatedDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const accent = options.accentColor || '#0c4a6e';
  const path = options.path || `Dashboard > Reports > ${options.title}`;
  const titleAr = options.titleAr || options.title;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${options.title} — Shahin-AI</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;background:#f8fafc;line-height:1.7}

/* === Standard Report Header === */
.report-header{background:linear-gradient(135deg,#0c4a6e,#0369a1,${accent});color:#fff;padding:0;margin-bottom:28px;position:relative;overflow:hidden;border-radius:0 0 16px 16px}
.report-header::after{content:'';position:absolute;top:-50%;right:-20%;width:400px;height:400px;border-radius:var(--radius-pill);background:rgba(var(--color-white-rgb), .04)}
.header-topbar{display:flex;justify-content:space-between;align-items:center;padding:12px 32px;background:rgba(var(--color-black-rgb), .15);font-size: var(--font-size-sm)}
.header-topbar .logo{font-weight:800;letter-spacing:-.02em}
.header-topbar .logo span{color:#7dd3fc}
.header-stamp{padding:3px 14px;border-radius:var(--radius-sm);background:#92400e;border:1.5px solid #fbbf24;color:#fbbf24;font-size: var(--font-size-xs);font-weight:700;letter-spacing:.5px}
.header-body{padding:28px 32px 20px;text-align:center}
.header-body h1{font-size: var(--font-size-2xl);font-weight:800;margin-bottom:4px}
.header-body .subtitle{font-size: var(--font-size-base);opacity:.8;font-weight:600}
.header-meta{margin-top:12px;display:flex;gap:20px;justify-content:center;flex-wrap:wrap;font-size: var(--font-size-sm);opacity:.65}
.header-path{text-align:center;padding:6px 32px 14px;font-size: var(--font-size-xs);opacity:.5}

/* === Content === */
.container{max-width:1100px;margin:0 auto;padding:0 24px 24px}
.card{background:#fff;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:24px;margin-bottom:20px}
.card h2{font-size: var(--font-size-lg);font-weight:700;color:#0369a1;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e0f2fe}
.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:18px}
.kpi{text-align:center;padding:16px;background:var(--surface-ice);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)}
.kpi .n{font-size: var(--font-size-3xl);font-weight:800;color:#0369a1}.kpi .l{font-size: var(--font-size-xs);color:var(--text-muted);margin-top:4px}
table{width:100%;border-collapse:collapse;font-size: var(--font-size-sm)}
th{background:var(--status-info-bg, #edf5ff);color:#0369a1;font-weight:700;text-align:start;padding:10px 12px;border-bottom:2px solid #bae6fd}
td{padding:10px 12px;border-bottom:1px solid var(--surface-ice)}
tr:hover td{background:var(--surface-ice)}
.badge{display:inline-block;padding:3px 12px;border-radius:var(--radius-pill);font-size: var(--font-size-xs);font-weight:700;letter-spacing:.3px}
.b-red{background:var(--status-danger-bg, #fff1f1);color:#991b1b}.b-org{background:#fed7aa;color:#9a3412}
.b-grn{background:#bbf7d0;color:#14532d}.b-ylw{background:#fde68a;color:#78350f}
.b-blue{background:#bfdbfe;color:#1e40af}
input[type=text]{padding:8px 12px;border:1px solid var(--border-subtle);border-radius:var(--radius);font-size: var(--font-size-sm);margin-bottom:12px;width:300px}

/* === Standard Report Footer === */
.report-footer{max-width:1100px;margin:32px auto 0;padding:0 24px}
.footer-disclaimer{background:var(--status-info-bg, #edf5ff);border:1px solid #bae6fd;border-radius:var(--radius-lg);padding:20px;font-size: var(--font-size-xs);color:var(--text-muted);margin-bottom:16px}
.footer-disclaimer h3{color:#0369a1;font-size: var(--font-size-sm);margin-bottom:8px}
.footer-disclaimer p{margin-top:6px}
.footer-bar{text-align:center;padding:20px 0 32px;color:var(--text-muted);font-size: var(--font-size-xs);border-top:1px solid var(--border-subtle)}
.footer-bar a{color:var(--primary);text-decoration:none;font-weight:600}
.footer-authority{font-weight:700;color:var(--text-muted);margin-bottom:4px}
.footer-meta{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size: var(--font-size-xs);margin-top:6px}

@media print{.report-header .header-topbar,.header-stamp{display:none!important}body{background:#fff}}
@media(max-width:768px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>

<!-- ═══ STANDARD HEADER ═══ -->
<div class="report-header">
  <div class="header-topbar">
    <div class="logo">Shahin<span>-AI</span> &nbsp;|&nbsp; ${REPORT_META.platform}</div>
    <div class="header-stamp">${REPORT_META.classification}</div>
  </div>
  <div class="header-body">
    <h1>${options.title}</h1>
    <div class="subtitle">${titleAr}</div>
    <div class="header-meta">
      <span>📅 ${date}</span>
      <span>🏢 ${REPORT_META.authority}</span>
      <span>🌐 ${REPORT_META.website}</span>
    </div>
  </div>
  <div class="header-path">${path}</div>
</div>

<!-- ═══ REPORT CONTENT ═══ -->
<div class="container">
${options.bodyHTML}
</div>

<!-- ═══ STANDARD FOOTER ═══ -->
<div class="report-footer">
  <div class="footer-disclaimer">
    <h3>Terms & Conditions — إخلاء المسؤولية</h3>
    <p><strong>DISCLAIMER:</strong> This report is confidential and intended for internal use only. Redistribution without authorization is prohibited. Data reflects system state at generation time.</p>
    <p><strong>إخلاء مسؤولية:</strong> هذا التقرير سري ومخصص للاستخدام الداخلي فقط. يُحظر إعادة التوزيع دون تصريح. البيانات مأخوذة من النظام وقت الإنشاء.</p>
    <p><strong>Confidentiality:</strong> All report data is encrypted and stored securely. Classification: ${REPORT_META.classification}.</p>
    <p>© ${new Date().getFullYear()} Shahin-AI — ${REPORT_META.email}</p>
  </div>
  <div class="footer-bar">
    <div class="footer-authority">${REPORT_META.platform} — ${REPORT_META.authority}</div>
    <a href="https://${REPORT_META.website}" target="_blank">${REPORT_META.website}</a> &nbsp;|&nbsp; ${REPORT_META.email}
    <div class="footer-meta">
      <span>Generated: ${date}</span>
      <span>Classification: ${REPORT_META.classification}</span>
      <span>© ${new Date().getFullYear()} Shahin-AI — All rights reserved</span>
    </div>
  </div>
</div>

</body>
</html>`;
}
