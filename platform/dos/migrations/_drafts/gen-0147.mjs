#!/usr/bin/env node
// Generates migration 0147 — enrolls 8 remaining DNA modules with the same
// W8+W9 depth as dauth: routes + theme + kpis + actions + data_resources +
// i18n + page_headers + grid_columns + ai_tips + palette + search_scopes +
// widgets (incl. signature) + signature_widget pinned per route.

const MODULES = [
  // code, base, slug, [e1,e2,e3], display, ar
  // perm/permWrite must be valid in platform_dauth.permissions; we seed any missing rows below.
  { code:'ai-platform',       base:'/admin/ai',            slug:'ai',  perm:'platform.ai.read', permWrite:'platform.ai.admin', ents:['gateway','engine','governance'],
    en:{m:'AI-OS Platform',           o:'Operate the AI orchestrator, gateway and governance plane',
        e:['Gateway','Engine','Governance'], ear:['Routing & rate limits','Inference & memory','Policies & guardrails']}, 
    ar:{m:'منصة الذكاء الاصطناعي',     o:'تشغيل بوابة وتنسيق وحوكمة الذكاء الاصطناعي',
        e:['البوابة','المحرك','الحوكمة'], ear:['التوجيه والحدود','الاستدلال والذاكرة','السياسات والضوابط']} },
  { code:'config-center',     base:'/admin/config-center', slug:'cfg', perm:'platform.config_center.read', permWrite:'platform.config_center.admin',
    ents:['settings','flags','tokens'],
    en:{m:'Config Center',            o:'Tenant settings, feature flags and runtime tokens',
        e:['Settings','Feature flags','Tokens'], ear:['Workspace settings','Toggleable behavior','API & secret tokens']},
    ar:{m:'مركز التهيئة',              o:'إعدادات المستأجر والميزات والرموز',
        e:['الإعدادات','الميزات','الرموز'], ear:['إعدادات مساحة العمل','السلوك القابل للتبديل','رموز الواجهات والأسرار']} },
  { code:'dnoc',              base:'/admin/dnoc',          slug:'dnoc',perm:'platform.dnoc.read', permWrite:'platform.dnoc.admin',
    ents:['services','metrics','alerts'],
    en:{m:'DNOC — Network Ops',       o:'Service health, telemetry and alerts',
        e:['Services','Metrics','Alerts'], ear:['Microservice fleet','Live telemetry','Active alerts']},
    ar:{m:'مركز عمليات الشبكة',         o:'صحة الخدمات والقياسات والتنبيهات',
        e:['الخدمات','المقاييس','التنبيهات'], ear:['أسطول الخدمات','القياسات المباشرة','التنبيهات النشطة']} },
  { code:'dos-platform',      base:'/admin/dos',           slug:'dos', perm:'platform.dos.read', permWrite:'platform.dos.admin',
    ents:['schemas','registries','events'],
    en:{m:'DOS Platform Plane',       o:'Schemas, registries and event bus',
        e:['Schemas','Registries','Events'], ear:['DB schemas','Module/service registry','Event topics']},
    ar:{m:'مستوى منصة DOS',             o:'المخططات والسجلات وناقل الأحداث',
        e:['المخططات','السجلات','الأحداث'], ear:['مخططات قواعد البيانات','سجل الوحدات والخدمات','مواضيع الأحداث']} },
  { code:'dsoc',              base:'/admin/dsoc',          slug:'dsoc',perm:'platform.dsoc.read', permWrite:'platform.dsoc.admin',
    ents:['incidents','detections','policies'],
    en:{m:'DSOC — Security Ops',      o:'Incidents, detections and security policies',
        e:['Incidents','Detections','Policies'], ear:['Open incidents','Detection rules','Security policies']},
    ar:{m:'مركز عمليات الأمن',          o:'الحوادث والاكتشافات وسياسات الأمن',
        e:['الحوادث','الاكتشافات','السياسات'], ear:['الحوادث المفتوحة','قواعد الاكتشاف','سياسات الأمن']} },
  { code:'foundation-admin',  base:'/admin/foundation',    slug:'fnd', perm:'platform.foundation.read', permWrite:'platform.foundation.admin',
    ents:['organizations','persons','lifecycle'],
    en:{m:'Foundation (DNA)',         o:'Org, identity, SoD and lifecycle',
        e:['Organizations','Persons','Lifecycle'], ear:['Org tree','People directory','Joiner/mover/leaver']},
    ar:{m:'الأساس (DNA)',               o:'المنظمة والهوية وفصل المهام ودورة الحياة',
        e:['المنظمات','الأفراد','دورة الحياة'], ear:['شجرة المنظمة','دليل الأفراد','الانضمام والنقل والمغادرة']} },
  { code:'multi-tenant-mgmt', base:'/admin/multi-tenant',  slug:'mtm', perm:'platform.multitenant.read', permWrite:'platform.multitenant.admin',
    ents:['tenants','provisioning','quotas'],
    en:{m:'Multi-Tenant Ops',         o:'Tenant fleet, provisioning and quotas',
        e:['Tenants','Provisioning','Quotas'], ear:['All tenants','Provisioning jobs','Resource quotas']},
    ar:{m:'عمليات تعدد المستأجرين',     o:'أسطول المستأجرين والتجهيز والحصص',
        e:['المستأجرون','التجهيز','الحصص'], ear:['جميع المستأجرين','مهام التجهيز','حصص الموارد']} },
  { code:'tenant-management', base:'/admin/tenants',       slug:'tm',  perm:'platform.tenant.read', permWrite:'platform.tenant.admin',
    ents:['directory','members','profile'],
    en:{m:'Tenant Management',        o:'Tenant directory, members and profile',
        e:['Directory','Members','Profile'], ear:['Tenant directory','Tenant members','Tenant profile']},
    ar:{m:'إدارة المستأجر',             o:'دليل المستأجر والأعضاء والملف',
        e:['الدليل','الأعضاء','الملف'], ear:['دليل المستأجر','أعضاء المستأجر','ملف المستأجر']} },
];

const out = [];
out.push(`-- 0147 — Wave W10: enroll remaining 8 DNA modules end-to-end (W8+W9 depth).
-- Auto-generated by platform/dos/migrations/_drafts/gen-0147.mjs
BEGIN;`);

// ── 0. Permission seed — every perm referenced by ROUTES/ACTIONS must
//      exist in platform_dauth.permissions (FK constraint).
out.push(`\n-- ── 0. Seed permissions referenced by routes/actions ──`);
const permSeeds = [];
for (const m of MODULES) {
  const codes = [
    [m.perm,      'read'],
    [m.permWrite, 'admin'],
  ];
  for (const [code, action] of codes) {
    const id = 'perm_' + code.replace(/\./g, '_');
    const resource = code.split('.')[1] || 'system';
    permSeeds.push(`  ('${id}','${code}','platform','${resource}','${action}','${code}','${code}')`);
  }
}
out.push(`INSERT INTO platform_dauth.permissions
  (permission_id, permission_code, module_code, resource_type, action_type, label_en, label_ar)
VALUES
${permSeeds.join(',\n')}
ON CONFLICT (permission_code) DO NOTHING;`);

const ROUTE_KINDS = [
  { suffix:'',           pageType:'overview', layout:'dashboard', kpiScope:'module-overview', sigKind:'command-center', titleSuffix:'.overview', subtitleKey:'.overview.sub' },
  { suffix:'/__E1__',    pageType:'list',     layout:'full-page', kpiScope:'none',            sigKind:'smart-grid',     titleSuffix:'.e1',       subtitleKey:'.e1.sub' },
  { suffix:'/__E2__',    pageType:'list',     layout:'full-page', kpiScope:'none',            sigKind:'smart-grid',     titleSuffix:'.e2',       subtitleKey:'.e2.sub' },
  { suffix:'/__E3__',    pageType:'list',     layout:'full-page', kpiScope:'none',            sigKind:'smart-grid',     titleSuffix:'.e3',       subtitleKey:'.e3.sub' },
  { suffix:'/audit',     pageType:'audit',    layout:'report',    kpiScope:'none',            sigKind:'audit-timeline', titleSuffix:'.audit',    subtitleKey:'.audit.sub' },
];

const COMP_REG = new Set();

for (const m of MODULES) {
  const slug = m.slug;
  const k = (s) => `${slug}.${s}`;
  out.push(`\n-- ───────────────── ${m.code} ─────────────────`);

  // Component registry rows
  const sigKeys = ROUTE_KINDS.map(rk => `${rk.sigKind}.${slug}`);
  for (const sk of sigKeys) {
    if (!COMP_REG.has(sk)) {
      COMP_REG.add(sk);
      const arch = sk.startsWith('command-center') ? 'overview'
                  : sk.startsWith('audit-timeline') ? 'audit' : 'list';
      const kind = sk.split('.')[0];
      out.push(`INSERT INTO dos.dynamic_ui_component_registry (component_key, schema_version, metadata)
VALUES ('${sk}', '1', '{"archetype":"${arch}","kind":"${kind}"}'::jsonb)
ON CONFLICT (component_key) DO UPDATE SET metadata = EXCLUDED.metadata;`);
    }
  }

  // 1. ROUTES
  out.push(`INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled,
   nba_enabled, signature_widget)
SELECT NULL, '${m.code}', x.path, x.comp, x.perm, x.sort, 'active',
       x.pt, x.lay, x.kpi, x.intent, 'tenant', FALSE,
       x.tk, x.sk, x.dr, 'table', TRUE, FALSE, FALSE, x.sw
  FROM (VALUES`);
  const routeVals = ROUTE_KINDS.map((rk, i) => {
    const ent = i===1 ? m.ents[0] : i===2 ? m.ents[1] : i===3 ? m.ents[2] : null;
    const path = ent ? `${m.base}/${ent}` : i===4 ? `${m.base}/audit` : m.base;
    const comp = `platform.${m.code}.${i===0?'overview':i===4?'audit':ent}`;
    const intent = i===0?'monitor': i===4?'investigate':'manage';
    const tk = `${slug}${rk.titleSuffix}.title`;
    const sk = `${slug}${rk.titleSuffix}.subtitle`;
    const drKey = i===0 ? `${slug}.resource.overview` : i===4 ? `${slug}.resource.audit` : `${slug}.resource.${ent}`;
    return `    ('${path}','${comp}','${m.perm}',${(i+1)*100},'${rk.pageType}','${rk.layout}','${rk.kpiScope}','${intent}','${tk}','${sk}','${drKey}','${rk.sigKind}.${slug}')`;
  }).join(',\n');
  out.push(routeVals + `\n  ) AS x(path, comp, perm, sort, pt, lay, kpi, intent, tk, sk, dr, sw)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL AND r.module_code='${m.code}' AND r.path_pattern = x.path
 );
UPDATE dos.dynamic_ui_routes
   SET signature_widget = CASE
     WHEN path_pattern='${m.base}'                THEN 'command-center.${slug}'
     WHEN path_pattern='${m.base}/${m.ents[0]}'   THEN 'smart-grid.${slug}'
     WHEN path_pattern='${m.base}/${m.ents[1]}'   THEN 'smart-grid.${slug}'
     WHEN path_pattern='${m.base}/${m.ents[2]}'   THEN 'smart-grid.${slug}'
     WHEN path_pattern='${m.base}/audit'          THEN 'audit-timeline.${slug}'
   END,
   page_type = CASE
     WHEN path_pattern='${m.base}'                THEN 'overview'
     WHEN path_pattern='${m.base}/audit'          THEN 'audit'
     ELSE 'list' END,
   layout = CASE
     WHEN path_pattern='${m.base}'                THEN 'dashboard'
     WHEN path_pattern='${m.base}/audit'          THEN 'report'
     ELSE 'full-page' END,
   kpi_scope = CASE
     WHEN path_pattern='${m.base}'                THEN 'module-overview'
     ELSE 'none' END
 WHERE module_code='${m.code}' AND tenant_id IS NULL;`);

  // 2. THEME TOKENS
  out.push(`INSERT INTO dos.dynamic_ui_theme_tokens (tenant_id, module_code, token_key, token_value, scope, route, is_active)
SELECT NULL, '${m.code}', x.k, x.v, 'module', NULL, TRUE FROM (VALUES
  ('accent','brand'),('icon','enterprise'),('density','comfortable'),
  ('surface','neutral'),('table_density','comfortable'),('page_header_variant','standard')
) AS x(k,v)
ON CONFLICT (tenant_id, module_code, route, token_key) DO UPDATE SET token_value = EXCLUDED.token_value, is_active = TRUE;`);

  // 3. KPIs (5)
  out.push(`INSERT INTO dos.dynamic_ui_kpis
  (tenant_id, module_code, route, kpi_key, label_key, unit, data_resource, permission, scope, format, trend_enabled, sort_order, is_active)
SELECT NULL, '${m.code}', NULL, x.kk, x.lk, x.u, x.dr, '${m.perm}', 'module-overview', x.fmt, FALSE, x.s, TRUE
  FROM (VALUES
    ('${slug}.kpi.total',      '${slug}.kpi.total',     NULL,      '${slug}.resource.total',     'number',     100),
    ('${slug}.kpi.active',     '${slug}.kpi.active',    NULL,      '${slug}.resource.active',    'number',     200),
    ('${slug}.kpi.errors',     '${slug}.kpi.errors',    NULL,      '${slug}.resource.errors',    'number',     300),
    ('${slug}.kpi.coverage',   '${slug}.kpi.coverage',  'percent', '${slug}.resource.coverage',  'percentage', 400),
    ('${slug}.kpi.health',     '${slug}.kpi.health',    'percent', '${slug}.resource.health',    'percentage', 500)
  ) AS x(kk, lk, u, dr, fmt, s)
ON CONFLICT (tenant_id, module_code, route, kpi_key) DO UPDATE SET label_key=EXCLUDED.label_key, data_resource=EXCLUDED.data_resource, format=EXCLUDED.format, permission=EXCLUDED.permission;`);

  // 4. ACTIONS (6)
  const actionRoutes = [
    [m.base, 'open-' + m.ents[0], 'primary', `${slug}.action.open_${m.ents[0]}`, 'arrow-right', m.perm, 'low', `navigate.${m.ents[0]}`, 100],
    [`${m.base}/${m.ents[0]}`, 'create', 'primary', `${slug}.action.create_${m.ents[0]}`, 'add', m.permWrite, 'medium', `${slug}.${m.ents[0]}.create`, 100],
    [`${m.base}/${m.ents[0]}`, 'export', 'secondary', `${slug}.action.export_${m.ents[0]}`, 'download', m.perm, 'low', `${slug}.${m.ents[0]}.export`, 200],
    [`${m.base}/${m.ents[1]}`, 'create', 'primary', `${slug}.action.create_${m.ents[1]}`, 'add', m.permWrite, 'medium', `${slug}.${m.ents[1]}.create`, 100],
    [`${m.base}/${m.ents[2]}`, 'manage', 'primary', `${slug}.action.manage_${m.ents[2]}`, 'settings', m.permWrite, 'medium', `${slug}.${m.ents[2]}.manage`, 100],
    [`${m.base}/audit`, 'export-audit', 'primary', `${slug}.action.export_audit`, 'download', 'platform.audit.read', 'low', `${slug}.audit.export`, 100],
  ];
  out.push(`INSERT INTO dos.dynamic_ui_actions (tenant_id, module_code, route, action_id, position, label_key, icon, permission, risk_level, requires_approval, evidence_required, handler_key, sort_order, is_active)
SELECT NULL, '${m.code}', x.r, x.a, x.p, x.lk, x.i, x.pm, x.rk, FALSE, FALSE, x.h, x.s, TRUE FROM (VALUES`);
  out.push(actionRoutes.map(r => `    ('${r[0]}','${r[1]}','${r[2]}','${r[3]}','${r[4]}','${r[5]}','${r[6]}','${r[7]}',${r[8]})`).join(',\n'));
  out.push(`  ) AS x(r,a,p,lk,i,pm,rk,h,s)
ON CONFLICT (tenant_id, module_code, route, action_id) DO UPDATE SET label_key=EXCLUDED.label_key, icon=EXCLUDED.icon, permission=EXCLUDED.permission, handler_key=EXCLUDED.handler_key;`);

  // 5. DATA RESOURCES (10)
  const dr = (k, url, perm, ttl, pag, shape) => `    ('${slug}.resource.${k}','${url}','${perm}',${ttl},'${pag}','${slug}.shape.${shape}')`;
  out.push(`INSERT INTO dos.dynamic_ui_data_resources (tenant_id, module_code, resource_key, resource_type, url_or_query, permission, cache_ttl_sec, pagination, shape_ref, is_active)
SELECT NULL, '${m.code}', x.k, 'rest', x.u, x.pm, x.ttl, x.pag, x.sh, TRUE FROM (VALUES`);
  out.push([
    dr('overview',          `/api/${slug}/overview`,           m.perm, 30, 'none',   'overview'),
    dr('total',             `/api/${slug}/stats/total`,        m.perm, 60, 'none',   'count'),
    dr('active',            `/api/${slug}/stats/active`,       m.perm, 60, 'none',   'count'),
    dr('errors',            `/api/${slug}/stats/errors`,       m.perm, 60, 'none',   'count'),
    dr('coverage',          `/api/${slug}/stats/coverage`,     m.perm, 300,'none',   'percentage'),
    dr('health',            `/api/${slug}/stats/health`,       m.perm, 30, 'none',   'percentage'),
    dr(m.ents[0],           `/api/${slug}/${m.ents[0]}`,       m.perm, 15, 'cursor', m.ents[0]),
    dr(m.ents[1],           `/api/${slug}/${m.ents[1]}`,       m.perm, 15, 'cursor', m.ents[1]),
    dr(m.ents[2],           `/api/${slug}/${m.ents[2]}`,       m.perm, 15, 'cursor', m.ents[2]),
    dr('audit',             `/api/audit?module=${m.code}`,    'platform.audit.read', 15, 'cursor', 'audit'),
  ].join(',\n'));
  out.push(`  ) AS x(k,u,pm,ttl,pag,sh)
ON CONFLICT (tenant_id, module_code, resource_key) DO UPDATE SET url_or_query=EXCLUDED.url_or_query, permission=EXCLUDED.permission;`);

  // 6. PAGE HEADERS (5)
  out.push(`INSERT INTO dos.dynamic_ui_page_headers (tenant_id, module_code, route, variant, eyebrow_key, title_key, subtitle_key, badge_key, cta_action_id, show_breadcrumb, is_active) VALUES`);
  const phs = ROUTE_KINDS.map((rk, i) => {
    const ent = i===1?m.ents[0]:i===2?m.ents[1]:i===3?m.ents[2]:null;
    const path = ent ? `${m.base}/${ent}` : i===4 ? `${m.base}/audit` : m.base;
    const variant = i===0?'hero':i===4?'compact':'standard';
    const tk = `${slug}${rk.titleSuffix}.title`;
    const sk = `${slug}${rk.titleSuffix}.subtitle`;
    const eyebrow = i===0?`${slug}.eyebrow.platform`:i===4?`${slug}.eyebrow.forensic`:`${slug}.eyebrow.directory`;
    const badge = i===0?`${slug}.badge.live`:'NULL';
    const cta = i===0?`open-${m.ents[0]}`:i===1?'create':i===2?'create':i===3?'manage':'export-audit';
    const showCrumb = i===0?'FALSE':'TRUE';
    return `  ('','${m.code}','${path}','${variant}','${eyebrow}','${tk}','${sk}',${badge==='NULL'?'NULL':"'"+badge+"'"},'${cta}',${showCrumb},TRUE)`;
  }).join(',\n');
  out.push(phs);
  out.push(`ON CONFLICT (tenant_id, module_code, route) DO UPDATE SET variant=EXCLUDED.variant, title_key=EXCLUDED.title_key, subtitle_key=EXCLUDED.subtitle_key, eyebrow_key=EXCLUDED.eyebrow_key, badge_key=EXCLUDED.badge_key, cta_action_id=EXCLUDED.cta_action_id, is_active=TRUE;`);

  // 7. GRID COLUMNS (~15: 5 per entity list)
  out.push(`INSERT INTO dos.dynamic_ui_grid_columns (tenant_id, module_code, route, column_key, label_i18n_key, data_path, data_type, formatter_key, width_px, align, sortable, filterable, hidden_default, sort_order, is_active) VALUES`);
  const gridRows = [];
  for (let ei = 0; ei < 3; ei++) {
    const ent = m.ents[ei];
    const path = `${m.base}/${ent}`;
    gridRows.push(`  ('','${m.code}','${path}','code','${slug}.col.${ent}.code','code','string',NULL,200,'start','t','t','f',100,TRUE)`);
    gridRows.push(`  ('','${m.code}','${path}','name','${slug}.col.${ent}.name','displayName','string',NULL,260,'start','t','t','f',200,TRUE)`);
    gridRows.push(`  ('','${m.code}','${path}','status','${slug}.col.${ent}.status','status','enum','status-pill',120,'start','t','t','f',300,TRUE)`);
    gridRows.push(`  ('','${m.code}','${path}','owner','${slug}.col.${ent}.owner','owner','user',NULL,200,'start','t','t','f',400,TRUE)`);
    gridRows.push(`  ('','${m.code}','${path}','updated','${slug}.col.${ent}.updated','updatedAt','datetime','rel-time',170,'start','t','f','f',500,TRUE)`);
  }
  // audit grid
  const auditPath = `${m.base}/audit`;
  gridRows.push(`  ('','${m.code}','${auditPath}','time','${slug}.col.audit.time','timestamp','datetime','rel-time',170,'start','t','t','f',100,TRUE)`);
  gridRows.push(`  ('','${m.code}','${auditPath}','actor','${slug}.col.audit.actor','actorEmail','user',NULL,220,'start','t','t','f',200,TRUE)`);
  gridRows.push(`  ('','${m.code}','${auditPath}','action','${slug}.col.audit.action','action','string',NULL,200,'start','t','t','f',300,TRUE)`);
  gridRows.push(`  ('','${m.code}','${auditPath}','target','${slug}.col.audit.target','targetEntity','string',NULL,220,'start','t','f','f',400,TRUE)`);
  gridRows.push(`  ('','${m.code}','${auditPath}','result','${slug}.col.audit.result','result','enum','status-pill',120,'center','t','t','f',500,TRUE)`);
  out.push(gridRows.join(',\n'));
  out.push(`ON CONFLICT (tenant_id, module_code, route, column_key) DO UPDATE SET label_i18n_key=EXCLUDED.label_i18n_key, data_path=EXCLUDED.data_path, data_type=EXCLUDED.data_type, formatter_key=EXCLUDED.formatter_key, sort_order=EXCLUDED.sort_order, is_active=TRUE;`);

  // 8. AI TIPS (3)
  out.push(`INSERT INTO dos.dynamic_ui_ai_tips (tenant_id, module_code, route, tip_code, severity, title_key, body_key, cta_label_key, cta_route, cta_action_id, audience_role, source, sort_order, is_active) VALUES
  ('','${m.code}','${m.base}','${slug}.tip.welcome','info','${slug}.tip.welcome.title','${slug}.tip.welcome.body','${slug}.tip.welcome.cta','${m.base}/${m.ents[0]}',NULL,NULL,'rule',100,TRUE),
  ('','${m.code}','${m.base}/${m.ents[0]}','${slug}.tip.coverage','warning','${slug}.tip.coverage.title','${slug}.tip.coverage.body','${slug}.tip.coverage.cta','${m.base}/${m.ents[1]}',NULL,NULL,'rule',200,TRUE),
  ('','${m.code}','${m.base}/audit','${slug}.tip.audit','info','${slug}.tip.audit.title','${slug}.tip.audit.body','${slug}.tip.audit.cta',NULL,'export-audit',NULL,'rule',300,TRUE)
ON CONFLICT (tenant_id, module_code, route, tip_code) DO UPDATE SET severity=EXCLUDED.severity, title_key=EXCLUDED.title_key, body_key=EXCLUDED.body_key, is_active=TRUE;`);

  // 9. COMMAND PALETTE (7)
  out.push(`INSERT INTO dos.dynamic_ui_command_palette_actions (action_code, label_i18n_key, shortcut, module_code, route, intent_code, sort_order, registry_status) VALUES
  ('${slug}.cmd.open_overview','${slug}.cmd.open_overview',NULL,'${m.code}','${m.base}','navigate',100,'active'),
  ('${slug}.cmd.open_${m.ents[0]}','${slug}.cmd.open_${m.ents[0]}',NULL,'${m.code}','${m.base}/${m.ents[0]}','navigate',200,'active'),
  ('${slug}.cmd.open_${m.ents[1]}','${slug}.cmd.open_${m.ents[1]}',NULL,'${m.code}','${m.base}/${m.ents[1]}','navigate',300,'active'),
  ('${slug}.cmd.open_${m.ents[2]}','${slug}.cmd.open_${m.ents[2]}',NULL,'${m.code}','${m.base}/${m.ents[2]}','navigate',400,'active'),
  ('${slug}.cmd.open_audit','${slug}.cmd.open_audit',NULL,'${m.code}','${m.base}/audit','navigate',500,'active'),
  ('${slug}.cmd.create_${m.ents[0]}','${slug}.cmd.create_${m.ents[0]}',NULL,'${m.code}','${m.base}/${m.ents[0]}','create',600,'active'),
  ('${slug}.cmd.export_audit','${slug}.cmd.export_audit',NULL,'${m.code}','${m.base}/audit','export',700,'active')
ON CONFLICT (action_code) DO UPDATE SET label_i18n_key=EXCLUDED.label_i18n_key, route=EXCLUDED.route, registry_status='active';`);

  // 10. SEARCH SCOPES (4)
  out.push(`INSERT INTO dos.dynamic_ui_search_scopes (scope_code, label_i18n_key, module_code, resource_key, result_route, sort_order, registry_status) VALUES
  ('${slug}.scope.overview','${slug}.scope.overview','${m.code}','${slug}.resource.overview','${m.base}',100,'active'),
  ('${slug}.scope.${m.ents[0]}','${slug}.scope.${m.ents[0]}','${m.code}','${slug}.resource.${m.ents[0]}','${m.base}/${m.ents[0]}',200,'active'),
  ('${slug}.scope.${m.ents[1]}','${slug}.scope.${m.ents[1]}','${m.code}','${slug}.resource.${m.ents[1]}','${m.base}/${m.ents[1]}',300,'active'),
  ('${slug}.scope.${m.ents[2]}','${slug}.scope.${m.ents[2]}','${m.code}','${slug}.resource.${m.ents[2]}','${m.base}/${m.ents[2]}',400,'active')
ON CONFLICT (scope_code) DO UPDATE SET label_i18n_key=EXCLUDED.label_i18n_key, result_route=EXCLUDED.result_route, registry_status='active';`);

  // 11. WIDGETS (8: 5 signature + 3 supporting)
  out.push(`INSERT INTO dos.dynamic_ui_widgets (tenant_id, module_code, route, widget_key, zone, permission, sort_order, is_signature, is_active, config)
SELECT NULL, '${m.code}', x.r, x.w, x.z, x.pm, x.s, x.sig, TRUE, x.cfg::jsonb FROM (VALUES
  ('${m.base}',                  'command-center.${slug}', 'signature',    '${m.perm}', 100, TRUE,  '{"kpiScope":"module-overview"}'),
  ('${m.base}',                  'recommendation-card.${slug}','side',     '${m.perm}', 200, FALSE, '{"source":"ai-tips"}'),
  ('${m.base}/${m.ents[0]}',     'smart-grid.${slug}',     'signature',    '${m.perm}', 100, TRUE,  '{"resource":"${slug}.resource.${m.ents[0]}"}'),
  ('${m.base}/${m.ents[0]}',     'context-rail.${slug}.${m.ents[0]}','context-rail','${m.perm}',200,FALSE,'{}'),
  ('${m.base}/${m.ents[1]}',     'smart-grid.${slug}',     'signature',    '${m.perm}', 100, TRUE,  '{"resource":"${slug}.resource.${m.ents[1]}"}'),
  ('${m.base}/${m.ents[2]}',     'smart-grid.${slug}',     'signature',    '${m.perm}', 100, TRUE,  '{"resource":"${slug}.resource.${m.ents[2]}"}'),
  ('${m.base}/audit',            'audit-timeline.${slug}', 'signature',    'platform.audit.read', 100, TRUE,  '{"resource":"${slug}.resource.audit"}'),
  ('${m.base}/audit',            'context-rail.${slug}.audit','context-rail','platform.audit.read',200,FALSE,'{}')
) AS x(r,w,z,pm,s,sig,cfg)
ON CONFLICT (tenant_id, module_code, route, widget_key) DO UPDATE SET zone=EXCLUDED.zone, permission=EXCLUDED.permission, sort_order=EXCLUDED.sort_order, is_signature=EXCLUDED.is_signature, config=EXCLUDED.config, is_active=TRUE;`);

  // 12. i18n keys (EN+AR) — must cover every *_key referenced above.
  const i18n = [];
  // Page titles + subtitles
  i18n.push([`${slug}.overview.title`,        `${m.en.m}`,                                       `${m.ar.m}`]);
  i18n.push([`${slug}.overview.subtitle`,     `${m.en.o}`,                                       `${m.ar.o}`]);
  i18n.push([`${slug}.e1.title`,              `${m.en.e[0]}`,                                    `${m.ar.e[0]}`]);
  i18n.push([`${slug}.e1.subtitle`,           `${m.en.ear[0]}`,                                  `${m.ar.ear[0]}`]);
  i18n.push([`${slug}.e2.title`,              `${m.en.e[1]}`,                                    `${m.ar.e[1]}`]);
  i18n.push([`${slug}.e2.subtitle`,           `${m.en.ear[1]}`,                                  `${m.ar.ear[1]}`]);
  i18n.push([`${slug}.e3.title`,              `${m.en.e[2]}`,                                    `${m.ar.e[2]}`]);
  i18n.push([`${slug}.e3.subtitle`,           `${m.en.ear[2]}`,                                  `${m.ar.ear[2]}`]);
  i18n.push([`${slug}.audit.title`,           `Audit`,                                           `التدقيق`]);
  i18n.push([`${slug}.audit.subtitle`,        `Audit trail for ${m.en.m}`,                       `سجل تدقيق ${m.ar.m}`]);
  // KPIs
  i18n.push([`${slug}.kpi.total`,    `Total`,    `الإجمالي`]);
  i18n.push([`${slug}.kpi.active`,   `Active`,   `النشط`]);
  i18n.push([`${slug}.kpi.errors`,   `Errors`,   `الأخطاء`]);
  i18n.push([`${slug}.kpi.coverage`, `Coverage`, `التغطية`]);
  i18n.push([`${slug}.kpi.health`,   `Health`,   `الصحة`]);
  // Actions
  i18n.push([`${slug}.action.open_${m.ents[0]}`,  `Open ${m.en.e[0]}`,    `فتح ${m.ar.e[0]}`]);
  i18n.push([`${slug}.action.create_${m.ents[0]}`,`Create ${m.en.e[0]}`,  `إنشاء ${m.ar.e[0]}`]);
  i18n.push([`${slug}.action.export_${m.ents[0]}`,`Export ${m.en.e[0]}`,  `تصدير ${m.ar.e[0]}`]);
  i18n.push([`${slug}.action.create_${m.ents[1]}`,`Create ${m.en.e[1]}`,  `إنشاء ${m.ar.e[1]}`]);
  i18n.push([`${slug}.action.manage_${m.ents[2]}`,`Manage ${m.en.e[2]}`,  `إدارة ${m.ar.e[2]}`]);
  i18n.push([`${slug}.action.export_audit`,       `Export audit`,         `تصدير التدقيق`]);
  // Eyebrows + badge
  i18n.push([`${slug}.eyebrow.platform`,  `Platform DNA`,  `الحمض النووي للمنصة`]);
  i18n.push([`${slug}.eyebrow.directory`, `Directory`,     `الدليل`]);
  i18n.push([`${slug}.eyebrow.forensic`,  `Forensic`,      `الجنائي`]);
  i18n.push([`${slug}.badge.live`,        `Live`,          `مباشر`]);
  // Grid column labels
  for (let ei = 0; ei < 3; ei++) {
    const ent = m.ents[ei];
    i18n.push([`${slug}.col.${ent}.code`,    `Code`,    `الرمز`]);
    i18n.push([`${slug}.col.${ent}.name`,    `Name`,    `الاسم`]);
    i18n.push([`${slug}.col.${ent}.status`,  `Status`,  `الحالة`]);
    i18n.push([`${slug}.col.${ent}.owner`,   `Owner`,   `المالك`]);
    i18n.push([`${slug}.col.${ent}.updated`, `Updated`, `آخر تحديث`]);
  }
  i18n.push([`${slug}.col.audit.time`,   `Time`,   `الوقت`]);
  i18n.push([`${slug}.col.audit.actor`,  `Actor`,  `المنفذ`]);
  i18n.push([`${slug}.col.audit.action`, `Action`, `الإجراء`]);
  i18n.push([`${slug}.col.audit.target`, `Target`, `الهدف`]);
  i18n.push([`${slug}.col.audit.result`, `Result`, `النتيجة`]);
  // AI tips
  i18n.push([`${slug}.tip.welcome.title`,  `Welcome to ${m.en.m}`,                 `مرحباً بك في ${m.ar.m}`]);
  i18n.push([`${slug}.tip.welcome.body`,   `Start by opening ${m.en.e[0]}.`,       `ابدأ بفتح ${m.ar.e[0]}.`]);
  i18n.push([`${slug}.tip.welcome.cta`,    `Open ${m.en.e[0]}`,                    `فتح ${m.ar.e[0]}`]);
  i18n.push([`${slug}.tip.coverage.title`, `Improve coverage`,                     `تحسين التغطية`]);
  i18n.push([`${slug}.tip.coverage.body`,  `Review ${m.en.e[1]} to raise coverage.`,`راجع ${m.ar.e[1]} لرفع التغطية.`]);
  i18n.push([`${slug}.tip.coverage.cta`,   `Open ${m.en.e[1]}`,                    `فتح ${m.ar.e[1]}`]);
  i18n.push([`${slug}.tip.audit.title`,    `Export audit trail`,                   `تصدير سجل التدقيق`]);
  i18n.push([`${slug}.tip.audit.body`,     `Generate an audit export for review.`, `أنشئ تصديراً تدقيقياً للمراجعة.`]);
  i18n.push([`${slug}.tip.audit.cta`,      `Export`,                               `تصدير`]);
  // Palette
  i18n.push([`${slug}.cmd.open_overview`,         `Open ${m.en.m}`,           `فتح ${m.ar.m}`]);
  i18n.push([`${slug}.cmd.open_${m.ents[0]}`,     `Open ${m.en.e[0]}`,        `فتح ${m.ar.e[0]}`]);
  i18n.push([`${slug}.cmd.open_${m.ents[1]}`,     `Open ${m.en.e[1]}`,        `فتح ${m.ar.e[1]}`]);
  i18n.push([`${slug}.cmd.open_${m.ents[2]}`,     `Open ${m.en.e[2]}`,        `فتح ${m.ar.e[2]}`]);
  i18n.push([`${slug}.cmd.open_audit`,            `Open audit`,               `فتح التدقيق`]);
  i18n.push([`${slug}.cmd.create_${m.ents[0]}`,   `Create ${m.en.e[0]}`,      `إنشاء ${m.ar.e[0]}`]);
  i18n.push([`${slug}.cmd.export_audit`,          `Export audit`,             `تصدير التدقيق`]);
  // Search scopes
  i18n.push([`${slug}.scope.overview`,            `${m.en.m} overview`,       `نظرة عامة على ${m.ar.m}`]);
  i18n.push([`${slug}.scope.${m.ents[0]}`,        `${m.en.e[0]}`,             `${m.ar.e[0]}`]);
  i18n.push([`${slug}.scope.${m.ents[1]}`,        `${m.en.e[1]}`,             `${m.ar.e[1]}`]);
  i18n.push([`${slug}.scope.${m.ents[2]}`,        `${m.en.e[2]}`,             `${m.ar.e[2]}`]);

  out.push(`INSERT INTO dos.dynamic_ui_i18n_keys (module_code, key_path, en, ar) VALUES`);
  out.push(i18n.map(([k, en, ar]) => `  ('${m.code}','${k}',$EN$${en}$EN$,$AR$${ar}$AR$)`).join(',\n'));
  out.push(`ON CONFLICT (module_code, key_path) DO UPDATE SET en=EXCLUDED.en, ar=EXCLUDED.ar;`);
}

out.push(`\nCOMMIT;`);

console.log(out.join('\n'));
