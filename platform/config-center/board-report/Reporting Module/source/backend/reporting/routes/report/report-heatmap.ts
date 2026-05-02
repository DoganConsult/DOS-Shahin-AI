// ============================================
// Shahin-Ai — Regulator Compliance Heatmap Report
// ============================================

import { shell, bi, esc, fetchFrameworks, fetchControls, fetchTenantName } from './report-shared';

export async function genHeatmap(m: { title: string; titleAr: string }, tenantId: string | null): Promise<string> {
  let isLive = false;
  let orgEn = "Saudi Tech Solutions Ltd.";
  let orgAr = "حلول التقنية السعودية م.م";

  // Domain categories for heatmap columns
  const domsEn = ["Governance","Risk Mgmt","Access Ctrl","Data Protection","Incident Mgmt","Monitoring","BCP"];
  const domsAr = ["الحوكمة","إدارة المخاطر","التحكم بالوصول","حماية البيانات","إدارة الحوادث","المراقبة","استمرارية الأعمال"];

  interface HeatmapRow { n: string; s: number[] }
  let regs: HeatmapRow[];

  if (tenantId) {
    try {
      const tenantName = await fetchTenantName(tenantId);
      orgEn = tenantName; orgAr = tenantName;

      const frameworks = await fetchFrameworks(tenantId);
      const controls = await fetchControls(tenantId);

      if (frameworks.length > 0) {
        isLive = true;
        // Build a heatmap row per framework, with scores distributed across 7 governance domains
        // Group controls by keyword matching to governance domains
        const domainKeywords = [
          ["governance","policy","strategy"],
          ["risk","threat"],
          ["access","auth","identity"],
          ["data","privacy","encryption","classification"],
          ["incident","response","breach"],
          ["monitor","log","audit","siem"],
          ["continuity","recovery","backup","resilience"],
        ];
        regs = frameworks.map(fw => {
          const fwControls = controls.filter(c => c.frameworkCode === fw.code);
          const scores = domainKeywords.map(keywords => {
            const matched = fwControls.filter(c => keywords.some(k => c.title.toLowerCase().includes(k)));
            if (matched.length === 0) return fw.score;
            return Math.round(matched.reduce((sum, c) => sum + c.effectiveness, 0) / matched.length);
          });
          return { n: fw.name.substring(0, 20), s: scores };
        });
      } else {
        regs = getDemoHeatmapRegs();
      }
    } catch {
      regs = getDemoHeatmapRegs();
    }
  } else {
    regs = getDemoHeatmapRegs();
  }

  function cc(s: number){return s>=80?'#16a34a':s>=60?'#f59e0b':'#dc2626'}

  const nav = `<div class="nav-bar">
    <a class="nav-pill active" href="#heatmap">${bi("الخريطة الحرارية", "Heatmap")}</a>
    <a class="nav-pill" href="#hcharts">${bi("الرسوم البيانية", "Charts")}</a>
    <a class="nav-pill" href="#findings">${bi("النتائج", "Findings")}</a>
  </div>`;

  const body = `${nav}<div class="container">
  <div class="rpt-header">
    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
      <div><h1>${bi(m.titleAr, m.title)}</h1><div class="sub">${bi(esc(orgAr), esc(orgEn))}</div></div>
      <span class="sample-badge">${bi(isLive ? "بيانات حية" : "تقرير تجريبي", isLive ? "LIVE DATA" : "SAMPLE")}</span>
    </div>
    <div class="meta"><span>${regs.length} ${bi("أطر تنظيمية", "Frameworks")} x 7 ${bi("مجالات", "Domains")}</span></div>
  </div>

  <div class="card" id="heatmap">
    <h2>${bi("خريطة الامتثال الحرارية", "Compliance Heatmap")}</h2>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>${bi("الإطار", "Framework")}</th>${domsEn.map((d, i) => `<th style="text-align:center">${bi(domsAr[i], d)}</th>`).join("")}<th style="text-align:center">${bi("المعدل", "Avg")}</th></tr></thead>
      <tbody>${regs.map(r => {
        const avg = Math.round(r.s.reduce((a, b) => a + b, 0) / r.s.length);
        return `<tr><td><strong>${esc(r.n)}</strong></td>${r.s.map(s => `<td style="text-align:center"><span style="display:inline-block;padding:4px 10px;border-radius:6px;color:#fff;font-weight:700;font-size:12px;background:${cc(s)}">${s}%</span></td>`).join("")}<td style="text-align:center"><span class="score ${avg >= 75 ? 's-hi' : avg >= 60 ? 's-md' : 's-lo'}">${avg}%</span></td></tr>`;
      }).join("")}</tbody>
    </table>
    </div>
  </div>

  <div class="card" id="hcharts">
    <h2>${bi("تحليل بصري", "Visual Analysis")}</h2>
    <div class="chart-row">
      <div class="chart-box"><h3>${bi("معدل كل إطار — أعمدة", "Framework Averages — Bar")}</h3><canvas id="regBar"></canvas></div>
      <div class="chart-box"><h3>${bi("مقارنة المجالات — رادار", "Domain Comparison — Radar")}</h3><canvas id="regRadar"></canvas></div>
    </div>
  </div>

  <div class="card" id="findings">
    <h2>${bi("النتائج الرئيسية", "Key Findings")}</h2>
    <ul style="padding:0 20px;font-size:13px;line-height:2.2">
    ${(() => {
      const avgs = regs.map(r => ({ n: r.n, avg: Math.round(r.s.reduce((a, b) => a + b, 0) / r.s.length) }));
      const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
      const strongest = sorted[0];
      const weakest = sorted[sorted.length - 1];
      return `
      <li>${bi(`<strong>الأقوى:</strong> ${esc(strongest.n)} بمعدل ${strongest.avg}%`, `<strong>Strongest:</strong> ${esc(strongest.n)} at ${strongest.avg}% avg`)}</li>
      <li>${bi(`<strong>الأضعف:</strong> ${esc(weakest.n)} بمعدل ${weakest.avg}%`, `<strong>Weakest:</strong> ${esc(weakest.n)} at ${weakest.avg}% avg`)}</li>`;
    })()}
    </ul>
  </div>
</div>`;

  const avgs = regs.map(r => Math.round(r.s.reduce((a, b) => a + b, 0) / r.s.length));
  const topRegs = regs.slice(0, 3);
  const chartScript = `<script>
document.addEventListener('DOMContentLoaded',function(){
  new Chart(document.getElementById('regBar'),{type:'bar',data:{labels:${JSON.stringify(regs.map(r => r.n))},datasets:[{label:'Avg %',data:${JSON.stringify(avgs)},backgroundColor:${JSON.stringify(avgs.map(a => a >= 75 ? '#16a34a' : a >= 60 ? '#f59e0b' : '#dc2626'))},borderRadius:6}]},options:{responsive:true,scales:{y:{min:0,max:100}},plugins:{legend:{display:false}}}});
  var radarColors=['#1e40af','#0d9488','#7c3aed','#dc2626','#f59e0b','#16a34a','#6366f1','#ec4899'];
  new Chart(document.getElementById('regRadar'),{type:'radar',data:{labels:${JSON.stringify(domsEn)},datasets:${JSON.stringify(topRegs.map((r, _i) => ({ label: r.n, data: r.s })))}.map(function(ds,i){ds.borderColor=radarColors[i];ds.backgroundColor=radarColors[i]+'18';return ds})},options:{responsive:true,scales:{r:{min:0,max:100}}}});
});
<\/script>`;

  return shell(m.title, m.titleAr, body, chartScript, isLive);
}

/** Demo heatmap data used when no tenant context is available. */
export function getDemoHeatmapRegs() {
  return [
    { n: "NCA", s: [85,78,72,65,58,80,70] },
    { n: "SAMA", s: [90,82,88,75,70,85,78] },
    { n: "SDAIA/PDPL", s: [60,55,70,45,50,65,58] },
    { n: "CMA", s: [75,70,68,72,65,78,60] },
    { n: "CST", s: [80,75,72,68,70,82,74] },
    { n: "ZATCA", s: [88,85,90,80,78,92,86] },
    { n: "MOH", s: [45,50,40,55,48,52,42] },
    { n: "SFDA", s: [55,60,50,58,52,62,48] },
  ];
}
