// ============================================
// Shahin-Ai — PDPL DPIA Report
// ============================================

import { shell, bi, esc, fetchRisks, fetchPolicies, fetchTenantName } from './report-shared';

export async function genDpia(m: { title: string; titleAr: string }, tenantId: string | null): Promise<string> {
  let isLive = false;
  let orgEn = "Al-Manar Education Group";
  let orgAr = "مجموعة المنار التعليمية";

  interface RiskRow { title: string; likelihood: string; impact: string; level: string }
  interface PolicyRow { title: string; status: string }
  let risks: RiskRow[];
  let policies: PolicyRow[];

  if (tenantId) {
    try {
      const tenantName = await fetchTenantName(tenantId);
      orgEn = tenantName; orgAr = tenantName;

      const dbRisks = await fetchRisks(tenantId);
      const dbPolicies = await fetchPolicies(tenantId);

      if (dbRisks.length > 0 || dbPolicies.length > 0) {
        isLive = true;
        risks = dbRisks.slice(0, 10).map(r => ({
          title: r.title,
          likelihood: r.likelihood,
          impact: r.impact,
          level: r.riskScore >= 12 ? 'high' : r.riskScore >= 6 ? 'medium' : 'low',
        }));
        policies = dbPolicies.slice(0, 10).map(p => ({
          title: p.title,
          status: p.status === 'approved' || p.status === 'active' ? 'active' : p.status === 'draft' ? 'partial' : p.status,
        }));
      } else {
        risks = getDemoDpiaRisks();
        policies = getDemoDpiaPolicies();
      }
    } catch {
      risks = getDemoDpiaRisks();
      policies = getDemoDpiaPolicies();
    }
  } else {
    risks = getDemoDpiaRisks();
    policies = getDemoDpiaPolicies();
  }

  const highRisks = risks.filter(r => r.level === 'high').length;
  const medRisks = risks.filter(r => r.level === 'medium').length;
  const lowRisks = risks.filter(r => r.level === 'low').length;
  const activePolicies = policies.filter(p => p.status === 'active').length;

  const nav = `<div class="nav-bar">
    <a class="nav-pill active" href="#activity">${bi("النشاط", "Activity")}</a>
    <a class="nav-pill" href="#risks">${bi("المخاطر", "Risks")}</a>
    <a class="nav-pill" href="#mitigations">${bi("التدابير", "Mitigations")}</a>
    <a class="nav-pill" href="#verdict">${bi("التوصية", "Verdict")}</a>
  </div>`;

  const body = `${nav}<div class="container">
  <div class="rpt-header">
    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
      <div><h1>${bi(m.titleAr, m.title)}</h1><div class="sub">${bi(esc(orgAr), esc(orgEn))}</div></div>
      <span class="sample-badge">${bi(isLive ? "بيانات حية" : "تقرير تجريبي", isLive ? "LIVE DATA" : "SAMPLE")}</span>
    </div>
    <div class="meta"><span>${bi("متوافق مع المادة 10 من PDPL", "Aligned with PDPL Article 10")}</span><span>${bi("صيغة جاهزة لهيئة البيانات SDAIA", "SDAIA-Ready Format")}</span></div>
  </div>

  <div class="card" id="activity">
    <h2>${bi("معلومات المنظمة", "Organization Info")}</h2>
    <div class="co-grid">
      <div><div class="lbl">${bi("المنظمة", "Organization")}</div><div class="val">${esc(orgEn)}</div></div>
      <div><div class="lbl">${bi("تاريخ التقييم", "Assessment Date")}</div><div class="val">${new Date().toISOString().split("T")[0]}</div></div>
    </div>
  </div>

  <div class="card" id="risks">
    <h2>${bi("تقييم المخاطر", "Risk Assessment")}</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="n" style="color:#dc2626">${highRisks}</div><div class="l">${bi("مخاطر عالية", "High Risks")}</div></div>
      <div class="kpi"><div class="n" style="color:#f59e0b">${medRisks}</div><div class="l">${bi("مخاطر متوسطة", "Medium Risks")}</div></div>
      <div class="kpi"><div class="n" style="color:#16a34a">${lowRisks}</div><div class="l">${bi("مخاطر منخفضة", "Low Risks")}</div></div>
      <div class="kpi"><div class="n" style="color:#0369a1">${activePolicies}/${policies.length}</div><div class="l">${bi("تدابير فعّالة", "Active Mitigations")}</div></div>
    </div>
    <div class="chart-row"><div class="chart-box" style="grid-column:1/-1"><h3>${bi("مصفوفة المخاطر", "Risk Matrix")}</h3><canvas id="riskBar"></canvas></div></div>
    <table>
      <thead><tr><th>${bi("المخاطر", "Risk")}</th><th>${bi("الاحتمالية", "Likelihood")}</th><th>${bi("الأثر", "Impact")}</th><th>${bi("المستوى", "Level")}</th></tr></thead>
      <tbody>
        ${risks.map(r => `<tr><td>${esc(r.title)}</td><td>${esc(r.likelihood)}</td><td>${esc(r.impact)}</td><td><span class="badge ${r.level === 'high' ? 'b-red' : r.level === 'medium' ? 'b-org' : 'b-grn'}">${bi(r.level === 'high' ? 'عالي' : r.level === 'medium' ? 'متوسط' : 'منخفض', r.level.charAt(0).toUpperCase() + r.level.slice(1))}</span></td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="card" id="mitigations">
    <h2>${bi("ضوابط وسياسات", "Controls & Policies")}</h2>
    <table>
      <thead><tr><th>#</th><th>${bi("الضابط", "Control/Policy")}</th><th>${bi("الحالة", "Status")}</th></tr></thead>
      <tbody>
        ${policies.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.title)}</td><td><span class="badge ${p.status === 'active' ? 'b-grn' : 'b-ylw'}">${bi(p.status === 'active' ? 'فعّال' : 'جزئي', p.status === 'active' ? 'Active' : 'Partial')}</span></td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="card" id="verdict">
    <h2>${bi("توصية DPIA", "DPIA Recommendation")}</h2>
    ${highRisks === 0
      ? `<div style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:24px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;margin-bottom:8px">${bi("&#10003; آمن للمتابعة", "&#10003; SAFE TO PROCEED")}</div>
          <p style="font-size:13px;opacity:.9">${bi("لا توجد مخاطر عالية. يجوز استمرار المعالجة مع المراقبة المستمرة.", "No high risks identified. Processing may continue with ongoing monitoring.")}</p>
        </div>`
      : `<div style="background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;padding:24px;border-radius:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;margin-bottom:8px">${bi("&#9888; المتابعة بشروط", "&#9888; PROCEED WITH CONDITIONS")}</div>
          <p style="font-size:13px;opacity:.9">${bi(`يجوز استمرار المعالجة بشرط تنفيذ جميع تدابير المخاطر العالية (${highRisks}) خلال 60 يوم.`, `Processing may continue provided all ${highRisks} high-risk mitigations are fully implemented within 60 days.`)}</p>
        </div>`
    }
  </div>
</div>`;

  const riskScores = risks.map(r => r.level === 'high' ? 15 : r.level === 'medium' ? 8 : 3);
  const chartScript = `<script>
document.addEventListener('DOMContentLoaded',function(){
  new Chart(document.getElementById('riskBar'),{type:'bar',data:{labels:${JSON.stringify(risks.map(r => r.title.substring(0, 30)))},datasets:[{label:'Risk Score',data:${JSON.stringify(riskScores)},backgroundColor:${JSON.stringify(riskScores.map(s => s >= 12 ? '#dc2626' : s >= 6 ? '#f59e0b' : '#16a34a'))},borderRadius:6}]},options:{responsive:true,indexAxis:'y',scales:{x:{min:0,max:20}},plugins:{legend:{display:false}}}});
});
<\/script>`;

  return shell(m.title, m.titleAr, body, chartScript, isLive);
}

/** Demo DPIA risk data. */
export function getDemoDpiaRisks() {
  return [
    { title: "Unauthorized access to records", likelihood: "Medium", impact: "High", level: "high" },
    { title: "Minor PII data breach", likelihood: "Low", impact: "Critical", level: "high" },
    { title: "Cross-border data transfer", likelihood: "Medium", impact: "High", level: "high" },
    { title: "Excessive data collection", likelihood: "Medium", impact: "Medium", level: "medium" },
    { title: "No retention policy", likelihood: "Medium", impact: "Medium", level: "medium" },
  ];
}

/** Demo DPIA policy data. */
export function getDemoDpiaPolicies() {
  return [
    { title: "Consent Management", status: "active" },
    { title: "Data Subject Rights Portal", status: "active" },
    { title: "Processing Register", status: "active" },
    { title: "Breach Notification", status: "active" },
    { title: "Data Protection Officer", status: "active" },
    { title: "Automated Decision Safeguards", status: "partial" },
    { title: "Child Data Protections", status: "partial" },
  ];
}
