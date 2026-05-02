// @ts-nocheck — module-layer imports not yet extracted
import { registerModuleCrud, type ModuleCrudDef } from '@dos/platform-core/modules/module-crud-registry';

const SHAHIN_MODULE_CRUD_DEFS: ModuleCrudDef[] = [
  {
    module: 'policies', parentModule: 'policy', moduleEn: 'Policies', moduleAr: 'السياسات',
    icon: 'pi pi-file-edit', route: '/governance', apiBase: '/api/governance/policies',
    readPerm: 'policy.document.read', writePerm: 'policy.document.write', deletePerm: 'policy.document.delete',
    exportable: true, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'content', labelEn: 'Content', labelAr: 'المحتوى', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'review', labelEn: 'In Review', labelAr: 'قيد المراجعة' },
          { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
          { value: 'published', labelEn: 'Published', labelAr: 'منشور' },
        ] },
      { key: 'category', labelEn: 'Category', labelAr: 'الفئة', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'created_at', labelEn: 'Created', labelAr: 'تاريخ الإنشاء', type: 'date', required: false, showInList: true, showInForm: false, editable: false },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
        { value: 'review', labelEn: 'In Review', labelAr: 'قيد المراجعة' },
        { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
        { value: 'published', labelEn: 'Published', labelAr: 'منشور' },
      ] },
    ],
  },
  {
    module: 'risks', parentModule: 'risk', moduleEn: 'Risks', moduleAr: 'المخاطر',
    icon: 'pi pi-exclamation-triangle', route: '/risks', apiBase: '/api/risks',
    readPerm: 'risk.record.read', writePerm: 'risk.record.write', deletePerm: 'risk.record.delete',
    exportable: true, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
      { key: 'category', labelEn: 'Category', labelAr: 'الفئة', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' },
          { value: 'strategic', labelEn: 'Strategic', labelAr: 'استراتيجي' },
          { value: 'financial', labelEn: 'Financial', labelAr: 'مالي' },
          { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
          { value: 'technology', labelEn: 'Technology', labelAr: 'تقني' },
        ] },
      { key: 'likelihood', labelEn: 'Likelihood', labelAr: 'الاحتمالية', type: 'number', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'impact', labelEn: 'Impact', labelAr: 'الأثر', type: 'number', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'identified', labelEn: 'Identified', labelAr: 'محدد' },
          { value: 'assessed', labelEn: 'Assessed', labelAr: 'مقيّم' },
          { value: 'mitigated', labelEn: 'Mitigated', labelAr: 'مخفف' },
          { value: 'accepted', labelEn: 'Accepted', labelAr: 'مقبول' },
          { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' },
        ] },
    ],
    filters: [
      { key: 'category', labelEn: 'Category', labelAr: 'الفئة', type: 'select', options: [
        { value: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' },
        { value: 'strategic', labelEn: 'Strategic', labelAr: 'استراتيجي' },
        { value: 'financial', labelEn: 'Financial', labelAr: 'مالي' },
        { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
        { value: 'technology', labelEn: 'Technology', labelAr: 'تقني' },
      ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'identified', labelEn: 'Identified', labelAr: 'محدد' },
        { value: 'mitigated', labelEn: 'Mitigated', labelAr: 'مخفف' },
        { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' },
      ] },
    ],
  },
  {
    module: 'controls', parentModule: 'compliance', moduleEn: 'Controls', moduleAr: 'الضوابط',
    icon: 'pi pi-shield', route: '/controls', apiBase: '/api/controls',
    readPerm: 'control.record.read', writePerm: 'control.record.write', deletePerm: 'control.record.delete',
    exportable: true, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'control_type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'preventive', labelEn: 'Preventive', labelAr: 'وقائي' },
          { value: 'detective', labelEn: 'Detective', labelAr: 'كشفي' },
          { value: 'corrective', labelEn: 'Corrective', labelAr: 'تصحيحي' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
          { value: 'deprecated', labelEn: 'Deprecated', labelAr: 'متقادم' },
        ] },
    ],
    filters: [
      { key: 'control_type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'preventive', labelEn: 'Preventive', labelAr: 'وقائي' },
        { value: 'detective', labelEn: 'Detective', labelAr: 'كشفي' },
        { value: 'corrective', labelEn: 'Corrective', labelAr: 'تصحيحي' },
      ] },
    ],
  },
  {
    module: 'assessments', parentModule: 'compliance', moduleEn: 'Assessments', moduleAr: 'التقييمات',
    icon: 'pi pi-check-square', route: '/assessments', apiBase: '/api/assessments',
    readPerm: 'assessment.record.read', writePerm: 'assessment.record.write', deletePerm: 'assessment.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'frameworkId', labelEn: 'Framework', labelAr: 'الإطار', type: 'text', required: true, showInList: true, showInForm: true, editable: false },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
        { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'incidents', parentModule: 'incident', moduleEn: 'Incidents', moduleAr: 'الحوادث',
    icon: 'pi pi-bolt', route: '/incidents', apiBase: '/api/incidents',
    readPerm: 'incident.record.read', writePerm: 'incident.record.write', deletePerm: 'incident.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
      { key: 'category', labelEn: 'Category', labelAr: 'الفئة', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'security', labelEn: 'Security', labelAr: 'أمني' },
          { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
          { value: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' },
          { value: 'data_breach', labelEn: 'Data Breach', labelAr: 'اختراق بيانات' },
        ] },
      { key: 'severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        ] },
    ],
    filters: [
      { key: 'severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'select', options: [
        { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
        { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
        { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
        { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
      ] },
    ],
  },
  {
    module: 'vendors', parentModule: 'vendor', moduleEn: 'Vendors', moduleAr: 'الموردون',
    icon: 'pi pi-truck', route: '/vendor-risk', apiBase: '/api/vendors',
    readPerm: 'vendor.record.read', writePerm: 'vendor.record.write', deletePerm: 'vendor.record.write',
    exportable: true, bulkable: false,
    fields: [
      { key: 'name', labelEn: 'Name', labelAr: 'الاسم', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'category', labelEn: 'Category', labelAr: 'الفئة', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'risk_tier', labelEn: 'Risk Tier', labelAr: 'مستوى المخاطر', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        ] },
    ],
    filters: [
      { key: 'risk_tier', labelEn: 'Risk Tier', labelAr: 'مستوى المخاطر', type: 'select', options: [
        { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
        { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
        { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
      ] },
    ],
  },
  {
    module: 'evidence', parentModule: 'evidence', moduleEn: 'Evidence', moduleAr: 'الأدلة',
    icon: 'pi pi-paperclip', route: '/evidence', apiBase: '/api/evidence',
    readPerm: 'evidence.item.read', writePerm: 'evidence.item.write', deletePerm: 'evidence.item.write',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'controlId', labelEn: 'Control', labelAr: 'الضابط', type: 'text', required: true, showInList: true, showInForm: true, editable: false },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'document', labelEn: 'Document', labelAr: 'وثيقة' },
          { value: 'screenshot', labelEn: 'Screenshot', labelAr: 'لقطة شاشة' },
          { value: 'log', labelEn: 'Log', labelAr: 'سجل' },
          { value: 'config', labelEn: 'Configuration', labelAr: 'إعدادات' },
        ] },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'document', labelEn: 'Document', labelAr: 'وثيقة' },
        { value: 'screenshot', labelEn: 'Screenshot', labelAr: 'لقطة شاشة' },
        { value: 'log', labelEn: 'Log', labelAr: 'سجل' },
      ] },
    ],
  },
  {
    module: 'findings', parentModule: 'audit', moduleEn: 'Findings', moduleAr: 'النتائج',
    icon: 'pi pi-search', route: '/findings', apiBase: '/api/findings',
    readPerm: 'workspace.config.read', writePerm: 'workspace.config.write', deletePerm: 'workspace.config.write',
    exportable: true, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        ] },
      { key: 'source', labelEn: 'Source', labelAr: 'المصدر', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'audit', labelEn: 'Audit', labelAr: 'تدقيق' },
          { value: 'assessment', labelEn: 'Assessment', labelAr: 'تقييم' },
          { value: 'incident', labelEn: 'Incident', labelAr: 'حادث' },
          { value: 'manual', labelEn: 'Manual', labelAr: 'يدوي' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'open', labelEn: 'Open', labelAr: 'مفتوح' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد المعالجة' },
          { value: 'resolved', labelEn: 'Resolved', labelAr: 'محلول' },
          { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' },
        ] },
    ],
    filters: [
      { key: 'severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'select', options: [
        { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
        { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
        { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
      ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'open', labelEn: 'Open', labelAr: 'مفتوح' },
        { value: 'resolved', labelEn: 'Resolved', labelAr: 'محلول' },
      ] },
    ],
  },
  {
    module: 'bcp', parentModule: 'bcp', moduleEn: 'Business Continuity', moduleAr: 'استمرارية الأعمال',
    icon: 'pi pi-sitemap', route: '/bcp', apiBase: '/api/bcp',
    readPerm: 'bcp.plan.read', writePerm: 'bcp.plan.write', deletePerm: 'bcp.plan.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'bcp', labelEn: 'BCP', labelAr: 'خطة استمرارية' },
          { value: 'drp', labelEn: 'DRP', labelAr: 'خطة تعافي' },
        ] },
      { key: 'content', labelEn: 'Content', labelAr: 'المحتوى', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'bcp', labelEn: 'BCP', labelAr: 'خطة استمرارية' },
        { value: 'drp', labelEn: 'DRP', labelAr: 'خطة تعافي' },
      ] },
    ],
  },
  {
    module: 'action-items', parentModule: 'action', moduleEn: 'Action Items', moduleAr: 'بنود العمل',
    icon: 'pi pi-list-check', route: '/action-items', apiBase: '/api/action-items',
    readPerm: 'action.item.read', writePerm: 'action.item.write', deletePerm: 'action.item.write',
    exportable: false, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'assignedTo', labelEn: 'Assigned To', labelAr: 'مسند إلى', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'deadline', labelEn: 'Deadline', labelAr: 'الموعد النهائي', type: 'date', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
          { value: 'overdue', labelEn: 'Overdue', labelAr: 'متأخر' },
        ] },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' },
        { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'tasks', parentModule: 'action', moduleEn: 'Task Board', moduleAr: 'لوحة المهام',
    icon: 'pi pi-th-large', route: '/task-board', apiBase: '/api/task-board',
    readPerm: 'task.item.read', writePerm: 'task.item.write', deletePerm: 'task.item.write',
    exportable: false, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'assignedTo', labelEn: 'Assigned To', labelAr: 'مسند إلى', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'todo', labelEn: 'To Do', labelAr: 'للتنفيذ' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'review', labelEn: 'Review', labelAr: 'مراجعة' },
          { value: 'done', labelEn: 'Done', labelAr: 'مكتمل' },
        ] },
    ],
    filters: [],
  },
  {
    module: 'dpia', parentModule: 'compliance', moduleEn: 'DPIA', moduleAr: 'تقييم تأثير الخصوصية',
    icon: 'pi pi-lock', route: '/dpia', apiBase: '/api/dpia',
    readPerm: 'assessment.record.read', writePerm: 'assessment.record.write', deletePerm: 'assessment.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'processing_activity', labelEn: 'Processing Activity', labelAr: 'نشاط المعالجة', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'in_review', labelEn: 'In Review', labelAr: 'قيد المراجعة' },
          { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
        ] },
    ],
    filters: [],
  },
  {
    module: 'asset', parentModule: 'asset', moduleEn: 'Assets', moduleAr: 'الأصول',
    icon: 'pi pi-server', route: '/assets', apiBase: '/api/assets',
    readPerm: 'asset.record.read', writePerm: 'asset.record.write', deletePerm: 'asset.record.write',
    exportable: true, bulkable: true,
    fields: [
      { key: 'name', labelEn: 'Name', labelAr: 'الاسم', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'asset_type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'information', labelEn: 'Information', labelAr: 'معلومات' },
          { value: 'hardware', labelEn: 'Hardware', labelAr: 'أجهزة' },
          { value: 'software', labelEn: 'Software', labelAr: 'برمجيات' },
          { value: 'service', labelEn: 'Service', labelAr: 'خدمة' },
        ] },
      { key: 'criticality', labelEn: 'Criticality', labelAr: 'الأهمية', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'high', labelEn: 'High', labelAr: 'مرتفع' },
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        ] },
    ],
    filters: [
      { key: 'asset_type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'information', labelEn: 'Information', labelAr: 'معلومات' },
        { value: 'hardware', labelEn: 'Hardware', labelAr: 'أجهزة' },
        { value: 'software', labelEn: 'Software', labelAr: 'برمجيات' },
      ] },
    ],
  },
  {
    module: 'remediation', parentModule: 'remediation', moduleEn: 'Remediation', moduleAr: 'المعالجة',
    icon: 'pi pi-wrench', route: '/remediation', apiBase: '/api/remediation',
    readPerm: 'remediation.task.read', writePerm: 'remediation.plan.write', deletePerm: 'remediation.plan.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'open', labelEn: 'Open', labelAr: 'مفتوح' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
      { key: 'dueDate', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date', required: false, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'open', labelEn: 'Open', labelAr: 'مفتوح' },
        { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'dora', parentModule: 'dora', moduleEn: 'DORA Resilience', moduleAr: 'مرونة DORA',
    icon: 'pi pi-shield', route: '/dora', apiBase: '/api/dora/ict-assets',
    readPerm: 'dora.record.read', writePerm: 'dora.record.write', deletePerm: 'dora.record.delete',
    exportable: true, bulkable: true,
    fields: [
      { key: 'name', labelEn: 'Asset Name', labelAr: 'اسم الأصل', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'asset_type', labelEn: 'Asset Type', labelAr: 'نوع الأصل', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'hardware', labelEn: 'Hardware', labelAr: 'أجهزة' },
          { value: 'software', labelEn: 'Software', labelAr: 'برمجيات' },
          { value: 'network', labelEn: 'Network', labelAr: 'شبكة' },
          { value: 'cloud', labelEn: 'Cloud Service', labelAr: 'خدمة سحابية' },
          { value: 'data', labelEn: 'Data Store', labelAr: 'مخزن بيانات' },
        ] },
      { key: 'criticality', labelEn: 'Criticality', labelAr: 'الأهمية', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
          { value: 'high', labelEn: 'High', labelAr: 'عالي' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
        ] },
      { key: 'vendor', labelEn: 'Vendor', labelAr: 'المورد', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
          { value: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة' },
          { value: 'decommissioned', labelEn: 'Decommissioned', labelAr: 'خارج الخدمة' },
        ] },
    ],
    filters: [
      { key: 'criticality', labelEn: 'Criticality', labelAr: 'الأهمية', type: 'select', options: [
        { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        { value: 'high', labelEn: 'High', labelAr: 'عالي' },
        { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
        { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
      ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
        { value: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة' },
        { value: 'decommissioned', labelEn: 'Decommissioned', labelAr: 'خارج الخدمة' },
      ] },
    ],
  },
  {
    module: 'journey', parentModule: 'journey', moduleEn: 'Maturity Journey', moduleAr: 'رحلة النضج',
    icon: 'pi pi-map', route: '/journey', apiBase: '/api/journey/roadmaps',
    readPerm: 'journey.record.read', writePerm: 'journey.record.write', deletePerm: 'journey.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Roadmap Title', labelAr: 'عنوان خريطة الطريق', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'not_started', labelEn: 'Not Started', labelAr: 'لم تبدأ' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
      { key: 'overall_maturity', labelEn: 'Maturity Level', labelAr: 'مستوى النضج', type: 'number', required: false, showInList: true, showInForm: false, editable: false },
      { key: 'target_date', labelEn: 'Target Date', labelAr: 'التاريخ المستهدف', type: 'date', required: false, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'not_started', labelEn: 'Not Started', labelAr: 'لم تبدأ' },
        { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'exception', parentModule: 'exception', moduleEn: 'Exceptions', moduleAr: 'الاستثناءات',
    icon: 'pi pi-exclamation-circle', route: '/governance/exceptions', apiBase: '/api/exceptions',
    readPerm: 'exception.record.read', writePerm: 'exception.record.write', deletePerm: 'exception.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'justification', labelEn: 'Justification', labelAr: 'المبرر', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
      { key: 'risk_level', labelEn: 'Risk Level', labelAr: 'مستوى المخاطر', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
          { value: 'high', labelEn: 'High', labelAr: 'عالي' },
          { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
          { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'requested', labelEn: 'Requested', labelAr: 'مطلوب' },
          { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
          { value: 'rejected', labelEn: 'Rejected', labelAr: 'مرفوض' },
          { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' },
        ] },
      { key: 'expiry_date', labelEn: 'Expiry Date', labelAr: 'تاريخ الانتهاء', type: 'date', required: true, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'requested', labelEn: 'Requested', labelAr: 'مطلوب' },
        { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
        { value: 'rejected', labelEn: 'Rejected', labelAr: 'مرفوض' },
        { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' },
      ] },
      { key: 'risk_level', labelEn: 'Risk Level', labelAr: 'مستوى المخاطر', type: 'select', options: [
        { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
        { value: 'high', labelEn: 'High', labelAr: 'عالي' },
        { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
        { value: 'low', labelEn: 'Low', labelAr: 'منخفض' },
      ] },
    ],
  },
  {
    module: 'training', parentModule: 'training', moduleEn: 'Training', moduleAr: 'التدريب',
    icon: 'pi pi-graduation-cap', route: '/training', apiBase: '/api/training/courses',
    readPerm: 'training.record.read', writePerm: 'training.record.write', deletePerm: 'training.record.delete',
    exportable: true, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Course Title', labelAr: 'عنوان الدورة', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'description', labelEn: 'Description', labelAr: 'الوصف', type: 'textarea', required: false, showInList: false, showInForm: true, editable: true },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'awareness', labelEn: 'Awareness', labelAr: 'توعية' },
          { value: 'technical', labelEn: 'Technical', labelAr: 'تقني' },
          { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
          { value: 'certification', labelEn: 'Certification', labelAr: 'شهادة' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
          { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' },
        ] },
      { key: 'due_date', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date', required: false, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'awareness', labelEn: 'Awareness', labelAr: 'توعية' },
        { value: 'technical', labelEn: 'Technical', labelAr: 'تقني' },
        { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
      ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
        { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
        { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' },
      ] },
    ],
  },
  {
    module: 'notification', parentModule: 'notification', moduleEn: 'Notifications', moduleAr: 'الإشعارات',
    icon: 'pi pi-bell', route: '/notifications', apiBase: '/api/notifications',
    readPerm: 'notification.config.read', writePerm: 'notification.config.write', deletePerm: 'notification.alert.delete',
    exportable: false, bulkable: true,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'message', labelEn: 'Message', labelAr: 'الرسالة', type: 'textarea', required: true, showInList: false, showInForm: true, editable: true },
      { key: 'channel', labelEn: 'Channel', labelAr: 'القناة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'email', labelEn: 'Email', labelAr: 'بريد إلكتروني' },
          { value: 'inapp', labelEn: 'In-App', labelAr: 'داخل التطبيق' },
          { value: 'sms', labelEn: 'SMS', labelAr: 'رسالة نصية' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: false, editable: false,
        options: [
          { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' },
          { value: 'sent', labelEn: 'Sent', labelAr: 'مرسل' },
          { value: 'failed', labelEn: 'Failed', labelAr: 'فشل' },
        ] },
    ],
    filters: [
      { key: 'channel', labelEn: 'Channel', labelAr: 'القناة', type: 'select', options: [
        { value: 'email', labelEn: 'Email', labelAr: 'بريد إلكتروني' },
        { value: 'inapp', labelEn: 'In-App', labelAr: 'داخل التطبيق' },
        { value: 'sms', labelEn: 'SMS', labelAr: 'رسالة نصية' },
      ] },
    ],
  },
  {
    module: 'governance', parentModule: 'governance', moduleEn: 'Governance', moduleAr: 'الحوكمة',
    icon: 'pi pi-building', route: '/governance', apiBase: '/api/governance',
    readPerm: 'governance.record.read', writePerm: 'governance.record.write', deletePerm: 'governance.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'decision', labelEn: 'Decision', labelAr: 'قرار' },
          { value: 'charter', labelEn: 'Charter', labelAr: 'ميثاق' },
          { value: 'mandate', labelEn: 'Mandate', labelAr: 'تكليف' },
          { value: 'initiative', labelEn: 'Initiative', labelAr: 'مبادرة' },
          { value: 'review', labelEn: 'Review', labelAr: 'مراجعة' },
        ] },
      { key: 'committee', labelEn: 'Committee', labelAr: 'اللجنة', type: 'text', required: false, showInList: true, showInForm: true, editable: true },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
      { key: 'owner', labelEn: 'Owner', labelAr: 'المالك', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'decision', labelEn: 'Decision', labelAr: 'قرار' },
        { value: 'charter', labelEn: 'Charter', labelAr: 'ميثاق' },
        { value: 'mandate', labelEn: 'Mandate', labelAr: 'تكليف' },
      ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
        { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'privacy', parentModule: 'privacy', moduleEn: 'Privacy', moduleAr: 'الخصوصية',
    icon: 'pi pi-lock', route: '/privacy', apiBase: '/api/privacy',
    readPerm: 'privacy.record.read', writePerm: 'privacy.record.write', deletePerm: 'privacy.record.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Title', labelAr: 'العنوان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'dsar', labelEn: 'DSAR', labelAr: 'طلب حق الوصول' },
          { value: 'consent', labelEn: 'Consent', labelAr: 'موافقة' },
          { value: 'breach', labelEn: 'Breach Notification', labelAr: 'إخطار خرق' },
          { value: 'dpia', labelEn: 'DPIA', labelAr: 'تقييم أثر الخصوصية' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'open', labelEn: 'Open', labelAr: 'مفتوح' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
      { key: 'due_date', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date', required: false, showInList: true, showInForm: true, editable: true },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'dsar', labelEn: 'DSAR', labelAr: 'طلب حق الوصول' },
        { value: 'consent', labelEn: 'Consent', labelAr: 'موافقة' },
        { value: 'breach', labelEn: 'Breach', labelAr: 'خرق' },
        { value: 'dpia', labelEn: 'DPIA', labelAr: 'تقييم أثر الخصوصية' },
      ] },
    ],
  },
  {
    module: 'qiyas', parentModule: 'qiyas', moduleEn: 'Qiyas Assessments', moduleAr: 'تقييمات قياس',
    icon: 'pi pi-chart-bar', route: '/qiyas', apiBase: '/api/qiyas/assessments',
    readPerm: 'qiyas.assessment.read', writePerm: 'qiyas.assessment.write', deletePerm: 'qiyas.assessment.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'title', labelEn: 'Assessment Title', labelAr: 'عنوان التقييم', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'framework', labelEn: 'Framework', labelAr: 'الإطار', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'score', labelEn: 'Score', labelAr: 'الدرجة', type: 'number', required: false, showInList: true, showInForm: false, editable: false },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
          { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
          { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
        ] },
    ],
    filters: [
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
        { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
        { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
      ] },
    ],
  },
  {
    module: 'foundation', parentModule: 'foundation', moduleEn: 'Foundation', moduleAr: 'الأساسيات',
    icon: 'pi pi-database', route: '/foundation', apiBase: '/api/foundation/organizations',
    readPerm: 'foundation.org.read', writePerm: 'foundation.org.write', deletePerm: 'foundation.org.delete',
    exportable: true, bulkable: false,
    fields: [
      { key: 'name', labelEn: 'Entity Name', labelAr: 'اسم الكيان', type: 'text', required: true, showInList: true, showInForm: true, editable: true },
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', required: true, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'department', labelEn: 'Department', labelAr: 'إدارة' },
          { value: 'division', labelEn: 'Division', labelAr: 'قسم' },
          { value: 'team', labelEn: 'Team', labelAr: 'فريق' },
          { value: 'business-unit', labelEn: 'Business Unit', labelAr: 'وحدة أعمال' },
        ] },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', required: false, showInList: true, showInForm: true, editable: true,
        options: [
          { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
          { value: 'inactive', labelEn: 'Inactive', labelAr: 'غير نشط' },
        ] },
    ],
    filters: [
      { key: 'type', labelEn: 'Type', labelAr: 'النوع', type: 'select', options: [
        { value: 'department', labelEn: 'Department', labelAr: 'إدارة' },
        { value: 'division', labelEn: 'Division', labelAr: 'قسم' },
        { value: 'team', labelEn: 'Team', labelAr: 'فريق' },
      ] },
    ],
  },
];

for (const def of SHAHIN_MODULE_CRUD_DEFS) registerModuleCrud(def);
