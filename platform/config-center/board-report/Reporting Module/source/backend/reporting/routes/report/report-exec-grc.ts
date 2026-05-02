// ============================================
// Shahin-Ai — Executive GRC Dashboard Report
// ============================================

import { shell, bi, esc, fetchFrameworks, fetchRisks, fetchControls, fetchEvidenceTasks, fetchTenantName } from './report-shared';

export async function genExecGrc(m: { title: string; titleAr: string }, tenantId: string | null): Promise<string> {
  let isLive = false;
  let orgEn = "Arabian Healthcare Holdings";
  let orgAr = "القابضة العربية للرعاية الصحية";

  interface FwRow { n: string; s: number; t: string }
  interface RiskCatRow { cat: string; count: number; critical: number; high: number; medium: number; low: number }
  let fws: FwRow[];
  let riskCats: RiskCatRow[];
  let openRisks = 23;
  let controlsMonitored = 156;
  let overallCompliance = 74;

  if (tenantId) {
    try {
      const tenantName = await fetchTenantName(tenantId);
      orgEn = tenantName; orgAr = tenantName;

      const dbFrameworks = await fetchFrameworks(tenantId);
      const dbRisks = await fetchRisks(tenantId);
      const dbControls = await fetchControls(tenantId);
      const _dbEvidence = await fetchEvidenceTasks(tenantId);

      if (dbFrameworks.length > 0) {
        isLive = true;
        fws = dbFrameworks.map(fw => ({
          n: fw.name.substring(0, 20),
          s: fw.score,
          t: `${fw.score >= 50 ? '↑' : '→'} ${fw.controlCount} controls`,
        }));

        overallCompliance = fws.length > 0 ? Math.round(fws.reduce((a, f) => a + f.s, 0) / fws.length) : 0;
        openRisks = dbRisks.filter(r => r.status === 'open').length;
        controlsMonitored = dbControls.length;

        // Group risks by category
        const catMap = new Map<string, { count: number; critical: number; high: number; medium: number; low: number }>();
        for (const r of dbRisks) {
          const cat = r.category || 'General';
          if (!catMap.has(cat)) catMap.set(cat, { count: 0, critical: 0, high: 0, medium: 0, low: 0 });
          const entry = catMap.get(cat)!;
          entry.count++;
          const level = r.riskScore >= 15 ? 'critical' : r.riskScore >= 10 ? 'high' : r.riskScore >= 5 ? 'medium' : 'low';
          entry[level]++;
        }
        riskCats = Array.from(catMap.entries()).map(([cat, data]) => ({ cat, ...data }));
      } else {
        fws = getDemoGrcFws();
        riskCats = getDemoGrcRiskCats();
      }
    } catch {
      fws = getDemoGrcFws();
      riskCats = getDemoGrcRiskCats();
    }
  } else {
    fws = getDemoGrcFws();
    riskCats = getDemoGrcRiskCats();
  }

  const totalRiskCritical = riskCats.reduce((a, r) => a + r.critical, 0);
  const totalRiskHigh = riskCats.reduce((a, r) => a + r.high, 0);
  const totalRiskMedium = riskCats.reduce((a, r) => a + r.medium, 0);
  const totalRiskLow = riskCats.reduce((a, r) => a + r.low, 0);

  const nav = `<div class="nav-bar">
    <a class="nav-pill active" href="#overview">${bi("النظرة العامة", "Overview")}</a>
    <a class="nav-pill" href="#fwscores">${bi("نتائج الأطر", "Framework Scores")}</a>
    <a class="nav-pill" href="#riskheat">${bi("المخاطر", "Risk Heat")}</a>
    <a class="nav-pill" href="#boardrecs">${bi("التوصيات", "Recommendations")}</a>
  </div>`;

  const body = `${nav}<div class="container">
  <div class="rpt-header">
    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
      <div><h1>${bi(m.titleAr, m.title)}</h1><div class="sub">${bi(esc(orgAr), esc(orgEn))}</div></div>
      <span class="sample-badge">${bi(isLive ? "بيانات حية" : "تقرير تجريبي", isLive ? "LIVE DATA" : "SAMPLE")}</span>
    </div>
    <div class="meta"><span>${bi("تقرير جاهز لمجلس الإدارة", "Board-Ready Format")}</span><span>${bi("رؤى مدعومة بالذكاء الاصطناعي", "AI-Analyzed Insights")}</span></div>
  </div>

  <div class="card" id="overview">
    <h2>${bi("نظرة عامة على وضع الحوكمة", "GRC Posture Overview")}</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="n">${overallCompliance}%</div><div class="l">${bi("الامتثال الإجمالي", "Overall Compliance")}</div></div>
      <div class="kpi"><div class="n">${openRisks}</div><div class="l">${bi("مخاطر مفتوحة", "Open Risks")}</div></div>
      <div class="kpi"><div class="n">${fws.length}</div><div class="l">${bi("أطر نشطة", "Active Frameworks")}</div></div>
      <div class="kpi"><div class="n">${controlsMonitored}</div><div class="l">${bi("ضوابط مراقبة", "Controls Monitored")}</div></div>
    </div>
    <div class="chart-row">
      <div class="chart-box"><h3>${bi("الامتثال حسب الإطار — أعمدة", "Compliance by Framework — Bar")}</h3><canvas id="grcBar"></canvas></div>
      <div class="chart-box"><h3>${bi("توزيع المخاطر — دائري", "Risk Distribution — Doughnut")}</h3><canvas id="grcDo"></canvas></div>
    </div>
  </div>

  <div class="card" id="fwscores">
    <h2>${bi("نتائج الامتثال حسب الإطار", "Compliance by Framework")}</h2>
    <table>
      <thead><tr><th>${bi("الإطار", "Framework")}</th><th>${bi("النتيجة", "Score")}</th><th>${bi("التقدم", "Progress")}</th><th>${bi("التفاصيل", "Details")}</th><th>${bi("الحالة", "Status")}</th></tr></thead>
      <tbody>${fws.map(f => `<tr><td><strong>${esc(f.n)}</strong></td><td>${f.s}%</td><td style="min-width:100px"><div class="bar-bg"><div class="bar-fg ${f.s >= 75 ? 'bg' : f.s >= 60 ? 'by' : 'br'}" style="width:${f.s}%"></div></div></td><td style="color:${f.t.includes('↑') ? '#16a34a' : '#f59e0b'};font-size:12px">${esc(f.t)}</td><td><span class="badge ${f.s >= 75 ? 'b-grn' : f.s >= 60 ? 'b-ylw' : 'b-red'}">${f.s >= 75 ? bi('على المسار', 'On Track') : f.s >= 60 ? bi('قيد التنفيذ', 'In Progress') : bi('معرّض للخطر', 'At Risk')}</span></td></tr>`).join("")}</tbody>
    </table>
  </div>

  <div class="card" id="riskheat">
    <h2>${bi("خريطة المخاطر", "Risk Heat Map")}</h2>
    <table>
      <thead><tr><th>${bi("الفئة", "Category")}</th><th>${bi("العدد", "Count")}</th><th>${bi("حرج", "Critical")}</th><th>${bi("عالي", "High")}</th><th>${bi("متوسط", "Medium")}</th><th>${bi("منخفض", "Low")}</th></tr></thead>
      <tbody>
        ${riskCats.map(r => `<tr><td><strong>${esc(r.cat)}</strong></td><td>${r.count}</td><td>${r.critical > 0 ? `<span class="badge b-red">${r.critical}</span>` : '0'}</td><td>${r.high > 0 ? `<span class="badge b-org">${r.high}</span>` : '0'}</td><td>${r.medium}</td><td>${r.low}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="card" id="boardrecs">
    <h2>${bi("توصيات", "Recommendations")}</h2>
    ${fws.filter(f => f.s < 70).length > 0 ? `
    <table>
      <thead><tr><th>#</th><th>${bi("التوصية", "Recommendation")}</th><th>${bi("الأولوية", "Priority")}</th></tr></thead>
      <tbody>
        ${fws.filter(f => f.s < 70).map((f, i) => `<tr><td>${i + 1}</td><td>${bi(`تحسين امتثال ${esc(f.n)} — النتيجة الحالية ${f.s}%`, `Improve ${esc(f.n)} compliance — currently at ${f.s}%`)}</td><td><span class="badge ${f.s < 50 ? 'b-red' : 'b-org'}">${f.s < 50 ? bi('حرج', 'Critical') : bi('عالي', 'High')}</span></td></tr>`).join("")}
      </tbody>
    </table>` : `<p style="font-size:13px;color:#16a34a">${bi("جميع الأطر فوق 70% — أداء ممتاز!", "All frameworks above 70% — excellent performance!")}</p>`}
  </div>
</div>`;

  const chartScript = `<script>
document.addEventListener('DOMContentLoaded',function(){
  new Chart(document.getElementById('grcBar'),{type:'bar',data:{labels:${JSON.stringify(fws.map(f => f.n))},datasets:[{label:'Score %',data:${JSON.stringify(fws.map(f => f.s))},backgroundColor:${JSON.stringify(fws.map(f => f.s >= 75 ? '#16a34a' : f.s >= 60 ? '#f59e0b' : '#dc2626'))},borderRadius:6}]},options:{responsive:true,scales:{y:{min:0,max:100}},plugins:{legend:{display:false}}}});
  new Chart(document.getElementById('grcDo'),{type:'doughnut',data:{labels:['Critical','High','Medium','Low'],datasets:[{data:[${totalRiskCritical},${totalRiskHigh},${totalRiskMedium},${totalRiskLow}],backgroundColor:['#dc2626','#f59e0b','#fbbf24','#22c55e']}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
});
<\/script>`;

  return shell(m.title, m.titleAr, body, chartScript, isLive);
}

/** Demo GRC framework data. */
export function getDemoGrcFws() {
  return [
    { n: "NCA ECC", s: 78, t: "↑ +5%" },
    { n: "SAMA CSF", s: 82, t: "↑ +3%" },
    { n: "PDPL", s: 55, t: "→ 0%" },
    { n: "MOH HIS", s: 68, t: "↑ +8%" },
    { n: "CBAHI", s: 72, t: "↑ +2%" },
    { n: "ISO 27001", s: 85, t: "↑ +1%" },
  ];
}

/** Demo GRC risk category data. */
export function getDemoGrcRiskCats() {
  return [
    { cat: "Cybersecurity", count: 8, critical: 2, high: 3, medium: 2, low: 1 },
    { cat: "Data Privacy", count: 5, critical: 1, high: 2, medium: 1, low: 1 },
    { cat: "Operational", count: 4, critical: 0, high: 2, medium: 1, low: 1 },
    { cat: "Regulatory", count: 3, critical: 1, high: 1, medium: 1, low: 0 },
    { cat: "Third-Party", count: 3, critical: 0, high: 1, medium: 1, low: 1 },
  ];
}
