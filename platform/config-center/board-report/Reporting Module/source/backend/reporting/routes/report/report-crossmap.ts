// ============================================
// Shahin-Ai — Cross-Framework Mapping Report
// ============================================

import { shell, bi, esc, fetchFrameworks, fetchControls, fetchTenantName } from './report-shared';

export async function genCrossMap(m: { title: string; titleAr: string }, tenantId: string | null): Promise<string> {
  let isLive = false;
  let orgEn = "Riyadh National Bank";
  let orgAr = "بنك الرياض الوطني";

  interface MapRow { en: string; ar: string; code: string; coverage: Record<string, boolean> }
  let maps: MapRow[];
  let fws: string[];

  if (tenantId) {
    try {
      const tenantName = await fetchTenantName(tenantId);
      orgEn = tenantName; orgAr = tenantName;

      const frameworks = await fetchFrameworks(tenantId);
      const controls = await fetchControls(tenantId);

      if (frameworks.length >= 2) {
        isLive = true;
        fws = frameworks.map(fw => fw.code || fw.name.substring(0, 12));

        // Build cross-mapping: group controls by title similarity, check which frameworks they appear in
        const controlMap = new Map<string, Set<string>>();
        for (const c of controls) {
          // Normalize title for grouping
          const key = c.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().substring(0, 50);
          if (!controlMap.has(key)) controlMap.set(key, new Set());
          controlMap.get(key)!.add(c.frameworkCode);
        }

        maps = [];
        let idx = 0;
        for (const [key, frameworkSet] of controlMap.entries()) {
          if (idx >= 15) break;
          const matchingControl = controls.find(c => c.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().substring(0, 50) === key);
          const title = matchingControl?.title || key;
          const coverage: Record<string, boolean> = {};
          for (const fw of fws) { coverage[fw] = frameworkSet.has(fw); }
          maps.push({ en: title, ar: title, code: matchingControl?.controlId?.substring(0, 8) || `C-${idx + 1}`, coverage });
          idx++;
        }
      } else {
        const demo = getDemoCrossMapData();
        maps = demo.maps; fws = demo.fws;
      }
    } catch {
      const demo = getDemoCrossMapData();
      maps = demo.maps; fws = demo.fws;
    }
  } else {
    const demo = getDemoCrossMapData();
    maps = demo.maps; fws = demo.fws;
  }

  const totalCov = maps.reduce((a, m) => a + Object.values(m.coverage).filter(Boolean).length, 0);
  const effMultiplier = fws.length > 0 ? `${fws.length}x` : '1x';
  const effortSaved = fws.length > 1 ? Math.round((1 - 1 / fws.length) * 100) : 0;

  const nav = `<div class="nav-bar">
    <a class="nav-pill active" href="#eff">${bi("الكفاءة", "Efficiency")}</a>
    <a class="nav-pill" href="#matrix">${bi("المصفوفة", "Matrix")}</a>
    <a class="nav-pill" href="#cmchart">${bi("الرسوم", "Charts")}</a>
  </div>`;

  const body = `${nav}<div class="container">
  <div class="rpt-header">
    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
      <div><h1>${bi(m.titleAr, m.title)}</h1><div class="sub">${bi(esc(orgAr), esc(orgEn))}</div></div>
      <span class="sample-badge">${bi(isLive ? "بيانات حية" : "تقرير تجريبي", isLive ? "LIVE DATA" : "SAMPLE")}</span>
    </div>
  </div>

  <div class="card" id="eff">
    <h2>${bi("ملخص الكفاءة", "Efficiency Summary")}</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="n">${maps.length}</div><div class="l">${bi("ضوابط فريدة", "Unique Controls")}</div></div>
      <div class="kpi"><div class="n">${totalCov}</div><div class="l">${bi("متطلبات مستوفاة", "Requirements Met")}</div></div>
      <div class="kpi"><div class="n">${effMultiplier}</div><div class="l">${bi("مضاعف الكفاءة", "Efficiency Multiplier")}</div></div>
      <div class="kpi"><div class="n" style="color:#16a34a">${effortSaved}%</div><div class="l">${bi("توفير الجهد", "Effort Saved")}</div></div>
    </div>
  </div>

  <div class="card" id="matrix">
    <h2>${bi("مصفوفة التغطية", "Coverage Matrix")}</h2>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>#</th><th>${bi("الضابط", "Control")}</th>${fws.map(f => `<th style="text-align:center">${esc(f)}</th>`).join("")}<th style="text-align:center">${bi("التغطية", "Coverage")}</th></tr></thead>
      <tbody>${maps.map((c, i) => {
        const cov = Object.values(c.coverage).filter(Boolean).length;
        return `<tr><td>${i + 1}</td><td><strong>${esc(c.code)}</strong> — ${bi(esc(c.ar), esc(c.en))}</td>${fws.map(f => `<td style="text-align:center;color:${c.coverage[f] ? '#16a34a' : '#cbd5e1'};font-size:16px">${c.coverage[f] ? '&#10003;' : '&mdash;'}</td>`).join("")}<td style="text-align:center"><span class="badge ${cov >= fws.length - 1 ? 'b-grn' : cov >= Math.ceil(fws.length / 2) ? 'b-ylw' : 'b-red'}">${cov}/${fws.length}</span></td></tr>`;
      }).join("")}</tbody>
    </table>
    </div>
  </div>

  <div class="card" id="cmchart">
    <h2>${bi("تحليل بصري", "Visual Analysis")}</h2>
    <div class="chart-row">
      <div class="chart-box"><h3>${bi("تغطية كل إطار — أعمدة", "Framework Coverage — Bar")}</h3><canvas id="fwBar"></canvas></div>
      <div class="chart-box"><h3>${bi("توزيع التغطية — دائري", "Coverage Distribution — Doughnut")}</h3><canvas id="covDo"></canvas></div>
    </div>
  </div>
</div>`;

  const fwTotals = fws.map(f => maps.reduce((a, c) => a + (c.coverage[f] ? 1 : 0), 0));
  const covDist = [0, 0, 0];
  maps.forEach(c => {
    const t = Object.values(c.coverage).filter(Boolean).length;
    if (t >= fws.length - 1) covDist[0]++;
    else if (t >= Math.ceil(fws.length / 2)) covDist[1]++;
    else covDist[2]++;
  });
  const barColors = ['#1e40af','#0d9488','#7c3aed','#1d4ed8','#0f766e','#0891b2','#dc2626','#f59e0b','#16a34a'];
  const chartScript = `<script>
document.addEventListener('DOMContentLoaded',function(){
  new Chart(document.getElementById('fwBar'),{type:'bar',data:{labels:${JSON.stringify(fws)},datasets:[{label:'Controls',data:${JSON.stringify(fwTotals)},backgroundColor:${JSON.stringify(fws.map((_, i) => barColors[i % barColors.length]))},borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  new Chart(document.getElementById('covDo'),{type:'doughnut',data:{labels:['High Coverage','Medium Coverage','Low Coverage'],datasets:[{data:${JSON.stringify(covDist)},backgroundColor:['#16a34a','#f59e0b','#dc2626']}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
});
<\/script>`;

  return shell(m.title, m.titleAr, body, chartScript, isLive);
}

/** Demo cross-mapping data. */
export function getDemoCrossMapData() {
  const fws = ["NCA ECC","SAMA CSF","PDPL","ISO 27001","NIST CSF","PCI-DSS"];
  const demoRows = [
    { en: "Access Control Policy", ar: "سياسة التحكم بالوصول", code: "AC-01", vals: [1,1,1,1,1,1] },
    { en: "Data Classification", ar: "تصنيف البيانات", code: "DC-01", vals: [1,1,1,1,1,0] },
    { en: "Incident Response Plan", ar: "خطة الاستجابة للحوادث", code: "IR-01", vals: [1,1,0,1,1,1] },
    { en: "Encryption at Rest", ar: "التشفير أثناء التخزين", code: "EN-01", vals: [1,1,1,1,1,1] },
    { en: "Vulnerability Management", ar: "إدارة الثغرات", code: "VM-01", vals: [1,1,0,1,1,1] },
    { en: "Security Awareness", ar: "التوعية الأمنية", code: "SA-01", vals: [1,1,1,1,1,1] },
    { en: "Change Management", ar: "إدارة التغيير", code: "CM-01", vals: [1,1,0,1,1,1] },
    { en: "Backup & Recovery", ar: "النسخ الاحتياطي والاسترداد", code: "BR-01", vals: [1,1,0,1,1,0] },
    { en: "Network Segmentation", ar: "تجزئة الشبكة", code: "NS-01", vals: [1,1,0,1,1,1] },
    { en: "Privacy Impact Assessment", ar: "تقييم أثر الخصوصية", code: "PA-01", vals: [0,0,1,1,1,0] },
  ];
  const maps = demoRows.map(r => {
    const coverage: Record<string, boolean> = {};
    fws.forEach((f, i) => { coverage[f] = r.vals[i] === 1; });
    return { en: r.en, ar: r.ar, code: r.code, coverage };
  });
  return { maps, fws };
}
