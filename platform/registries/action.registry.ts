/**
 * Action Registry — static catalog of all meaningful UI actions.
 *
 * Every button/command that has business significance goes through
 * ActionAvailabilityService, which checks this registry against UiRenderContext.
 */

export interface ActionRegistryEntry {
  actionCode: string;
  moduleCode: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  requiredPermissions: string[];
  workflowConstraints?: { allowedStatuses: string[] };
  sodSensitive: boolean;
  aiEnabled: boolean;
  dangerLevel: 'safe' | 'moderate' | 'destructive';
}

export const ACTION_REGISTRY: ActionRegistryEntry[] = [
  // ── Risk ───────────────────────────────────────────────────────────────
  { actionCode: 'risk.record.create',      moduleCode: 'risk', labelEn: 'Create Risk',      labelAr: 'إنشاء خطر',         icon: 'plus',        requiredPermissions: ['risk.record.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'risk.record.update',      moduleCode: 'risk', labelEn: 'Update Risk',      labelAr: 'تحديث خطر',         icon: 'edit',        requiredPermissions: ['risk.record.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'risk.record.approve',     moduleCode: 'risk', labelEn: 'Approve Risk',     labelAr: 'اعتماد خطر',        icon: 'check',       requiredPermissions: ['risk.record.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'risk.record.delete',      moduleCode: 'risk', labelEn: 'Delete Risk',      labelAr: 'حذف خطر',           icon: 'trash-2',     requiredPermissions: ['risk.record.delete'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'destructive' },
  { actionCode: 'risk.record.assign',      moduleCode: 'risk', labelEn: 'Assign Risk',      labelAr: 'تعيين خطر',         icon: 'user-plus',   requiredPermissions: ['risk.record.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'risk.record.escalate',    moduleCode: 'risk', labelEn: 'Escalate Risk',    labelAr: 'تصعيد خطر',         icon: 'arrow-up',    requiredPermissions: ['risk.record.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'moderate' },

  // ── Compliance ─────────────────────────────────────────────────────────
  { actionCode: 'control.record.create',   moduleCode: 'compliance', labelEn: 'Create Control',   labelAr: 'إنشاء ضابط',        icon: 'plus',    requiredPermissions: ['compliance.program.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'control.record.test',     moduleCode: 'compliance', labelEn: 'Test Control',     labelAr: 'اختبار ضابط',       icon: 'play',    requiredPermissions: ['compliance.program.write'],   sodSensitive: true,  aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'control.record.approve',  moduleCode: 'compliance', labelEn: 'Approve Control',  labelAr: 'اعتماد ضابط',       icon: 'check',   requiredPermissions: ['compliance.program.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'obligation.record.create',    moduleCode: 'compliance', labelEn: 'Create Obligation',    labelAr: 'إنشاء التزام',      icon: 'plus',        requiredPermissions: ['obligation.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'obligation.record.assign',    moduleCode: 'compliance', labelEn: 'Assign Obligation',    labelAr: 'تعيين التزام',      icon: 'user-plus',   requiredPermissions: ['obligation.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'assessment.record.start',     moduleCode: 'compliance', labelEn: 'Start Assessment',     labelAr: 'بدء التقييم',       icon: 'play',        requiredPermissions: ['assessment.record.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'assessment.record.approve',   moduleCode: 'compliance', labelEn: 'Approve Assessment',   labelAr: 'اعتماد التقييم',    icon: 'check',       requiredPermissions: ['assessment.record.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'assessment.record.reject',    moduleCode: 'compliance', labelEn: 'Reject Assessment',    labelAr: 'رفض التقييم',       icon: 'x',           requiredPermissions: ['assessment.record.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'attestation.record.create',   moduleCode: 'compliance', labelEn: 'Create Attestation',   labelAr: 'إنشاء إقرار',       icon: 'file-check',  requiredPermissions: ['attestation.record.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'attestation.record.submit',   moduleCode: 'compliance', labelEn: 'Submit Attestation',   labelAr: 'تقديم إقرار',       icon: 'send',        requiredPermissions: ['attestation.record.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'gap.record.remediate',        moduleCode: 'compliance', labelEn: 'Remediate Gap',        labelAr: 'معالجة الفجوة',     icon: 'wrench',      requiredPermissions: ['compliance.program.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },

  // ── Policy ─────────────────────────────────────────────────────────────
  { actionCode: 'policy.document.create',    moduleCode: 'policy', labelEn: 'Create Policy',    labelAr: 'إنشاء سياسة',       icon: 'plus',        requiredPermissions: ['policy.document.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'policy.document.approve',   moduleCode: 'policy', labelEn: 'Approve Policy',   labelAr: 'اعتماد سياسة',      icon: 'check',       requiredPermissions: ['policy.document.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'policy.document.publish',   moduleCode: 'policy', labelEn: 'Publish Policy',   labelAr: 'نشر سياسة',         icon: 'send',        requiredPermissions: ['policy.document.approve'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Evidence ───────────────────────────────────────────────────────────
  { actionCode: 'evidence.item.upload',  moduleCode: 'evidence', labelEn: 'Upload Evidence',  labelAr: 'رفع دليل',          icon: 'upload',      requiredPermissions: ['evidence.item.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'evidence.item.review',  moduleCode: 'evidence', labelEn: 'Review Evidence',  labelAr: 'مراجعة دليل',       icon: 'eye',         requiredPermissions: ['evidence.item.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'evidence.item.request', moduleCode: 'evidence', labelEn: 'Request Evidence', labelAr: 'طلب دليل',          icon: 'file-plus',   requiredPermissions: ['evidence.item.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },

  // ── Audit ──────────────────────────────────────────────────────────────
  { actionCode: 'audit.record.create',     moduleCode: 'audit', labelEn: 'Create Audit',     labelAr: 'إنشاء تدقيق',       icon: 'plus',        requiredPermissions: ['audit.record.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'audit.record.approve',    moduleCode: 'audit', labelEn: 'Approve Audit',    labelAr: 'اعتماد تدقيق',      icon: 'check',       requiredPermissions: ['audit.record.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'audit.record.export',     moduleCode: 'audit', labelEn: 'Export Audit Pack', labelAr: 'تصدير حزمة التدقيق', icon: 'download',   requiredPermissions: ['audit.record.read'],     sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },

  // ── Incident ───────────────────────────────────────────────────────────
  { actionCode: 'incident.record.create',   moduleCode: 'incident', labelEn: 'Report Incident',  labelAr: 'إبلاغ عن حادث',     icon: 'alert-triangle', requiredPermissions: ['incident.record.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'incident.record.escalate', moduleCode: 'incident', labelEn: 'Escalate Incident', labelAr: 'تصعيد حادث',        icon: 'arrow-up',       requiredPermissions: ['incident.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'moderate' },

  // ── Vendor ─────────────────────────────────────────────────────────────
  { actionCode: 'vendor.record.create',    moduleCode: 'vendor', labelEn: 'Add Vendor',       labelAr: 'إضافة مورد',        icon: 'plus',        requiredPermissions: ['vendor.record.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'vendor.record.assess',    moduleCode: 'vendor', labelEn: 'Assess Vendor',    labelAr: 'تقييم مورد',        icon: 'clipboard',   requiredPermissions: ['vendor.record.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },

  // ── Governance ─────────────────────────────────────────────────────────
  { actionCode: 'governance.record.approve', moduleCode: 'governance', labelEn: 'Approve',    labelAr: 'اعتماد',            icon: 'check',       requiredPermissions: ['governance.record.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'governance.record.reject',  moduleCode: 'governance', labelEn: 'Reject',     labelAr: 'رفض',               icon: 'x',           requiredPermissions: ['governance.record.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── AI ─────────────────────────────────────────────────────────────────
  { actionCode: 'ai.agent.recommend',     moduleCode: 'ai', labelEn: 'AI Recommend',     labelAr: 'توصية ذكاء',        icon: 'sparkles',    requiredPermissions: ['ai.agent.read'],     sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'ai.agent.draft',         moduleCode: 'ai', labelEn: 'AI Draft',         labelAr: 'مسودة ذكاء',        icon: 'pen-tool',    requiredPermissions: ['ai.agent.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'ai.agent.execute',       moduleCode: 'ai', labelEn: 'AI Execute',       labelAr: 'تنفيذ ذكاء',        icon: 'zap',         requiredPermissions: ['ai.agent.execute'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'moderate' },

  // ── Workflow ──────────────────────────────────────────────────────────
  { actionCode: 'workflow.instance.create',             moduleCode: 'workflow', labelEn: 'Create Workflow',      labelAr: 'إنشاء سير العمل',      icon: 'plus',         requiredPermissions: ['workflow.instance.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'workflow.instance.update',             moduleCode: 'workflow', labelEn: 'Update Workflow',      labelAr: 'تحديث سير العمل',      icon: 'edit',         requiredPermissions: ['workflow.instance.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'workflow.instance.execute',            moduleCode: 'workflow', labelEn: 'Execute Workflow',     labelAr: 'تنفيذ سير العمل',      icon: 'play',         requiredPermissions: ['workflow.instance.execute'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'moderate', workflowConstraints: { allowedStatuses: ['active', 'template'] } },
  { actionCode: 'workflow.instance.approve',            moduleCode: 'workflow', labelEn: 'Approve Step',         labelAr: 'اعتماد خطوة',          icon: 'check',        requiredPermissions: ['workflow.instance.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'workflow.instance.reject',             moduleCode: 'workflow', labelEn: 'Reject Step',          labelAr: 'رفض خطوة',             icon: 'x',            requiredPermissions: ['workflow.instance.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'workflow.instance.delete',             moduleCode: 'workflow', labelEn: 'Delete Workflow',      labelAr: 'حذف سير العمل',        icon: 'trash-2',      requiredPermissions: ['workflow.instance.delete'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'destructive' },
  { actionCode: 'workflow.instance.publish',            moduleCode: 'workflow', labelEn: 'Publish Template',     labelAr: 'نشر القالب',           icon: 'send',         requiredPermissions: ['workflow.instance.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'workflow.instance.instantiate',        moduleCode: 'workflow', labelEn: 'Instantiate Template', labelAr: 'إنشاء من قالب',        icon: 'copy',         requiredPermissions: ['workflow.instance.execute'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'workflow.instance.template',  moduleCode: 'workflow', labelEn: 'Activate Template',    labelAr: 'تفعيل القالب',         icon: 'toggle-right', requiredPermissions: ['workflow.instance.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'workflow.instance.execution',    moduleCode: 'workflow', labelEn: 'Retry Execution',      labelAr: 'إعادة التنفيذ',        icon: 'refresh-cw',   requiredPermissions: ['workflow.instance.execute'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'workflow.instance.execution',   moduleCode: 'workflow', labelEn: 'Cancel Execution',     labelAr: 'إلغاء التنفيذ',        icon: 'x-circle',     requiredPermissions: ['workflow.instance.execute'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'task.item.complete',               moduleCode: 'workflow', labelEn: 'Complete Task',        labelAr: 'إكمال المهمة',         icon: 'check-circle', requiredPermissions: ['workflow.task.act'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'task.item.assign',                 moduleCode: 'workflow', labelEn: 'Assign Task',          labelAr: 'تعيين المهمة',         icon: 'user-plus',    requiredPermissions: ['workflow.task.act'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'task.item.reassign',               moduleCode: 'workflow', labelEn: 'Reassign Task',        labelAr: 'إعادة تعيين المهمة',   icon: 'user-check',   requiredPermissions: ['workflow.task.act'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'task.item.escalate',               moduleCode: 'workflow', labelEn: 'Escalate Task',        labelAr: 'تصعيد المهمة',         icon: 'arrow-up',     requiredPermissions: ['workflow.task.act'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'moderate' },
  { actionCode: 'approval.request.approve',            moduleCode: 'workflow', labelEn: 'Approve Request',      labelAr: 'اعتماد الطلب',         icon: 'check',        requiredPermissions: ['workflow.approval.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'approval.request.reject',             moduleCode: 'workflow', labelEn: 'Reject Request',       labelAr: 'رفض الطلب',            icon: 'x',            requiredPermissions: ['workflow.approval.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── Exception ──────────────────────────────────────────────────────────
  { actionCode: 'exception.record.create',   moduleCode: 'exception', labelEn: 'Create Exception',   labelAr: 'إنشاء استثناء',         icon: 'pi pi-plus',          requiredPermissions: ['exception.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'exception.record.update',   moduleCode: 'exception', labelEn: 'Update Exception',   labelAr: 'تحديث استثناء',         icon: 'pi pi-pencil',        requiredPermissions: ['exception.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'exception.record.approve',  moduleCode: 'exception', labelEn: 'Approve Exception',  labelAr: 'اعتماد استثناء',        icon: 'pi pi-check',         requiredPermissions: ['exception.record.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'exception.record.close',    moduleCode: 'exception', labelEn: 'Close Exception',    labelAr: 'إغلاق استثناء',         icon: 'pi pi-times-circle',  requiredPermissions: ['exception.record.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Remediation ───────────────────────────────────────────────────────
  { actionCode: 'remediation.plan.create',   moduleCode: 'remediation', labelEn: 'Create Remediation',   labelAr: 'إنشاء خطة معالجة',      icon: 'pi pi-plus',          requiredPermissions: ['remediation.plan.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'remediation.plan.update',   moduleCode: 'remediation', labelEn: 'Update Remediation',   labelAr: 'تحديث خطة المعالجة',    icon: 'pi pi-pencil',        requiredPermissions: ['remediation.plan.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'remediation.plan.assign',   moduleCode: 'remediation', labelEn: 'Assign Remediation',   labelAr: 'تكليف بالمعالجة',       icon: 'pi pi-user-plus',     requiredPermissions: ['remediation.plan.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'remediation.plan.complete', moduleCode: 'remediation', labelEn: 'Complete Remediation', labelAr: 'إتمام المعالجة',        icon: 'pi pi-check-circle',  requiredPermissions: ['remediation.plan.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'remediation.plan.verify',   moduleCode: 'remediation', labelEn: 'Verify Remediation',   labelAr: 'التحقق من المعالجة',    icon: 'pi pi-verified',      requiredPermissions: ['remediation.plan.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── Action ────────────────────────────────────────────────────────────
  { actionCode: 'action.item.create',   moduleCode: 'action', labelEn: 'Create Action',   labelAr: 'إنشاء إجراء',         icon: 'pi pi-plus',          requiredPermissions: ['action.item.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'action.item.update',   moduleCode: 'action', labelEn: 'Update Action',   labelAr: 'تحديث إجراء',         icon: 'pi pi-pencil',        requiredPermissions: ['action.item.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'action.item.assign',   moduleCode: 'action', labelEn: 'Assign Action',   labelAr: 'تكليف بإجراء',        icon: 'pi pi-user-plus',     requiredPermissions: ['action.item.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'action.item.complete', moduleCode: 'action', labelEn: 'Complete Action', labelAr: 'إتمام الإجراء',       icon: 'pi pi-check-circle',  requiredPermissions: ['action.item.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'action.item.close',    moduleCode: 'action', labelEn: 'Close Action',    labelAr: 'إغلاق الإجراء',       icon: 'pi pi-times-circle',  requiredPermissions: ['action.item.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Training ──────────────────────────────────────────────────────────
  { actionCode: 'training.record.create',   moduleCode: 'training', labelEn: 'Create Training',    labelAr: 'إنشاء تدريب',         icon: 'pi pi-plus',          requiredPermissions: ['training.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'training.record.assign',   moduleCode: 'training', labelEn: 'Assign Training',    labelAr: 'تكليف بالتدريب',      icon: 'pi pi-user-plus',     requiredPermissions: ['training.record.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'training.record.complete', moduleCode: 'training', labelEn: 'Complete Training',  labelAr: 'إتمام التدريب',       icon: 'pi pi-check-circle',  requiredPermissions: ['training.record.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'training.record.certify',  moduleCode: 'training', labelEn: 'Certify Trainee',    labelAr: 'منح شهادة التدريب',   icon: 'pi pi-verified',      requiredPermissions: ['training.record.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── Foundation ────────────────────────────────────────────────────────
  { actionCode: 'foundation.org.create_team',       moduleCode: 'foundation', labelEn: 'Create Team',        labelAr: 'إنشاء فريق',            icon: 'pi pi-users',         requiredPermissions: ['foundation.org.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'foundation.org.create_department', moduleCode: 'foundation', labelEn: 'Create Department',  labelAr: 'إنشاء إدارة',           icon: 'pi pi-building',      requiredPermissions: ['foundation.org.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'foundation.org.assign_role',       moduleCode: 'foundation', labelEn: 'Assign Role',        labelAr: 'إسناد دور',             icon: 'pi pi-id-card',       requiredPermissions: ['foundation.org.write'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'foundation.org.update_org',        moduleCode: 'foundation', labelEn: 'Update Org Structure', labelAr: 'تحديث الهيكل التنظيمي', icon: 'pi pi-sitemap',      requiredPermissions: ['foundation.org.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Reporting ─────────────────────────────────────────────────────────
  { actionCode: 'reporting.document.create_report', moduleCode: 'reporting', labelEn: 'Create Report',    labelAr: 'إنشاء تقرير',           icon: 'pi pi-plus',          requiredPermissions: ['reporting.document.write'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'reporting.document.schedule',      moduleCode: 'reporting', labelEn: 'Schedule Report',  labelAr: 'جدولة تقرير',           icon: 'pi pi-calendar',      requiredPermissions: ['reporting.document.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'reporting.document.export',        moduleCode: 'reporting', labelEn: 'Export Report',    labelAr: 'تصدير تقرير',           icon: 'pi pi-download',      requiredPermissions: ['reporting.report.read'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'reporting.document.share',         moduleCode: 'reporting', labelEn: 'Share Report',     labelAr: 'مشاركة تقرير',          icon: 'pi pi-share-alt',     requiredPermissions: ['reporting.document.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },

  // ── Qiyas (Assessment) ───────────────────────────────────────────────
  { actionCode: 'qiyas.assessment.create_assessment', moduleCode: 'qiyas', labelEn: 'Create Assessment',  labelAr: 'إنشاء تقييم قياس',      icon: 'pi pi-plus',          requiredPermissions: ['qiyas.assessment.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'qiyas.assessment.score',             moduleCode: 'qiyas', labelEn: 'Score Assessment',   labelAr: 'تسجيل درجة التقييم',    icon: 'pi pi-chart-bar',     requiredPermissions: ['qiyas.assessment.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'qiyas.assessment.approve_score',     moduleCode: 'qiyas', labelEn: 'Approve Score',      labelAr: 'اعتماد نتيجة التقييم',  icon: 'pi pi-check',         requiredPermissions: ['qiyas.assessment.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'qiyas.assessment.publish',           moduleCode: 'qiyas', labelEn: 'Publish Assessment', labelAr: 'نشر التقييم',           icon: 'pi pi-send',          requiredPermissions: ['qiyas.assessment.approve'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── AI Governance ─────────────────────────────────────────────────────
  { actionCode: 'ai-governance.model.register_model',    moduleCode: 'ai-governance', labelEn: 'Register Model',      labelAr: 'تسجيل نموذج ذكاء',        icon: 'pi pi-plus',          requiredPermissions: ['ai.governance.write'],   sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'ai-governance.model.assess_risk',       moduleCode: 'ai-governance', labelEn: 'Assess Model Risk',   labelAr: 'تقييم مخاطر النموذج',     icon: 'pi pi-exclamation-triangle', requiredPermissions: ['ai.governance.write'], sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'ai-governance.model.approve_deployment', moduleCode: 'ai-governance', labelEn: 'Approve Deployment', labelAr: 'اعتماد نشر النموذج',      icon: 'pi pi-check',         requiredPermissions: ['ai-governance.model.approve'], sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'ai-governance.model.retire',            moduleCode: 'ai-governance', labelEn: 'Retire Model',        labelAr: 'إيقاف النموذج',           icon: 'pi pi-power-off',     requiredPermissions: ['ai.governance.write'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Integrations ──────────────────────────────────────────────────────
  { actionCode: 'integrations.connector.create_connector', moduleCode: 'integrations', labelEn: 'Create Connector',   labelAr: 'إنشاء موصل تكامل',       icon: 'pi pi-plus',          requiredPermissions: ['integrations.connector.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'integrations.connector.configure',        moduleCode: 'integrations', labelEn: 'Configure Connector', labelAr: 'ضبط إعدادات الموصل',     icon: 'pi pi-cog',           requiredPermissions: ['integrations.connector.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'integrations.connector.test',             moduleCode: 'integrations', labelEn: 'Test Connector',     labelAr: 'اختبار الموصل',          icon: 'pi pi-play',          requiredPermissions: ['integrations.connector.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'integrations.connector.activate',         moduleCode: 'integrations', labelEn: 'Activate Connector', labelAr: 'تفعيل الموصل',           icon: 'pi pi-check-circle',  requiredPermissions: ['integrations.connector.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'integrations.connector.deactivate',       moduleCode: 'integrations', labelEn: 'Deactivate Connector', labelAr: 'تعطيل الموصل',         icon: 'pi pi-ban',           requiredPermissions: ['integrations.connector.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },

  // ── Notification ──────────────────────────────────────────────────────
  { actionCode: 'notification.alert.create_template',    moduleCode: 'notification', labelEn: 'Create Template',     labelAr: 'إنشاء قالب إشعار',       icon: 'pi pi-plus',          requiredPermissions: ['notification.config.write'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'notification.alert.send',               moduleCode: 'notification', labelEn: 'Send Notification',   labelAr: 'إرسال إشعار',            icon: 'pi pi-send',          requiredPermissions: ['notification.config.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'notification.alert.configure_channel',  moduleCode: 'notification', labelEn: 'Configure Channel',   labelAr: 'ضبط قناة الإشعارات',     icon: 'pi pi-cog',           requiredPermissions: ['notification.config.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },

  // ── Analytics ─────────────────────────────────────────────────────────
  { actionCode: 'analytics.report.create_dashboard', moduleCode: 'analytics', labelEn: 'Create Dashboard',  labelAr: 'إنشاء لوحة تحليلات',    icon: 'pi pi-plus',          requiredPermissions: ['analytics.report.write'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'analytics.report.create_kpi',       moduleCode: 'analytics', labelEn: 'Create KPI',        labelAr: 'إنشاء مؤشر أداء',       icon: 'pi pi-chart-line',    requiredPermissions: ['analytics.report.write'],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'analytics.report.export',           moduleCode: 'analytics', labelEn: 'Export Analytics',  labelAr: 'تصدير التحليلات',        icon: 'pi pi-download',      requiredPermissions: ['analytics.report.read'],   sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'analytics.report.configure',        moduleCode: 'analytics', labelEn: 'Configure Analytics', labelAr: 'ضبط إعدادات التحليلات', icon: 'pi pi-cog',         requiredPermissions: ['analytics.report.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },

  // ── Team ──────────────────────────────────────────────────────────────
  { actionCode: 'team.member.create_team',   moduleCode: 'team', labelEn: 'Create Team',     labelAr: 'إنشاء فريق عمل',        icon: 'pi pi-users',         requiredPermissions: ['team.member.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'team.member.add_member',    moduleCode: 'team', labelEn: 'Add Member',      labelAr: 'إضافة عضو',             icon: 'pi pi-user-plus',     requiredPermissions: ['team.member.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'team.member.remove_member', moduleCode: 'team', labelEn: 'Remove Member',   labelAr: 'إزالة عضو',             icon: 'pi pi-user-minus',    requiredPermissions: ['team.member.write'],  sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'team.member.assign_lead',   moduleCode: 'team', labelEn: 'Assign Team Lead', labelAr: 'تعيين قائد الفريق',    icon: 'pi pi-star',          requiredPermissions: ['team.member.write'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── Admin ─────────────────────────────────────────────────────────────
  { actionCode: 'admin.system.manage_users',       moduleCode: 'admin', labelEn: 'Manage Users',        labelAr: 'إدارة المستخدمين',       icon: 'pi pi-users',         requiredPermissions: ['admin.system.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'admin.system.manage_roles',       moduleCode: 'admin', labelEn: 'Manage Roles',        labelAr: 'إدارة الأدوار',          icon: 'pi pi-id-card',       requiredPermissions: ['admin.system.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'admin.system.configure_platform', moduleCode: 'admin', labelEn: 'Configure Platform',  labelAr: 'ضبط إعدادات المنصة',     icon: 'pi pi-cog',           requiredPermissions: ['admin.system.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'admin.system.manage_modules',     moduleCode: 'admin', labelEn: 'Manage Modules',      labelAr: 'إدارة الوحدات',          icon: 'pi pi-th-large',      requiredPermissions: ['admin.system.manage'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },

  // ── BCP (Business Continuity) ─────────────────────────────────────────
  { actionCode: 'bcp.plan.create_plan',    moduleCode: 'bcp', labelEn: 'Create BCP Plan',      labelAr: 'إنشاء خطة استمرارية',    icon: 'pi pi-plus',          requiredPermissions: ['bcp.plan.write'],    sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
  { actionCode: 'bcp.plan.activate',       moduleCode: 'bcp', labelEn: 'Activate Plan',        labelAr: 'تفعيل الخطة',            icon: 'pi pi-check-circle',  requiredPermissions: ['bcp.plan.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'bcp.plan.test',           moduleCode: 'bcp', labelEn: 'Test Plan',            labelAr: 'اختبار الخطة',           icon: 'pi pi-play',          requiredPermissions: ['bcp.plan.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'bcp.plan.approve',        moduleCode: 'bcp', labelEn: 'Approve Plan',         labelAr: 'اعتماد الخطة',           icon: 'pi pi-check',         requiredPermissions: ['bcp.plan.approve'],  sodSensitive: true,  aiEnabled: false, dangerLevel: 'moderate' },
  { actionCode: 'bcp.plan.decommission',   moduleCode: 'bcp', labelEn: 'Decommission Plan',    labelAr: 'إيقاف الخطة نهائيًا',    icon: 'pi pi-power-off',     requiredPermissions: ['bcp.plan.write'],    sodSensitive: false, aiEnabled: false, dangerLevel: 'destructive' },

  // ── Generic ────────────────────────────────────────────────────────────
  { actionCode: 'export',     moduleCode: '*', labelEn: 'Export',     labelAr: 'تصدير',     icon: 'download',  requiredPermissions: [],  sodSensitive: false, aiEnabled: false, dangerLevel: 'safe' },
  { actionCode: 'assign',     moduleCode: '*', labelEn: 'Assign',     labelAr: 'تعيين',     icon: 'user-plus', requiredPermissions: [],  sodSensitive: false, aiEnabled: true,  dangerLevel: 'safe' },
];

/** Lookup by action code */
export const ACTION_BY_CODE = new Map(
  ACTION_REGISTRY.map(a => [a.actionCode, a])
);
