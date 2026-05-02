/**
 * Compliance Workspace — Bilingual Labels (EN / AR)
 */

export interface ComplianceLabels {
  pageTitle: string;
  pageSubtitle: string;
  overview: string;
  frameworks: string;
  domains: string;
  obligations: string;
  gapAssessment: string;
  roadmap: string;
  overallScore: string;
  activeFrameworks: string;
  openGaps: string;
  criticalGaps: string;
  obligationsCovered: string;
  controlsMapped: string;
  evidenceCoverage: string;
  evidenceQualityTierA: string;
  evidenceFreshness: string;
  auditReadiness: string;
  overdueActions: string;
  frameworkPosture: string;
  domainHealth: string;
  priorityIssues: string;
  complianceTrend: string;
  score: string;
  status: string;
  controls: string;
  evidence: string;
  owner: string;
  category: string;
  action: string;
  actions: string;
  code: string;
  name: string;
  domain: string;
  framework: string;
  coverage: string;
  severity: string;
  dueDate: string;
  description: string;
  obligation: string;
  implemented: string;
  comparison: string;
  coverageMatrix: string;
  heatView: string;
  tableView: string;
  details: string;
  close: string;
  createRemediation: string;
  startRemediation: string;
  startAssessment: string;
  addFramework: string;
  exportReport: string;
  generateRoadmap: string;
  auditReadinessView: string;
  filterByFramework: string;
  allFrameworks: string;
  phase: string;
  milestone: string;
  tasks: string;
  completion: string;
  totalTasks: string;
  completedTasks: string;
  readinessScore: string;
  tested: string;
  withEvidence: string;
  fullyReady: string;
  covered: string;
  partiallyCovered: string;
  uncovered: string;
  notAssessed: string;
  open: string;
  accepted: string;
  inProgress: string;
  awaitingValidation: string;
  closed: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  noData: string;
  loading: string;
  emptyFrameworks: string;
  emptyDomains: string;
  emptyObligations: string;
  emptyGaps: string;
  emptyRoadmap: string;
  enableFramework: string;
  runAssessment: string;
  viewGaps: string;
  assignOwner: string;
  mapControl: string;
  mapEvidence: string;
  validateGap: string;
  acceptRisk: string;
  closeGap: string;
  total: string;
  version: string;
  regulator: string;
  lastReview: string;
  targetDate: string;
  openDomains: string;
  openObligations: string;
  launchGapAssessment: string;
  generateActionPlan: string;
  strongest: string;
  weakest: string;
  mostOverdue: string;
  highestRisk: string;
  roadmapSummary: string;
  currentWave: string;
  nextMilestone: string;
  targetReadiness: string;
  forecast: string;
  milestones: string;
  dependencies: string;
  blockedItems: string;
  phaseFoundation: string;
  phaseControlStrengthening: string;
  phaseEvidenceMaturity: string;
  phaseAuditReadiness: string;
}

export const COMPLIANCE_LABELS_EN: ComplianceLabels = {
  pageTitle: 'Compliance',
  pageSubtitle: 'Compliance command workspace — frameworks, domains, obligations, gaps, remediation, and audit readiness',
  overview: 'Compliance Overview',
  frameworks: 'Frameworks',
  domains: 'Domains',
  obligations: 'Obligations',
  gapAssessment: 'Gap Assessment',
  roadmap: 'Compliance Roadmap',
  overallScore: 'Compliance Score',
  activeFrameworks: 'Active Frameworks',
  openGaps: 'Open Gaps',
  criticalGaps: 'Critical Gaps',
  obligationsCovered: 'Obligations Covered',
  controlsMapped: 'Controls Mapped',
  evidenceCoverage: 'Evidence Coverage',
  evidenceQualityTierA: 'Evidence Tier A',
  evidenceFreshness: 'Evidence Freshness',
  auditReadiness: 'Audit Readiness',
  overdueActions: 'Overdue Actions',
  frameworkPosture: 'Framework Posture',
  domainHealth: 'Domain Health',
  priorityIssues: 'Priority Issues',
  complianceTrend: 'Compliance Trend',
  score: 'Score',
  status: 'Status',
  controls: 'Controls',
  evidence: 'Evidence',
  owner: 'Owner',
  category: 'Category',
  action: 'Action',
  actions: 'Actions',
  code: 'Code',
  name: 'Name',
  domain: 'Domain',
  framework: 'Framework',
  coverage: 'Coverage',
  severity: 'Severity',
  dueDate: 'Due Date',
  description: 'Description',
  obligation: 'Obligation',
  implemented: 'Implemented',
  comparison: 'Compare Frameworks',
  coverageMatrix: 'Coverage Matrix',
  heatView: 'Heat View',
  tableView: 'Table View',
  details: 'Details',
  close: 'Close',
  createRemediation: 'Create Remediation',
  startRemediation: 'Start Remediation',
  startAssessment: 'Start Assessment',
  addFramework: 'Add Framework',
  exportReport: 'Export Report',
  generateRoadmap: 'Generate Roadmap',
  auditReadinessView: 'Audit Readiness',
  filterByFramework: 'Filter by framework',
  allFrameworks: 'All Frameworks',
  phase: 'Phase',
  milestone: 'Milestone',
  tasks: 'Tasks',
  completion: 'Completion',
  totalTasks: 'Total Tasks',
  completedTasks: 'Completed Tasks',
  readinessScore: 'Readiness Score',
  tested: 'Tested',
  withEvidence: 'With Evidence',
  fullyReady: 'Fully Ready',
  covered: 'Covered',
  partiallyCovered: 'Partially Covered',
  uncovered: 'Uncovered',
  notAssessed: 'Not Assessed',
  open: 'Open',
  accepted: 'Accepted',
  inProgress: 'In Progress',
  awaitingValidation: 'Awaiting Validation',
  closed: 'Closed',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  noData: 'No data available',
  loading: 'Loading…',
  emptyFrameworks: 'No frameworks are active yet. Enable frameworks from Onboarding scope.',
  emptyDomains: 'Framework domains will appear after framework initialization.',
  emptyObligations: 'No obligation data available. Assessments must be run first.',
  emptyGaps: 'No open gaps detected. Review assessment coverage.',
  emptyRoadmap: 'No compliance roadmap generated yet.',
  enableFramework: 'Enable Framework',
  runAssessment: 'Run Assessment',
  viewGaps: 'View Gaps',
  assignOwner: 'Assign Owner',
  mapControl: 'Map Control',
  mapEvidence: 'Map Evidence',
  validateGap: 'Validate',
  acceptRisk: 'Accept Risk',
  closeGap: 'Close Gap',
  total: 'Total',
  version: 'Version',
  regulator: 'Regulator',
  lastReview: 'Last Review',
  targetDate: 'Target Date',
  openDomains: 'Open Domains',
  openObligations: 'Open Obligations',
  launchGapAssessment: 'Launch Gap Assessment',
  generateActionPlan: 'Generate Action Plan',
  strongest: 'Strongest',
  weakest: 'Weakest',
  mostOverdue: 'Most Overdue',
  highestRisk: 'Highest Risk',
  roadmapSummary: 'Roadmap Summary',
  currentWave: 'Current Wave',
  nextMilestone: 'Next Milestone',
  targetReadiness: 'Target Readiness',
  forecast: 'Forecast',
  milestones: 'Milestones',
  dependencies: 'Dependencies',
  blockedItems: 'Blocked Items',
  phaseFoundation: 'Foundational Compliance',
  phaseControlStrengthening: 'Control Strengthening',
  phaseEvidenceMaturity: 'Evidence Maturity',
  phaseAuditReadiness: 'Audit Readiness',
};

export const COMPLIANCE_LABELS_AR: ComplianceLabels = {
  pageTitle: 'الالتزام',
  pageSubtitle: 'مساحة عمل الالتزام — الأطر، المجالات، الالتزامات، الفجوات، المعالجة، وجاهزية التدقيق',
  overview: 'نظرة عامة على الالتزام',
  frameworks: 'الأطر',
  domains: 'المجالات',
  obligations: 'الالتزامات',
  gapAssessment: 'تقييم الفجوات',
  roadmap: 'خارطة طريق الالتزام',
  overallScore: 'درجة الالتزام',
  activeFrameworks: 'الأطر النشطة',
  openGaps: 'الفجوات المفتوحة',
  criticalGaps: 'الفجوات الحرجة',
  obligationsCovered: 'الالتزامات المغطاة',
  controlsMapped: 'الضوابط المربوطة',
  evidenceCoverage: 'تغطية الأدلة',
  evidenceQualityTierA: 'أدلة المستوى أ',
  evidenceFreshness: 'حداثة الأدلة',
  auditReadiness: 'جاهزية التدقيق',
  overdueActions: 'الإجراءات المتأخرة',
  frameworkPosture: 'وضع الأطر',
  domainHealth: 'صحة المجالات',
  priorityIssues: 'قضايا ذات أولوية',
  complianceTrend: 'اتجاه الالتزام',
  score: 'الدرجة',
  status: 'الحالة',
  controls: 'الضوابط',
  evidence: 'الأدلة',
  owner: 'المسؤول',
  category: 'الفئة',
  action: 'إجراء',
  actions: 'الإجراءات',
  code: 'الكود',
  name: 'الاسم',
  domain: 'المجال',
  framework: 'الإطار',
  coverage: 'التغطية',
  severity: 'الخطورة',
  dueDate: 'تاريخ الاستحقاق',
  description: 'الوصف',
  obligation: 'الالتزام',
  implemented: 'مطبّق',
  comparison: 'مقارنة الأطر',
  coverageMatrix: 'مصفوفة التغطية',
  heatView: 'عرض حراري',
  tableView: 'عرض جدول',
  details: 'التفاصيل',
  close: 'إغلاق',
  createRemediation: 'إنشاء معالجة',
  startRemediation: 'بدء المعالجة',
  startAssessment: 'بدء التقييم',
  addFramework: 'إضافة إطار',
  exportReport: 'تصدير التقرير',
  generateRoadmap: 'إنشاء خارطة الطريق',
  auditReadinessView: 'جاهزية التدقيق',
  filterByFramework: 'تصفية حسب الإطار',
  allFrameworks: 'جميع الأطر',
  phase: 'المرحلة',
  milestone: 'المعلم',
  tasks: 'المهام',
  completion: 'الإنجاز',
  totalTasks: 'إجمالي المهام',
  completedTasks: 'المهام المكتملة',
  readinessScore: 'درجة الجاهزية',
  tested: 'مختبرة',
  withEvidence: 'مع أدلة',
  fullyReady: 'جاهزة بالكامل',
  covered: 'مغطاة',
  partiallyCovered: 'مغطاة جزئياً',
  uncovered: 'غير مغطاة',
  notAssessed: 'لم يتم التقييم',
  open: 'مفتوحة',
  accepted: 'مقبولة',
  inProgress: 'قيد التنفيذ',
  awaitingValidation: 'بانتظار التحقق',
  closed: 'مغلقة',
  critical: 'حرجة',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
  noData: 'لا توجد بيانات',
  loading: 'جار التحميل…',
  emptyFrameworks: 'لا توجد أطر نشطة بعد. فعّل الأطر من نطاق الإعداد.',
  emptyDomains: 'ستظهر مجالات الإطار بعد تهيئة الأطر.',
  emptyObligations: 'لا توجد بيانات التزامات. يجب تشغيل التقييمات أولاً.',
  emptyGaps: 'لم يتم اكتشاف فجوات مفتوحة. راجع تغطية التقييم.',
  emptyRoadmap: 'لم يتم إنشاء خارطة طريق الالتزام بعد.',
  enableFramework: 'تفعيل إطار',
  runAssessment: 'تشغيل التقييم',
  viewGaps: 'عرض الفجوات',
  assignOwner: 'تعيين مسؤول',
  mapControl: 'ربط ضابط',
  mapEvidence: 'ربط دليل',
  validateGap: 'تحقق',
  acceptRisk: 'قبول المخاطرة',
  closeGap: 'إغلاق الفجوة',
  total: 'الإجمالي',
  version: 'الإصدار',
  regulator: 'الجهة التنظيمية',
  lastReview: 'آخر مراجعة',
  targetDate: 'التاريخ المستهدف',
  openDomains: 'فتح المجالات',
  openObligations: 'فتح الالتزامات',
  launchGapAssessment: 'بدء تقييم الفجوات',
  generateActionPlan: 'إنشاء خطة عمل',
  strongest: 'الأقوى',
  weakest: 'الأضعف',
  mostOverdue: 'الأكثر تأخراً',
  highestRisk: 'الأعلى خطورة',
  roadmapSummary: 'ملخص خارطة الطريق',
  currentWave: 'الموجة الحالية',
  nextMilestone: 'المعلم التالي',
  targetReadiness: 'الجاهزية المستهدفة',
  forecast: 'التوقعات',
  milestones: 'المعالم',
  dependencies: 'التبعيات',
  blockedItems: 'العناصر المحظورة',
  phaseFoundation: 'الالتزام الأساسي',
  phaseControlStrengthening: 'تعزيز الضوابط',
  phaseEvidenceMaturity: 'نضج الأدلة',
  phaseAuditReadiness: 'جاهزية التدقيق',
};
