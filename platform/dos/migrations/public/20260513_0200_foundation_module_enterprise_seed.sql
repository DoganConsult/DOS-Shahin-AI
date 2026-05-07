-- =====================================================================
-- 20260513_0200_foundation_module_enterprise_seed.sql
-- Wave 5 — Foundation enterprise seed (top-down, all 43 routes).
--
-- Goal: bring every Foundation page up to the same pattern as
-- /foundation/sod (rich pillars EN+AR, AI headline, status tags,
-- primary action, write-role policy applied via Wave 2 ui_route_role_policy).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- ─── Helper: per-route enterprise patch ───────────────────────────────
-- We use a CTE-driven UPDATE pattern: one row per route in the values()
-- list contains the full bilingual contract; the UPDATE merges it onto
-- the existing props JSONB and sets the typed masthead columns.
WITH foundation_seed (
  route,
  title_en, title_ar, subtitle_en, subtitle_ar, eyebrow_en, eyebrow_ar,
  ai_headline_en, ai_headline_ar,
  status_tags, primary_action,
  pillars_en, pillars_ar
) AS (
  VALUES

  -- ── Org-structure family (top-down) ────────────────────────────────
  ('/foundation/overview',
   'Foundation control center', 'مركز تحكم المؤسسة',
   'Live posture of identity, structure, governance, and access risk.',
   'الوضع الحي للهوية والهيكل والحوكمة ومخاطر الوصول.',
   'Foundation', 'المؤسسة',
   'AI advisor highlights drift risks across foundation domains.',
   'مستشار الذكاء الاصطناعي يبرز مخاطر الانحراف عبر مجالات المؤسسة.',
   '[{"label":"Live","severity":"info","labelAr":"حي"},{"label":"DB-driven","severity":"low","labelAr":"مستند للبيانات"}]'::jsonb,
   '{"label":"Run posture diagnostics","labelAr":"شغل تشخيص الوضع","action":{"kind":"navigate","path":"/foundation/diagnostics"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Drift across identity, structure, and access erodes audit-readiness.',
     'evidence','KPIs from foundation_* tables, role policy, recent audit trail.',
     'whatChanged','Live overview now reads counts and AI signals from DB.',
     'riskOrOpportunity','Catch risk before quarterly review surprises auditors.',
     'nextAction','Open diagnostics to triage the top three signals.'
   ),
   jsonb_build_object(
     'whyItMatters','الانحراف عبر الهوية والهيكل والوصول يضعف الجاهزية للتدقيق.',
     'evidence','مؤشرات من جداول foundation_* وسياسة الأدوار وسجل التدقيق الأخير.',
     'whatChanged','نظرة عامة حية تقرأ الأعداد وإشارات الذكاء الاصطناعي من قاعدة البيانات.',
     'riskOrOpportunity','اكتشف المخاطر قبل أن تفاجئ المراجعة الربعية المدققين.',
     'nextAction','افتح التشخيص لمعالجة أعلى ثلاث إشارات.'
   )
  ),

  ('/foundation/organization',
   'Organization', 'المؤسسة',
   'Single source of truth for the entity tree your tenant operates.',
   'مصدر الحقيقة الوحيد لشجرة الكيان الذي تعمل به مؤسستك.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI cross-checks org structure against authority and SoD coverage.',
   'الذكاء الاصطناعي يقاطع الهيكل التنظيمي مع تغطية الصلاحيات وفصل الواجبات.',
   '[{"label":"Live tenant data","severity":"info","labelAr":"بيانات حية للمستأجر"}]'::jsonb,
   '{"label":"Add organization","labelAr":"إضافة كيان","action":{"kind":"navigate","path":"/foundation/organization/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Authority, SoD, and access reviews are anchored to this tree.',
     'evidence','tenant_<id>.organizations, business_units, hierarchy edges.',
     'whatChanged','Org chart reads directly from tenant schema (live).',
     'riskOrOpportunity','Reduce orphaned units and stale parents.',
     'nextAction','Review unmapped business units flagged by AI.'
   ),
   jsonb_build_object(
     'whyItMatters','الصلاحيات وفصل الواجبات ومراجعات الوصول مرتبطة بهذه الشجرة.',
     'evidence','جداول المستأجر للمؤسسات ووحدات الأعمال وحواف الهرم.',
     'whatChanged','يقرأ المخطط التنظيمي مباشرة من مخطط المستأجر (حي).',
     'riskOrOpportunity','قلل الوحدات اليتيمة والآباء المتقادمين.',
     'nextAction','راجع وحدات الأعمال غير المربوطة التي يبرزها الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/business-units',
   'Business units', 'وحدات الأعمال',
   'Operating units within each organization.',
   'الوحدات التشغيلية داخل كل كيان.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI flags BUs without owners or with stale charters.',
   'الذكاء الاصطناعي يرصد وحدات الأعمال بدون مالك أو ميثاق قديم.',
   '[{"label":"Editable","severity":"low","labelAr":"قابل للتحرير"}]'::jsonb,
   '{"label":"Add business unit","labelAr":"إضافة وحدة","action":{"kind":"navigate","path":"/foundation/business-units/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','BUs are the primary scope for budget, ownership, and risk.',
     'evidence','tenant business_units rows linked to organizations.',
     'whatChanged','Live nodes from tenant DB; ownership AI adds badges.',
     'riskOrOpportunity','Surface duplicate or orphaned BUs early.',
     'nextAction','Approve owner suggestions from AI.'
   ),
   jsonb_build_object(
     'whyItMatters','وحدات الأعمال هي النطاق الأساسي للميزانية والملكية والمخاطر.',
     'evidence','صفوف وحدات الأعمال للمستأجر المرتبطة بالكيانات.',
     'whatChanged','عقد حية من قاعدة بيانات المستأجر؛ يضيف الذكاء الاصطناعي شارات الملكية.',
     'riskOrOpportunity','اكشف الوحدات المكررة أو اليتيمة مبكرًا.',
     'nextAction','وافق على اقتراحات المالك من الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/departments',
   'Departments', 'الأقسام',
   'Department tree under each business unit.',
   'شجرة الأقسام تحت كل وحدة أعمال.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI suggests parent re-attachments and missing managers.',
   'يقترح الذكاء الاصطناعي إعادة ربط الآباء والمديرين الناقصين.',
   '[{"label":"Live","severity":"info","labelAr":"حي"}]'::jsonb,
   '{"label":"Add department","labelAr":"إضافة قسم","action":{"kind":"navigate","path":"/foundation/departments/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Departments scope HR, access reviews, and operating cadence.',
     'evidence','tenant departments table linked to business_units.',
     'whatChanged','AI adds suggested reattachments inline.',
     'riskOrOpportunity','Avoid stale departments in reorgs.',
     'nextAction','Resolve flagged orphan departments.'
   ),
   jsonb_build_object(
     'whyItMatters','الأقسام تحدد نطاق الموارد البشرية ومراجعات الوصول وإيقاع التشغيل.',
     'evidence','جدول أقسام المستأجر المرتبط بوحدات الأعمال.',
     'whatChanged','يضيف الذكاء الاصطناعي اقتراحات إعادة الربط بشكل مدمج.',
     'riskOrOpportunity','تجنب الأقسام المتقادمة عند إعادة الهيكلة.',
     'nextAction','عالج الأقسام اليتيمة المرصودة.'
   )
  ),

  ('/foundation/teams',
   'Teams', 'الفرق',
   'Cross-department teams operating under defined function codes.',
   'الفرق المتقاطعة بين الأقسام التي تعمل تحت رموز وظيفية محددة.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI recommends function-code consolidations.',
   'يوصي الذكاء الاصطناعي بدمج رموز الوظائف.',
   '[{"label":"Editable","severity":"low","labelAr":"قابل للتحرير"}]'::jsonb,
   '{"label":"Add team","labelAr":"إضافة فريق","action":{"kind":"navigate","path":"/foundation/teams/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Teams own work, RACI, and the day-to-day execution surface.',
     'evidence','tenant teams + team_members + team_raci_assignments.',
     'whatChanged','RACI gaps now surfaced by AI.',
     'riskOrOpportunity','Reduce confusion across overlapping teams.',
     'nextAction','Resolve flagged duplicate function codes.'
   ),
   jsonb_build_object(
     'whyItMatters','الفرق تمتلك العمل و RACI وسطح التنفيذ اليومي.',
     'evidence','فرق المستأجر وأعضاء الفرق وتعيينات RACI.',
     'whatChanged','الذكاء الاصطناعي يبرز الآن فجوات RACI.',
     'riskOrOpportunity','قلل الالتباس عبر الفرق المتداخلة.',
     'nextAction','عالج رموز الوظائف المكررة المرصودة.'
   )
  ),

  ('/foundation/hierarchy-viz',
   'Hierarchy', 'الهرمية',
   'Visualize the full org-to-team hierarchy and reporting lines.',
   'صور الهرم الكامل من الكيان إلى الفرق وخطوط التقرير.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI overlays gap detection on reporting paths.',
   'يطبق الذكاء الاصطناعي طبقة كشف الفجوات على مسارات التقرير.',
   '[{"label":"Visualization","severity":"info","labelAr":"تمثيل بصري"}]'::jsonb,
   '{"label":"Open organization","labelAr":"افتح المؤسسة","action":{"kind":"navigate","path":"/foundation/organization"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','A correct reporting tree is the spine of access and approvals.',
     'evidence','manager_chain edges + tenant_<id> structure tables.',
     'whatChanged','Hierarchy edges now hot-reload from DB.',
     'riskOrOpportunity','Spot broken reporting before SoD breaks.',
     'nextAction','Fix the highest-severity broken edge.'
   ),
   jsonb_build_object(
     'whyItMatters','شجرة التقرير الصحيحة هي العمود الفقري للوصول والاعتمادات.',
     'evidence','حواف سلسلة المديرين وجداول هيكل المستأجر.',
     'whatChanged','حواف الهرم تُحمل الآن مباشرة من قاعدة البيانات.',
     'riskOrOpportunity','اكشف التقارير المكسورة قبل أن ينكسر فصل الواجبات.',
     'nextAction','أصلح الحافة الأعلى خطورة.'
   )
  ),

  ('/foundation/ownership',
   'Ownership', 'الملكية',
   'Who owns each entity, asset, and process across the tenant.',
   'من يمتلك كل كيان وأصل وعملية عبر المستأجر.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI flags assets with no owner or with role-pair conflicts.',
   'الذكاء الاصطناعي يرصد الأصول بدون مالك أو بتعارضات أدوار.',
   '[{"label":"DB-driven","severity":"low","labelAr":"مستند للبيانات"}]'::jsonb,
   '{"label":"Open authority matrix","labelAr":"افتح مصفوفة الصلاحيات","action":{"kind":"navigate","path":"/foundation/governance/authority-matrix"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Ownership enables accountability for risk and remediation.',
     'evidence','ownership_mappings + authority matrix + policy registry.',
     'whatChanged','AI now flags coverage gaps inline.',
     'riskOrOpportunity','Reduce orphan assets that have no accountable owner.',
     'nextAction','Assign owners to flagged assets.'
   ),
   jsonb_build_object(
     'whyItMatters','الملكية تتيح المساءلة عن المخاطر والمعالجة.',
     'evidence','تخصيصات الملكية ومصفوفة الصلاحيات وسجل السياسات.',
     'whatChanged','الذكاء الاصطناعي يرصد فجوات التغطية بشكل مدمج.',
     'riskOrOpportunity','قلل الأصول اليتيمة بدون مالك مسؤول.',
     'nextAction','عيّن ملاكًا للأصول المرصودة.'
   )
  ),

  ('/foundation/ownership-mapping',
   'Ownership mapping', 'تخطيط الملكية',
   'Map of owner-to-entity bindings used by approvals and reviews.',
   'خريطة ربط المالكين بالكيانات المستخدمة في الاعتمادات والمراجعات.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI suggests new bindings when authority gaps exist.',
   'يقترح الذكاء الاصطناعي ربطًا جديدًا عند وجود فجوات في الصلاحيات.',
   '[{"label":"Authority-aware","severity":"info","labelAr":"حساس للصلاحيات"}]'::jsonb,
   '{"label":"Open ownership","labelAr":"افتح الملكية","action":{"kind":"navigate","path":"/foundation/ownership"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Mapping is the live ledger your approvers depend on.',
     'evidence','ownership_mappings + per-role authority limits.',
     'whatChanged','Suggestions now consume live authority gaps.',
     'riskOrOpportunity','Avoid blocked approvals due to missing owners.',
     'nextAction','Approve top-3 AI suggested bindings.'
   ),
   jsonb_build_object(
     'whyItMatters','التخطيط هو السجل الحي الذي يعتمد عليه الموافقون.',
     'evidence','تخصيصات الملكية وحدود الصلاحيات لكل دور.',
     'whatChanged','الاقتراحات تستهلك الآن فجوات صلاحيات حية.',
     'riskOrOpportunity','تجنب اعتمادات معلقة بسبب نقص المالكين.',
     'nextAction','وافق على أعلى ثلاث اقتراحات للذكاء الاصطناعي.'
   )
  ),

  ('/foundation/positions',
   'Positions', 'الوظائف',
   'Catalog of positions and their authority limits.',
   'كتالوج الوظائف وحدود صلاحياتها.',
   'Foundation • People', 'المؤسسة • الأشخاص',
   'AI surfaces authority gaps and overlapping positions.',
   'يبرز الذكاء الاصطناعي فجوات الصلاحيات والوظائف المتداخلة.',
   '[{"label":"Authority-linked","severity":"info","labelAr":"مرتبط بالصلاحيات"}]'::jsonb,
   '{"label":"Add position","labelAr":"إضافة وظيفة","action":{"kind":"navigate","path":"/foundation/positions/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Positions anchor authority limits and SoD evaluation.',
     'evidence','positions + foundation_position_authority + sod rules.',
     'whatChanged','AI now flags duplicate or overlapping positions.',
     'riskOrOpportunity','Avoid unbounded approvals.',
     'nextAction','Review flagged authority gaps.'
   ),
   jsonb_build_object(
     'whyItMatters','الوظائف ترسي حدود الصلاحيات وتقييم فصل الواجبات.',
     'evidence','الوظائف وصلاحيات الوظيفة وقواعد فصل الواجبات.',
     'whatChanged','الذكاء الاصطناعي يرصد الوظائف المكررة أو المتداخلة.',
     'riskOrOpportunity','تجنب الاعتمادات غير المحدودة.',
     'nextAction','راجع فجوات الصلاحيات المرصودة.'
   )
  ),

  ('/foundation/locations',
   'Locations', 'المواقع',
   'Operational locations and their site-level controls.',
   'المواقع التشغيلية وضوابطها على مستوى الموقع.',
   'Foundation • Operations', 'المؤسسة • العمليات',
   'AI flags locations missing primary owner or compliance scope.',
   'الذكاء الاصطناعي يرصد المواقع التي تفتقد مالكًا أو نطاق امتثال.',
   '[{"label":"Editable","severity":"low","labelAr":"قابل للتحرير"}]'::jsonb,
   '{"label":"Add location","labelAr":"إضافة موقع","action":{"kind":"navigate","path":"/foundation/locations/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Locations carry compliance and physical-control obligations.',
     'evidence','locations + location_bu_map + tenant compliance refs.',
     'whatChanged','AI surfaces missing-owner risk per site.',
     'riskOrOpportunity','Reduce site-level audit findings.',
     'nextAction','Resolve flagged sites without owners.'
   ),
   jsonb_build_object(
     'whyItMatters','المواقع تحمل التزامات الامتثال والضبط المادي.',
     'evidence','المواقع وربط المواقع بوحدات الأعمال ومراجع امتثال المستأجر.',
     'whatChanged','الذكاء الاصطناعي يبرز خطر غياب المالك لكل موقع.',
     'riskOrOpportunity','قلل ملاحظات التدقيق على مستوى الموقع.',
     'nextAction','عالج المواقع المرصودة بدون مالكين.'
   )
  ),

  ('/foundation/users',
   'Users', 'المستخدمون',
   'All user identities active in this tenant.',
   'كل هويات المستخدمين النشطة في هذا المستأجر.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI scores users by inactivity and SoD risk.',
   'يقيم الذكاء الاصطناعي المستخدمين حسب الخمول وخطر فصل الواجبات.',
   '[{"label":"Live","severity":"info","labelAr":"حي"}]'::jsonb,
   '{"label":"Invite users","labelAr":"دعوة مستخدمين","action":{"kind":"navigate","path":"/foundation/users/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Identity drift fuels access risk and audit findings.',
     'evidence','dos.users + user_role_assignments + access_review_items.',
     'whatChanged','AI score column visible per row.',
     'riskOrOpportunity','Cut dormant accounts before next audit.',
     'nextAction','Disable top-flagged dormant identities.'
   ),
   jsonb_build_object(
     'whyItMatters','انحراف الهوية يغذي مخاطر الوصول وملاحظات التدقيق.',
     'evidence','المستخدمون وتعيينات الأدوار وعناصر مراجعة الوصول.',
     'whatChanged','عمود تقييم الذكاء الاصطناعي ظاهر في كل صف.',
     'riskOrOpportunity','تقلص الحسابات الخامدة قبل التدقيق التالي.',
     'nextAction','عطل أعلى الهويات الخامدة المرصودة.'
   )
  ),

  ('/foundation/roles',
   'Roles', 'الأدوار',
   'Functional roles and their permission bundles.',
   'الأدوار الوظيفية وحزم صلاحياتها.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI clusters role overlaps and unused roles.',
   'يجمع الذكاء الاصطناعي تداخلات الأدوار والأدوار غير المستخدمة.',
   '[{"label":"Permissioned","severity":"info","labelAr":"مرتبط بالصلاحيات"}]'::jsonb,
   '{"label":"Add role","labelAr":"إضافة دور","action":{"kind":"navigate","path":"/foundation/roles/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Role hygiene drives least-privilege and clean access reviews.',
     'evidence','functional_roles + role_permission_map + assignments.',
     'whatChanged','AI now suggests role retirements.',
     'riskOrOpportunity','Reduce permission sprawl.',
     'nextAction','Retire AI-flagged unused roles.'
   ),
   jsonb_build_object(
     'whyItMatters','نظافة الأدوار تدفع نحو أقل الامتيازات ومراجعات وصول نظيفة.',
     'evidence','الأدوار الوظيفية وخريطة صلاحيات الدور والتعيينات.',
     'whatChanged','الذكاء الاصطناعي يقترح الآن تقاعد الأدوار.',
     'riskOrOpportunity','قلل تضخم الصلاحيات.',
     'nextAction','تقاعد الأدوار غير المستخدمة المرصودة.'
   )
  ),

  ('/foundation/permissions',
   'Permissions', 'الصلاحيات',
   'Permission catalog and role bindings across the tenant.',
   'كتالوج الصلاحيات وربط الأدوار عبر المستأجر.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI flags wide-scope permissions assigned to many roles.',
   'الذكاء الاصطناعي يرصد الصلاحيات واسعة النطاق المخصصة لأدوار كثيرة.',
   '[{"label":"DB-driven","severity":"low","labelAr":"مستند للبيانات"}]'::jsonb,
   '{"label":"Open roles","labelAr":"افتح الأدوار","action":{"kind":"navigate","path":"/foundation/roles"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Wide permissions break least-privilege.',
     'evidence','permissions + role_permissions + assignments.',
     'whatChanged','AI surfaces over-broad scopes.',
     'riskOrOpportunity','Cut blast radius of compromised accounts.',
     'nextAction','Narrow flagged permission scopes.'
   ),
   jsonb_build_object(
     'whyItMatters','الصلاحيات الواسعة تكسر مبدأ أقل الامتيازات.',
     'evidence','الصلاحيات وربط صلاحيات الدور والتعيينات.',
     'whatChanged','الذكاء الاصطناعي يبرز النطاقات المفرطة.',
     'riskOrOpportunity','قلل نصف قطر الانفجار للحسابات المخترقة.',
     'nextAction','ضيق نطاقات الصلاحيات المرصودة.'
   )
  ),

  ('/foundation/committees',
   'Committees', 'اللجان',
   'Governance committees, members, and quorum rules.',
   'لجان الحوكمة والأعضاء وقواعد النصاب.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI watches for quorum risk and self-vote conflicts.',
   'يراقب الذكاء الاصطناعي مخاطر النصاب وتعارضات التصويت الذاتي.',
   '[{"label":"Editable","severity":"low","labelAr":"قابل للتحرير"}]'::jsonb,
   '{"label":"Open committees","labelAr":"افتح اللجان","action":{"kind":"navigate","path":"/foundation/committees"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Committees gate the most consequential decisions.',
     'evidence','committees + committee_members + meetings.',
     'whatChanged','AI checks each meeting against SoD self-vote rule.',
     'riskOrOpportunity','Reduce post-meeting nullifications.',
     'nextAction','Review flagged self-vote risks.'
   ),
   jsonb_build_object(
     'whyItMatters','اللجان تتحكم في أهم القرارات.',
     'evidence','اللجان وأعضاء اللجان والاجتماعات.',
     'whatChanged','الذكاء الاصطناعي يفحص كل اجتماع مقابل قاعدة التصويت الذاتي.',
     'riskOrOpportunity','قلل إبطال القرارات بعد الاجتماع.',
     'nextAction','راجع مخاطر التصويت الذاتي المرصودة.'
   )
  ),

  ('/foundation/policies',
   'Policies', 'السياسات',
   'Approved policies, ownership, and acknowledgement state.',
   'السياسات المعتمدة والملكية وحالة الإقرار.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI flags expiring policies and missing acknowledgements.',
   'يرصد الذكاء الاصطناعي السياسات منتهية الصلاحية والإقرارات الناقصة.',
   '[{"label":"Lifecycle-aware","severity":"info","labelAr":"حساس لدورة الحياة"}]'::jsonb,
   '{"label":"Open acks","labelAr":"افتح الإقرارات","action":{"kind":"navigate","path":"/foundation/governance/policy-acks"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Stale policies block audit defense and SLA cases.',
     'evidence','foundation_policies + acks + lifecycle.',
     'whatChanged','AI now scores expiry risk by domain.',
     'riskOrOpportunity','Avoid being caught with expired policies.',
     'nextAction','Renew the top-3 expiring policies.'
   ),
   jsonb_build_object(
     'whyItMatters','السياسات المتقادمة تعرقل الدفاع التدقيقي وحالات اتفاقية الخدمة.',
     'evidence','سياسات المؤسسة والإقرارات ودورة الحياة.',
     'whatChanged','الذكاء الاصطناعي يقيم خطر انتهاء الصلاحية حسب المجال.',
     'riskOrOpportunity','تجنب الإمساك بسياسات منتهية.',
     'nextAction','جدد أعلى ثلاث سياسات قاربت الانتهاء.'
   )
  ),

  ('/foundation/delegations',
   'Delegations', 'التفويضات',
   'Active and pending authority delegations.',
   'التفويضات النشطة والمعلقة للصلاحيات.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI flags delegations with collusion-window or expiry risk.',
   'الذكاء الاصطناعي يرصد التفويضات بمخاطر نافذة التواطؤ أو انتهاء الصلاحية.',
   '[{"label":"Time-aware","severity":"warning","labelAr":"حساس للوقت"}]'::jsonb,
   '{"label":"Add delegation","labelAr":"إضافة تفويض","action":{"kind":"navigate","path":"/foundation/delegations/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Bad delegations let users bypass authority limits.',
     'evidence','delegations + authority matrix + SoD time-separation rule.',
     'whatChanged','AI annotates each row with risk score.',
     'riskOrOpportunity','Stop the next collusion incident before it happens.',
     'nextAction','Resolve top-flagged risky delegations.'
   ),
   jsonb_build_object(
     'whyItMatters','التفويضات السيئة تسمح للمستخدمين بتجاوز حدود الصلاحيات.',
     'evidence','التفويضات ومصفوفة الصلاحيات وقاعدة فصل الوقت لفصل الواجبات.',
     'whatChanged','الذكاء الاصطناعي يضع تقييم المخاطر على كل صف.',
     'riskOrOpportunity','أوقف حادثة التواطؤ القادمة قبل حدوثها.',
     'nextAction','عالج التفويضات الخطرة المرصودة.'
   )
  ),

  ('/foundation/access-review',
   'Access reviews', 'مراجعات الوصول',
   'Active access-review campaigns with SLA and AI escalation.',
   'حملات مراجعة الوصول النشطة مع اتفاقيات الخدمة وتصعيد الذكاء الاصطناعي.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI escalates stalled items past SLA.',
   'الذكاء الاصطناعي يصعّد العناصر المتوقفة بعد اتفاقية الخدمة.',
   '[{"label":"SLA-tracked","severity":"info","labelAr":"يُتتبع باتفاقية الخدمة"}]'::jsonb,
   '{"label":"New campaign","labelAr":"حملة جديدة","action":{"kind":"navigate","path":"/foundation/access-review/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Access reviews are the audit-grade attestation of who has what.',
     'evidence','access_reviews + access_review_items + AI escalation.',
     'whatChanged','AI escalation now writes to escalations queue.',
     'riskOrOpportunity','Close every campaign on time.',
     'nextAction','Drain the escalation queue.'
   ),
   jsonb_build_object(
     'whyItMatters','مراجعات الوصول هي شهادة مستوى التدقيق لمن يملك ماذا.',
     'evidence','مراجعات الوصول وعناصرها وتصعيد الذكاء الاصطناعي.',
     'whatChanged','تصعيد الذكاء الاصطناعي يكتب الآن إلى طابور التصعيد.',
     'riskOrOpportunity','أغلق كل حملة في الوقت المحدد.',
     'nextAction','فرغ طابور التصعيد.'
   )
  ),

  ('/foundation/access-review/escalations',
   'Access review escalations', 'تصعيد مراجعة الوصول',
   'SLA-breach and AI-driven escalations across active campaigns.',
   'مخالفات اتفاقية الخدمة والتصعيدات المدفوعة بالذكاء الاصطناعي عبر الحملات النشطة.',
   'Foundation • Workflow', 'المؤسسة • سير العمل',
   'AI assigns and re-routes stuck reviews.',
   'الذكاء الاصطناعي يعيّن ويعيد توجيه المراجعات العالقة.',
   '[{"label":"AI-driven","severity":"warning","labelAr":"يديره الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open campaigns","labelAr":"افتح الحملات","action":{"kind":"navigate","path":"/foundation/access-review"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Stuck reviews break the audit trail and block change windows.',
     'evidence','access_review_items past sla + AI escalation log.',
     'whatChanged','AI tags root cause for each stuck item.',
     'riskOrOpportunity','Hit campaign close dates without manual sweep.',
     'nextAction','Resolve top-3 AI suggested re-routes.'
   ),
   jsonb_build_object(
     'whyItMatters','المراجعات العالقة تكسر سجل التدقيق وتحجب نوافذ التغيير.',
     'evidence','عناصر مراجعة الوصول التي تجاوزت اتفاقية الخدمة وسجل تصعيد الذكاء الاصطناعي.',
     'whatChanged','الذكاء الاصطناعي يضع السبب الجذري لكل عنصر عالق.',
     'riskOrOpportunity','حقق تواريخ إغلاق الحملة بدون كنس يدوي.',
     'nextAction','عالج أعلى ثلاث إعادة توجيه يقترحها الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/governance/sod-rules',
   'SoD rules', 'قواعد فصل الواجبات',
   'Tenant SoD rule catalog and severity baseline.',
   'كتالوج قواعد فصل الواجبات للمستأجر وخط أساس الخطورة.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI proposes new rules based on detected near-misses.',
   'يقترح الذكاء الاصطناعي قواعد جديدة بناء على الإفلاتات المرصودة.',
   '[{"label":"Editable","severity":"low","labelAr":"قابل للتحرير"}]'::jsonb,
   '{"label":"Open SoD","labelAr":"افتح فصل الواجبات","action":{"kind":"navigate","path":"/foundation/sod"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Rule baseline drives the entire SoD evaluation.',
     'evidence','foundation_sod_rules + module_sod_rules.',
     'whatChanged','AI suggests rules from observed events.',
     'riskOrOpportunity','Catch new conflict patterns early.',
     'nextAction','Approve top suggested SoD rule.'
   ),
   jsonb_build_object(
     'whyItMatters','خط أساس القواعد يقود تقييم فصل الواجبات بالكامل.',
     'evidence','قواعد فصل واجبات المؤسسة وقواعد الوحدة.',
     'whatChanged','الذكاء الاصطناعي يقترح قواعد من الأحداث المرصودة.',
     'riskOrOpportunity','اكتشف أنماط التعارض الجديدة مبكرًا.',
     'nextAction','وافق على أعلى قاعدة مقترحة للذكاء الاصطناعي.'
   )
  ),

  ('/foundation/governance/sod-violations',
   'SoD violations', 'مخالفات فصل الواجبات',
   'Open SoD violations with severity, owner, and AI remediation.',
   'مخالفات فصل الواجبات المفتوحة مع الخطورة والمالك ومعالجة الذكاء الاصطناعي.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI suggests remediation per violation.',
   'يقترح الذكاء الاصطناعي معالجة لكل مخالفة.',
   '[{"label":"Live","severity":"warning","labelAr":"حي"}]'::jsonb,
   '{"label":"Open SoD","labelAr":"افتح فصل الواجبات","action":{"kind":"navigate","path":"/foundation/sod"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Open SoD violations are audit findings waiting to happen.',
     'evidence','foundation_sod_violations + foundation_sod_exception.',
     'whatChanged','AI now reads exception state to suggest closures.',
     'riskOrOpportunity','Resolve before next audit cycle.',
     'nextAction','Close lowest-effort high-severity items.'
   ),
   jsonb_build_object(
     'whyItMatters','مخالفات فصل الواجبات المفتوحة هي ملاحظات تدقيق تنتظر الحدوث.',
     'evidence','مخالفات فصل الواجبات واستثناءاتها.',
     'whatChanged','الذكاء الاصطناعي يقرأ حالة الاستثناء لاقتراح الإغلاق.',
     'riskOrOpportunity','عالجها قبل دورة التدقيق التالية.',
     'nextAction','أغلق العناصر عالية الخطورة الأقل جهدًا.'
   )
  ),

  ('/foundation/governance/authority-matrix',
   'Authority matrix', 'مصفوفة الصلاحيات',
   'Per-position authority limits and qualifications.',
   'حدود الصلاحيات والمؤهلات لكل وظيفة.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI flags positions exceeding limits or with stale qualifications.',
   'الذكاء الاصطناعي يرصد الوظائف التي تتجاوز الحدود أو بمؤهلات متقادمة.',
   '[{"label":"Authority-aware","severity":"info","labelAr":"حساس للصلاحيات"}]'::jsonb,
   '{"label":"Open positions","labelAr":"افتح الوظائف","action":{"kind":"navigate","path":"/foundation/positions"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Authority limits prevent unbounded approvals.',
     'evidence','foundation_position_authority + qualifications.',
     'whatChanged','AI surfaces stale qualification risk.',
     'riskOrOpportunity','Avoid post-hoc audit findings.',
     'nextAction','Refresh stale qualifications.'
   ),
   jsonb_build_object(
     'whyItMatters','حدود الصلاحيات تمنع الاعتمادات غير المحدودة.',
     'evidence','صلاحيات الوظيفة والمؤهلات.',
     'whatChanged','الذكاء الاصطناعي يبرز خطر المؤهلات المتقادمة.',
     'riskOrOpportunity','تجنب ملاحظات التدقيق اللاحقة.',
     'nextAction','حدّث المؤهلات المتقادمة.'
   )
  ),

  ('/foundation/governance/coi',
   'Conflicts of interest', 'تعارض المصالح',
   'COI declarations and disposition.',
   'إقرارات تعارض المصالح وحالاتها.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI matches declarations against role/authority assignments.',
   'الذكاء الاصطناعي يطابق الإقرارات مع تخصيص الأدوار والصلاحيات.',
   '[{"label":"Bilingual","severity":"info","labelAr":"ثنائي اللغة"}]'::jsonb,
   '{"label":"Open committees","labelAr":"افتح اللجان","action":{"kind":"navigate","path":"/foundation/committees"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Unmanaged COI is the most-cited governance failure.',
     'evidence','foundation_coi_declarations + role/authority bindings.',
     'whatChanged','AI links each declaration to live role context.',
     'riskOrOpportunity','Avoid case-level invalidations.',
     'nextAction','Resolve top-flagged conflicts.'
   ),
   jsonb_build_object(
     'whyItMatters','عدم إدارة تعارض المصالح هو أكثر إخفاقات الحوكمة استشهادًا.',
     'evidence','إقرارات تعارض المصالح وربط الأدوار/الصلاحيات.',
     'whatChanged','الذكاء الاصطناعي يربط كل إقرار بسياق الدور الحي.',
     'riskOrOpportunity','تجنب إبطال الحالات.',
     'nextAction','عالج التعارضات المرصودة.'
   )
  ),

  ('/foundation/governance/policy-acks',
   'Policy acknowledgements', 'إقرارات السياسات',
   'Per-user policy acknowledgement state with AI nudges.',
   'حالة إقرار السياسات لكل مستخدم مع تنبيهات الذكاء الاصطناعي.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI sequences policy nudges to maximize completion.',
   'الذكاء الاصطناعي يرتب تنبيهات السياسات لتعظيم الإنجاز.',
   '[{"label":"Lifecycle-aware","severity":"info","labelAr":"حساس لدورة الحياة"}]'::jsonb,
   '{"label":"Open policies","labelAr":"افتح السياسات","action":{"kind":"navigate","path":"/foundation/policies"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Acknowledgements are evidence for policy enforcement.',
     'evidence','foundation_policy_acknowledgments + lifecycle.',
     'whatChanged','AI now schedules nudges by user readiness.',
     'riskOrOpportunity','Avoid bulk-late completions.',
     'nextAction','Approve AI-suggested nudge plan.'
   ),
   jsonb_build_object(
     'whyItMatters','الإقرارات هي دليل تطبيق السياسة.',
     'evidence','إقرارات سياسات المؤسسة ودورة الحياة.',
     'whatChanged','الذكاء الاصطناعي يجدول التنبيهات حسب جاهزية المستخدم.',
     'riskOrOpportunity','تجنب الإنجاز المتأخر بكميات.',
     'nextAction','وافق على خطة التنبيه المقترحة.'
   )
  ),

  ('/foundation/governance/training',
   'Training records', 'سجلات التدريب',
   'Compliance training enrollment and completion.',
   'تسجيل وإنجاز تدريب الامتثال.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI flags users not eligible for sensitive workflows.',
   'الذكاء الاصطناعي يرصد المستخدمين غير المؤهلين لسير عمل حساس.',
   '[{"label":"AI-gated","severity":"info","labelAr":"تتحكم به مخرجات الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open users","labelAr":"افتح المستخدمين","action":{"kind":"navigate","path":"/foundation/users"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Training is a hard gate for sensitive role assignment.',
     'evidence','training records + role gating.',
     'whatChanged','AI annotates each user with training risk.',
     'riskOrOpportunity','Avoid blocked workflow steps.',
     'nextAction','Enroll AI-flagged users.'
   ),
   jsonb_build_object(
     'whyItMatters','التدريب بوابة صارمة لتعيين الأدوار الحساسة.',
     'evidence','سجلات التدريب وبوابات الأدوار.',
     'whatChanged','الذكاء الاصطناعي يضع خطر التدريب لكل مستخدم.',
     'riskOrOpportunity','تجنب خطوات سير عمل محظورة.',
     'nextAction','سجّل المستخدمين المرصودين.'
   )
  ),

  ('/foundation/audit',
   'Audit trail', 'سجل التدقيق',
   'Hash-chained audit ledger for foundation actions.',
   'سجل تدقيق مرتبط بالتجزئة لإجراءات المؤسسة.',
   'Foundation • Audit', 'المؤسسة • التدقيق',
   'AI clusters anomalies in actor/action patterns.',
   'الذكاء الاصطناعي يجمع الشذوذ في أنماط الفاعل/الإجراء.',
   '[{"label":"Immutable","severity":"info","labelAr":"غير قابل للتعديل"}]'::jsonb,
   '{"label":"Open reports","labelAr":"افتح التقارير","action":{"kind":"navigate","path":"/foundation/reports"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Tamper-evident audit is the bedrock of every assertion.',
     'evidence','audit_trail + hash chain + AI cluster outputs.',
     'whatChanged','AI clustering output now visible inline.',
     'riskOrOpportunity','Catch anomalies before regulators do.',
     'nextAction','Triage AI-flagged anomalies.'
   ),
   jsonb_build_object(
     'whyItMatters','التدقيق المقاوم للتلاعب هو أساس كل تأكيد.',
     'evidence','سجل التدقيق وسلسلة التجزئة ومخرجات تجميع الذكاء الاصطناعي.',
     'whatChanged','مخرجات تجميع الذكاء الاصطناعي ظاهرة الآن بشكل مدمج.',
     'riskOrOpportunity','اكتشف الشذوذ قبل الجهات التنظيمية.',
     'nextAction','افرز شذوذات الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/data-processing',
   'Data processing', 'معالجة البيانات',
   'Records of processing activities under PDPL/GDPR.',
   'سجلات أنشطة المعالجة وفق PDPL/GDPR.',
   'Foundation • Audit', 'المؤسسة • التدقيق',
   'AI scans for missing legal basis or expired consents.',
   'الذكاء الاصطناعي يبحث عن أساس قانوني ناقص أو موافقات منتهية.',
   '[{"label":"PDPL","severity":"info","labelAr":"PDPL"}]'::jsonb,
   '{"label":"Open reports","labelAr":"افتح التقارير","action":{"kind":"navigate","path":"/foundation/reports"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','RoPA gaps are top regulator findings under PDPL.',
     'evidence','data_processing_records + consents + lifecycle.',
     'whatChanged','AI surfaces expired consents per record.',
     'riskOrOpportunity','Avoid PDPL-grade findings.',
     'nextAction','Close gaps on top-flagged records.'
   ),
   jsonb_build_object(
     'whyItMatters','فجوات سجل أنشطة المعالجة هي أهم ملاحظات الجهات التنظيمية وفق نظام حماية البيانات.',
     'evidence','سجلات معالجة البيانات والموافقات ودورة الحياة.',
     'whatChanged','الذكاء الاصطناعي يبرز الموافقات المنتهية لكل سجل.',
     'riskOrOpportunity','تجنب الملاحظات بمستوى نظام حماية البيانات.',
     'nextAction','أغلق الفجوات على السجلات المرصودة.'
   )
  ),

  ('/foundation/reports',
   'Reports', 'التقارير',
   'Compliance and audit reports library.',
   'مكتبة تقارير الامتثال والتدقيق.',
   'Foundation • Audit', 'المؤسسة • التدقيق',
   'AI auto-generates evidence appendices.',
   'الذكاء الاصطناعي يولد ملاحق الأدلة تلقائيًا.',
   '[{"label":"Bilingual export","severity":"info","labelAr":"تصدير ثنائي اللغة"}]'::jsonb,
   '{"label":"Generate report","labelAr":"إنشاء تقرير","action":{"kind":"open_command"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Reports are the export layer for regulators and the board.',
     'evidence','report_cards + AI-generated appendices.',
     'whatChanged','AI now drafts evidence appendices.',
     'riskOrOpportunity','Cut report turnaround time.',
     'nextAction','Approve AI-drafted report.'
   ),
   jsonb_build_object(
     'whyItMatters','التقارير هي طبقة التصدير للجهات التنظيمية والمجلس.',
     'evidence','بطاقات التقارير وملاحق الذكاء الاصطناعي.',
     'whatChanged','الذكاء الاصطناعي يصيغ ملاحق الأدلة.',
     'riskOrOpportunity','قلل زمن الاستجابة للتقارير.',
     'nextAction','وافق على التقرير المصاغ بالذكاء الاصطناعي.'
   )
  ),

  ('/foundation/settings',
   'Settings', 'الإعدادات',
   'Foundation runtime configuration.',
   'تكوين تشغيل المؤسسة.',
   'Foundation • Settings', 'المؤسسة • الإعدادات',
   'AI suggests safe defaults per tenant profile.',
   'الذكاء الاصطناعي يقترح إعدادات افتراضية آمنة لكل ملف مستأجر.',
   '[{"label":"Live","severity":"info","labelAr":"حي"}]'::jsonb,
   '{"label":"Save","labelAr":"حفظ","action":{"kind":"dispatch_event","eventName":"settings.save"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Settings shape every other foundation behavior.',
     'evidence','workspace_shell_binding + ui_workspace_policy.',
     'whatChanged','AI now suggests safe defaults.',
     'riskOrOpportunity','Avoid drift across tenants.',
     'nextAction','Accept AI-suggested defaults.'
   ),
   jsonb_build_object(
     'whyItMatters','الإعدادات تشكل كل سلوك آخر للمؤسسة.',
     'evidence','ربط واجهة المستخدم وسياسة مساحة العمل.',
     'whatChanged','الذكاء الاصطناعي يقترح إعدادات افتراضية آمنة.',
     'riskOrOpportunity','تجنب الانحراف عبر المستأجرين.',
     'nextAction','اقبل الإعدادات الافتراضية المقترحة.'
   )
  ),

  ('/foundation/diagnostics',
   'Diagnostics', 'التشخيص',
   'Operational and posture diagnostics for the foundation domain.',
   'تشخيصات التشغيل والوضع لمجال المؤسسة.',
   'Foundation • Operations', 'المؤسسة • العمليات',
   'AI scores each KPI by drift velocity.',
   'الذكاء الاصطناعي يقيم كل مؤشر بسرعة الانحراف.',
   '[{"label":"AI-scored","severity":"info","labelAr":"مقيم بالذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open overview","labelAr":"افتح النظرة العامة","action":{"kind":"navigate","path":"/foundation/overview"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Posture is the early-warning signal for compliance.',
     'evidence','foundation kpis + maturity domains + audit signals.',
     'whatChanged','AI velocity scoring now visible.',
     'riskOrOpportunity','Catch drift before SLA breaches.',
     'nextAction','Drill into the highest-velocity KPI.'
   ),
   jsonb_build_object(
     'whyItMatters','الوضع هو إشارة الإنذار المبكر للامتثال.',
     'evidence','مؤشرات المؤسسة ومجالات النضج وإشارات التدقيق.',
     'whatChanged','تقييم سرعة الذكاء الاصطناعي ظاهر الآن.',
     'riskOrOpportunity','اكشف الانحراف قبل خرق اتفاقية الخدمة.',
     'nextAction','تعمق في المؤشر الأعلى سرعة.'
   )
  ),

  ('/foundation/operations-readiness',
   'Operations readiness', 'جاهزية العمليات',
   'Readiness posture across operating capabilities.',
   'وضع الجاهزية عبر القدرات التشغيلية.',
   'Foundation • Operations', 'المؤسسة • العمليات',
   'AI predicts readiness gaps before quarterly cutoffs.',
   'الذكاء الاصطناعي يتنبأ بفجوات الجاهزية قبل التواريخ الربعية.',
   '[{"label":"Predictive","severity":"info","labelAr":"تنبؤي"}]'::jsonb,
   '{"label":"Open diagnostics","labelAr":"افتح التشخيص","action":{"kind":"navigate","path":"/foundation/diagnostics"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Readiness gaps surface as outage and audit risk.',
     'evidence','posture KPIs + maturity domains + readiness rows.',
     'whatChanged','AI predicts gaps with explainability.',
     'riskOrOpportunity','Avoid red-quarter surprises.',
     'nextAction','Approve AI-suggested mitigations.'
   ),
   jsonb_build_object(
     'whyItMatters','فجوات الجاهزية تظهر كمخاطر انقطاع وتدقيق.',
     'evidence','مؤشرات الوضع ومجالات النضج وصفوف الجاهزية.',
     'whatChanged','الذكاء الاصطناعي يتنبأ بالفجوات مع شرحها.',
     'riskOrOpportunity','تجنب مفاجآت الربع الأحمر.',
     'nextAction','وافق على المعالجات المقترحة بالذكاء الاصطناعي.'
   )
  ),

  ('/foundation/people/lifecycle',
   'People lifecycle', 'دورة حياة الأشخاص',
   'End-to-end employee lifecycle states and transitions.',
   'حالات وانتقالات دورة حياة الموظف من البداية للنهاية.',
   'Foundation • People', 'المؤسسة • الأشخاص',
   'AI flags stuck transitions and missing approvals.',
   'الذكاء الاصطناعي يرصد الانتقالات العالقة والاعتمادات الناقصة.',
   '[{"label":"Workflow","severity":"info","labelAr":"سير عمل"}]'::jsonb,
   '{"label":"Open user lifecycle","labelAr":"افتح دورة حياة المستخدم","action":{"kind":"navigate","path":"/foundation/user-lifecycle"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Lifecycle drives access provisioning and offboarding hygiene.',
     'evidence','foundation_employee_lifecycle_state + transitions.',
     'whatChanged','AI flags stuck transitions.',
     'riskOrOpportunity','Avoid orphan accounts post-exit.',
     'nextAction','Resolve top-flagged transitions.'
   ),
   jsonb_build_object(
     'whyItMatters','دورة الحياة تقود توفير الوصول ونظافة الإنهاء.',
     'evidence','حالات وانتقالات دورة حياة الموظف.',
     'whatChanged','الذكاء الاصطناعي يرصد الانتقالات العالقة.',
     'riskOrOpportunity','تجنب الحسابات اليتيمة بعد المغادرة.',
     'nextAction','عالج الانتقالات المرصودة.'
   )
  ),

  ('/foundation/people/probation-due',
   'Probation due', 'استحقاق فترة الاختبار',
   'Probation-due users with AI-recommended next decisions.',
   'المستخدمون المستحقون لفترة الاختبار مع قرارات يقترحها الذكاء الاصطناعي.',
   'Foundation • People', 'المؤسسة • الأشخاص',
   'AI ranks confirmation/PIP/exit recommendations.',
   'الذكاء الاصطناعي يرتب توصيات التأكيد/خطة التحسين/الإنهاء.',
   '[{"label":"Time-aware","severity":"warning","labelAr":"حساس للوقت"}]'::jsonb,
   '{"label":"Open lifecycle","labelAr":"افتح دورة الحياة","action":{"kind":"navigate","path":"/foundation/people/lifecycle"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Probation due dates are governance and HR risk hotspots.',
     'evidence','employee lifecycle + probation milestones.',
     'whatChanged','AI suggests decision per user.',
     'riskOrOpportunity','Avoid silent probation rollover.',
     'nextAction','Approve AI-suggested decisions in batch.'
   ),
   jsonb_build_object(
     'whyItMatters','تواريخ استحقاق فترة الاختبار هي بؤرة مخاطر الحوكمة والموارد البشرية.',
     'evidence','دورة حياة الموظف ومعالم فترة الاختبار.',
     'whatChanged','الذكاء الاصطناعي يقترح قرارًا لكل مستخدم.',
     'riskOrOpportunity','تجنب التمديد الصامت لفترة الاختبار.',
     'nextAction','وافق على قرارات الذكاء الاصطناعي دفعة واحدة.'
   )
  ),

  ('/foundation/user-lifecycle',
   'User lifecycle', 'دورة حياة المستخدم',
   'Identity lifecycle across hire, transfer, promotion, exit.',
   'دورة حياة الهوية عبر التوظيف والنقل والترقية والمغادرة.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI surfaces missing approvals and stale states.',
   'الذكاء الاصطناعي يبرز الاعتمادات الناقصة والحالات المتقادمة.',
   '[{"label":"Workflow","severity":"info","labelAr":"سير عمل"}]'::jsonb,
   '{"label":"Open users","labelAr":"افتح المستخدمين","action":{"kind":"navigate","path":"/foundation/users"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Identity lifecycle is the most-audited HR/IT seam.',
     'evidence','employee lifecycle + access reviews + delegations.',
     'whatChanged','AI tracks state staleness.',
     'riskOrOpportunity','Avoid post-exit standing access.',
     'nextAction','Drain AI-flagged transitions.'
   ),
   jsonb_build_object(
     'whyItMatters','دورة حياة الهوية هي أكثر التماسات HR/IT تدقيقًا.',
     'evidence','دورة حياة الموظف ومراجعات الوصول والتفويضات.',
     'whatChanged','الذكاء الاصطناعي يتعقب تقادم الحالة.',
     'riskOrOpportunity','تجنب الوصول الدائم بعد المغادرة.',
     'nextAction','فرغ الانتقالات المرصودة.'
   )
  ),

  ('/foundation/workflows',
   'Workflows', 'سير العمل',
   'Foundation-owned workflow definitions and run state.',
   'تعريفات وسير عمل المؤسسة وحالة التنفيذ.',
   'Foundation • Workflow', 'المؤسسة • سير العمل',
   'AI predicts SLA breach risk per active step.',
   'الذكاء الاصطناعي يتنبأ بمخاطر خرق اتفاقية الخدمة لكل خطوة نشطة.',
   '[{"label":"Run-time","severity":"info","labelAr":"وقت التشغيل"}]'::jsonb,
   '{"label":"Add workflow","labelAr":"إضافة سير عمل","action":{"kind":"navigate","path":"/foundation/workflows/new"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Workflows are the load-bearing surface for foundation work.',
     'evidence','workflow definitions + active steps + audit log.',
     'whatChanged','AI flags risk-of-breach per step.',
     'riskOrOpportunity','Avoid SLA misses.',
     'nextAction','Reassign top-flagged steps.'
   ),
   jsonb_build_object(
     'whyItMatters','سير العمل هو السطح الحامل لأعمال المؤسسة.',
     'evidence','تعريفات سير العمل والخطوات النشطة وسجل التدقيق.',
     'whatChanged','الذكاء الاصطناعي يرصد خطر الخرق لكل خطوة.',
     'riskOrOpportunity','تجنب فوات اتفاقية الخدمة.',
     'nextAction','أعد تعيين الخطوات المرصودة.'
   )
  ),

  ('/foundation/records',
   'Records', 'السجلات',
   'Domain records intelligent register.',
   'السجل الذكي لسجلات المجال.',
   'Foundation • Records', 'المؤسسة • السجلات',
   'AI ranks records by risk and freshness.',
   'الذكاء الاصطناعي يرتب السجلات حسب المخاطر والحداثة.',
   '[{"label":"AI-ranked","severity":"info","labelAr":"مرتب بالذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Add record","labelAr":"إضافة سجل","action":{"kind":"open_command"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Records are the canonical workbench for foundation domain.',
     'evidence','records + assignments + audit trail.',
     'whatChanged','AI score column per row.',
     'riskOrOpportunity','Cut time-to-decision per record.',
     'nextAction','Open the highest-risk record.'
   ),
   jsonb_build_object(
     'whyItMatters','السجلات هي الطاولة الكنسية لمجال المؤسسة.',
     'evidence','السجلات والتعيينات وسجل التدقيق.',
     'whatChanged','عمود تقييم الذكاء الاصطناعي لكل صف.',
     'riskOrOpportunity','قلل زمن اتخاذ القرار لكل سجل.',
     'nextAction','افتح السجل الأعلى خطورة.'
   )
  ),

  ('/foundation/reference-data',
   'Reference data', 'البيانات المرجعية',
   'Foundation reference data dictionaries.',
   'قواميس البيانات المرجعية للمؤسسة.',
   'Foundation • Records', 'المؤسسة • السجلات',
   'AI flags out-of-date reference values.',
   'الذكاء الاصطناعي يرصد القيم المرجعية المتقادمة.',
   '[{"label":"DB-driven","severity":"low","labelAr":"مستند للبيانات"}]'::jsonb,
   '{"label":"Open reports","labelAr":"افتح التقارير","action":{"kind":"navigate","path":"/foundation/reports"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Stale reference data corrupts every downstream record.',
     'evidence','foundation reference catalogs + lifecycle.',
     'whatChanged','AI marks staleness inline.',
     'riskOrOpportunity','Avoid silently broken records.',
     'nextAction','Refresh top-flagged reference values.'
   ),
   jsonb_build_object(
     'whyItMatters','البيانات المرجعية المتقادمة تفسد كل سجل لاحق.',
     'evidence','قواميس المرجع المؤسسية ودورة الحياة.',
     'whatChanged','الذكاء الاصطناعي يحدد التقادم مباشرة.',
     'riskOrOpportunity','تجنب السجلات المعطوبة بصمت.',
     'nextAction','حدّث القيم المرجعية المرصودة.'
   )
  ),

  ('/foundation/people/onboarding',
   'Onboarding', 'الانضمام',
   'Guided new-user onboarding flow.',
   'تدفق انضمام المستخدم الجديد الموجه.',
   'Foundation • People', 'المؤسسة • الأشخاص',
   'AI prefills sections from prior tenant patterns.',
   'الذكاء الاصطناعي يملأ الأقسام مسبقًا من أنماط المستأجر السابقة.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open users","labelAr":"افتح المستخدمين","action":{"kind":"navigate","path":"/foundation/users"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Onboarding sets the path for least-privilege from day 1.',
     'evidence','onboarding sessions + role assignments.',
     'whatChanged','AI prefills based on similar profiles.',
     'riskOrOpportunity','Cut time-to-active for new hires.',
     'nextAction','Approve AI-prefilled sections.'
   ),
   jsonb_build_object(
     'whyItMatters','الانضمام يحدد مسار أقل الامتيازات منذ اليوم الأول.',
     'evidence','جلسات الانضمام وتعيينات الأدوار.',
     'whatChanged','الذكاء الاصطناعي يملأ مسبقًا حسب الملفات المشابهة.',
     'riskOrOpportunity','قلل زمن التفعيل للموظفين الجدد.',
     'nextAction','وافق على الأقسام المملوءة مسبقًا.'
   )
  ),

  ('/foundation/access-review/new',
   'New access review', 'مراجعة وصول جديدة',
   'Create a new access-review campaign.',
   'إنشاء حملة مراجعة وصول جديدة.',
   'Foundation • Workflow', 'المؤسسة • سير العمل',
   'AI suggests scope and reviewers.',
   'الذكاء الاصطناعي يقترح النطاق والمراجعين.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open campaigns","labelAr":"افتح الحملات","action":{"kind":"navigate","path":"/foundation/access-review"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Right scope shrinks reviewer fatigue.',
     'evidence','prior campaigns + AI scoping model.',
     'whatChanged','AI proposes reviewer slate.',
     'riskOrOpportunity','Avoid scope creep.',
     'nextAction','Accept AI scope.'
   ),
   jsonb_build_object(
     'whyItMatters','النطاق الصحيح يقلل إرهاق المراجعين.',
     'evidence','الحملات السابقة ونموذج النطاق للذكاء الاصطناعي.',
     'whatChanged','الذكاء الاصطناعي يقترح قائمة المراجعين.',
     'riskOrOpportunity','تجنب توسع النطاق.',
     'nextAction','اقبل نطاق الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/delegations/new',
   'New delegation', 'تفويض جديد',
   'Create a new authority delegation.',
   'إنشاء تفويض صلاحية جديد.',
   'Foundation • Governance', 'المؤسسة • الحوكمة',
   'AI checks for SoD and authority breaches before save.',
   'الذكاء الاصطناعي يفحص فصل الواجبات وتجاوز الصلاحيات قبل الحفظ.',
   '[{"label":"AI-checked","severity":"warning","labelAr":"مفحوص بالذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open delegations","labelAr":"افتح التفويضات","action":{"kind":"navigate","path":"/foundation/delegations"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Bad delegations open SoD holes immediately.',
     'evidence','sod rules + authority matrix.',
     'whatChanged','AI runs pre-save check.',
     'riskOrOpportunity','Stop bad delegations at source.',
     'nextAction','Resolve any AI-flagged conflicts.'
   ),
   jsonb_build_object(
     'whyItMatters','التفويضات السيئة تفتح ثقوب فصل الواجبات فورًا.',
     'evidence','قواعد فصل الواجبات ومصفوفة الصلاحيات.',
     'whatChanged','الذكاء الاصطناعي يجري فحصًا قبل الحفظ.',
     'riskOrOpportunity','أوقف التفويضات السيئة عند المصدر.',
     'nextAction','عالج التعارضات المرصودة.'
   )
  ),

  ('/foundation/roles/new',
   'New role', 'دور جديد',
   'Create a new functional role.',
   'إنشاء دور وظيفي جديد.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI suggests permission bundle and scope.',
   'الذكاء الاصطناعي يقترح حزمة الصلاحيات والنطاق.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open roles","labelAr":"افتح الأدوار","action":{"kind":"navigate","path":"/foundation/roles"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','New roles set permission gravity for years.',
     'evidence','existing role catalog + permission graph.',
     'whatChanged','AI suggests bundle + checks duplicates.',
     'riskOrOpportunity','Avoid duplicate role sprawl.',
     'nextAction','Accept AI bundle.'
   ),
   jsonb_build_object(
     'whyItMatters','الأدوار الجديدة تحدد جاذبية الصلاحيات لسنوات.',
     'evidence','كتالوج الأدوار الحالي ورسم الصلاحيات.',
     'whatChanged','الذكاء الاصطناعي يقترح حزمة ويفحص التكرار.',
     'riskOrOpportunity','تجنب تضخم الأدوار المكررة.',
     'nextAction','اقبل حزمة الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/teams/new',
   'New team', 'فريق جديد',
   'Create a new team under a department or business unit.',
   'إنشاء فريق جديد تحت قسم أو وحدة أعمال.',
   'Foundation • Structure', 'المؤسسة • الهيكل',
   'AI suggests function code and members.',
   'الذكاء الاصطناعي يقترح رمز الوظيفة والأعضاء.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open teams","labelAr":"افتح الفرق","action":{"kind":"navigate","path":"/foundation/teams"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Team scope drives RACI and team-level approvals.',
     'evidence','existing teams + similar function codes.',
     'whatChanged','AI proposes member slate.',
     'riskOrOpportunity','Avoid duplicate teams.',
     'nextAction','Accept AI proposal.'
   ),
   jsonb_build_object(
     'whyItMatters','نطاق الفريق يقود RACI والاعتمادات على مستوى الفريق.',
     'evidence','الفرق الحالية ورموز الوظائف المشابهة.',
     'whatChanged','الذكاء الاصطناعي يقترح قائمة الأعضاء.',
     'riskOrOpportunity','تجنب الفرق المكررة.',
     'nextAction','اقبل اقتراح الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/users/new',
   'New user', 'مستخدم جديد',
   'Invite a new user with role and access scope.',
   'دعوة مستخدم جديد مع تحديد الدور ونطاق الوصول.',
   'Foundation • Identity', 'المؤسسة • الهوية',
   'AI suggests role bundle and onboarding tasks.',
   'الذكاء الاصطناعي يقترح حزمة الدور ومهام الانضمام.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open users","labelAr":"افتح المستخدمين","action":{"kind":"navigate","path":"/foundation/users"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','First-day setup defines least-privilege adherence.',
     'evidence','users + role assignments + onboarding sessions.',
     'whatChanged','AI suggests onboarding plan.',
     'riskOrOpportunity','Reduce time-to-active.',
     'nextAction','Accept AI plan.'
   ),
   jsonb_build_object(
     'whyItMatters','إعداد اليوم الأول يحدد التزام أقل الامتيازات.',
     'evidence','المستخدمون وتعيينات الأدوار وجلسات الانضمام.',
     'whatChanged','الذكاء الاصطناعي يقترح خطة الانضمام.',
     'riskOrOpportunity','قلل زمن التفعيل.',
     'nextAction','اقبل خطة الذكاء الاصطناعي.'
   )
  ),

  ('/foundation/workflows/new',
   'New workflow', 'سير عمل جديد',
   'Create a new foundation-owned workflow.',
   'إنشاء سير عمل جديد تمتلكه المؤسسة.',
   'Foundation • Workflow', 'المؤسسة • سير العمل',
   'AI proposes step graph and SLA.',
   'الذكاء الاصطناعي يقترح رسم الخطوات واتفاقية الخدمة.',
   '[{"label":"AI-assisted","severity":"info","labelAr":"بمساعدة الذكاء الاصطناعي"}]'::jsonb,
   '{"label":"Open workflows","labelAr":"افتح سير العمل","action":{"kind":"navigate","path":"/foundation/workflows"}}'::jsonb,
   jsonb_build_object(
     'whyItMatters','Step graph + SLA define every downstream KPI.',
     'evidence','existing workflows + run statistics.',
     'whatChanged','AI suggests step graph.',
     'riskOrOpportunity','Avoid expensive late edits.',
     'nextAction','Accept AI graph.'
   ),
   jsonb_build_object(
     'whyItMatters','رسم الخطوات واتفاقية الخدمة تحدد كل مؤشر لاحق.',
     'evidence','سير العمل الحالي وإحصائيات التشغيل.',
     'whatChanged','الذكاء الاصطناعي يقترح رسم الخطوات.',
     'riskOrOpportunity','تجنب التعديلات المتأخرة المكلفة.',
     'nextAction','اقبل رسم الذكاء الاصطناعي.'
   )
  )

)

UPDATE dos.ui_route_template_binding b
   SET title_en        = COALESCE(NULLIF(s.title_en,''),     b.title_en),
       title_ar        = COALESCE(NULLIF(s.title_ar,''),     b.title_ar),
       subtitle_en     = COALESCE(NULLIF(s.subtitle_en,''),  b.subtitle_en),
       subtitle_ar     = COALESCE(NULLIF(s.subtitle_ar,''),  b.subtitle_ar),
       eyebrow_en      = COALESCE(NULLIF(s.eyebrow_en,''),   b.eyebrow_en),
       eyebrow_ar      = COALESCE(NULLIF(s.eyebrow_ar,''),   b.eyebrow_ar),
       ai_headline_en  = COALESCE(NULLIF(s.ai_headline_en,''), b.ai_headline_en),
       ai_headline_ar  = COALESCE(NULLIF(s.ai_headline_ar,''), b.ai_headline_ar),
       status_tags     = COALESCE(s.status_tags,    b.status_tags),
       primary_action  = COALESCE(s.primary_action, b.primary_action),
       props           = COALESCE(b.props,'{}'::jsonb)
                            || jsonb_build_object(
                              'pillars',   s.pillars_en,
                              'pillarsEn', s.pillars_en,
                              'pillarsAr', s.pillars_ar
                            ),
       version         = COALESCE(b.version,0) + 1,
       updated_at      = now()
  FROM foundation_seed s
 WHERE b.route = s.route;

-- Validation: every foundation route must have title_en + pillarsEn after seed.
DO $verify$
DECLARE
  bad_routes TEXT;
BEGIN
  SELECT string_agg(route, ', ')
    INTO bad_routes
    FROM dos.ui_route_template_binding
   WHERE route LIKE '/foundation/%'
     AND (title_en IS NULL OR title_en = '' OR jsonb_typeof(props->'pillarsEn') <> 'object');
  IF bad_routes IS NOT NULL THEN
    RAISE EXCEPTION 'foundation enterprise seed missed routes: %', bad_routes;
  END IF;
END
$verify$;

COMMIT;
