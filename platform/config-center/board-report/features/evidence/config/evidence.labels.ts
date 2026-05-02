/**
 * Evidence Workspace — Bilingual Labels (EN / AR)
 */

export interface EvidenceLabels {
  pageTitle: string;
  pageSubtitle: string;
  overview: string;
  vault: string;
  requests: string;
  reviews: string;
  expiry: string;
  automatedCollection: string;
  mappings: string;
  catalog: string;
  tasks: string;
  totalEvidence: string;
  pendingReviews: string;
  overdueRequests: string;
  expiringSoon: string;
  expired: string;
  openTasks: string;
  uploadEvidence: string;
  newRequest: string;
  submitEvidence: string;
  verifyChain: string;
  chainValid: string;
  chainBroken: string;
  evidenceType: string;
  controlId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  version: string;
  submittedBy: string;
  createdAt: string;
  expiryDate: string;
  filePath: string;
  fileSize: string;
  contentHash: string;
  previousHash: string;
  chainPosition: string;
  connector: string;
  connectors: string;
  schedules: string;
  cronExpression: string;
  reminderText: string;
  assignedTo: string;
  actions: string;
  approve: string;
  reject: string;
  download: string;
  upload: string;
  newVersion: string;
  viewDetails: string;
  search: string;
  allTypes: string;
  noEvidence: string;
  noRequests: string;
  noReviews: string;
  noTasks: string;
  loading: string;
  retry: string;
  framework: string;
  control: string;
  mandatory: string;
  optional: string;
  frequency: string;
  retention: string;
  fileTypes: string;
  coverage: string;
  freshness: string;
  slaStatus: string;
  pending: string;
  overdue: string;
  acknowledged: string;
  submitted: string;
  approved: string;
  rejected: string;
  cancelled: string;
}

export const EVIDENCE_LABELS_EN: EvidenceLabels = {
  pageTitle: 'Evidence',
  pageSubtitle: 'Evidence management — vault, requests, reviews, expiry tracking, automated collection, and control mappings',
  overview: 'Overview',
  vault: 'Evidence Vault',
  requests: 'Requests',
  reviews: 'Reviews',
  expiry: 'Expiry & Coverage',
  automatedCollection: 'Automated Collection',
  mappings: 'Mappings',
  catalog: 'Catalog',
  tasks: 'Tasks',
  totalEvidence: 'Total Evidence',
  pendingReviews: 'Pending Reviews',
  overdueRequests: 'Overdue Requests',
  expiringSoon: 'Expiring Soon',
  expired: 'Expired',
  openTasks: 'Open Tasks',
  uploadEvidence: 'Upload Evidence',
  newRequest: 'New Request',
  submitEvidence: 'Submit Evidence',
  verifyChain: 'Verify Chain',
  chainValid: 'Evidence chain integrity verified — all hashes valid',
  chainBroken: 'Evidence chain broken — integrity check failed',
  evidenceType: 'Evidence Type',
  controlId: 'Control ID',
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  dueDate: 'Due Date',
  version: 'Version',
  submittedBy: 'Submitted By',
  createdAt: 'Created',
  expiryDate: 'Expiry Date',
  filePath: 'File Path',
  fileSize: 'File Size',
  contentHash: 'Content Hash',
  previousHash: 'Previous Hash',
  chainPosition: 'Chain Position',
  connector: 'Connector',
  connectors: 'Connectors',
  schedules: 'Schedules',
  cronExpression: 'Cron Expression',
  reminderText: 'Reminder',
  assignedTo: 'Assigned To',
  actions: 'Actions',
  approve: 'Approve',
  reject: 'Reject',
  download: 'Download',
  upload: 'Upload',
  newVersion: 'New Version',
  viewDetails: 'View Details',
  search: 'Search evidence',
  allTypes: 'All Types',
  noEvidence: 'No evidence uploaded yet',
  noRequests: 'No evidence requests',
  noReviews: 'No pending reviews',
  noTasks: 'No open tasks',
  loading: 'Loading…',
  retry: 'Retry',
  framework: 'Framework',
  control: 'Control',
  mandatory: 'Mandatory',
  optional: 'Optional',
  frequency: 'Frequency',
  retention: 'Retention',
  fileTypes: 'File Types',
  coverage: 'Coverage',
  freshness: 'Freshness',
  slaStatus: 'SLA Status',
  pending: 'Pending',
  overdue: 'Overdue',
  acknowledged: 'Acknowledged',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const EVIDENCE_LABELS_AR: EvidenceLabels = {
  pageTitle: 'الأدلة',
  pageSubtitle: 'إدارة الأدلة — الخزينة، الطلبات، المراجعات، تتبع الانتهاء، التجميع التلقائي، وربط الضوابط',
  overview: 'نظرة عامة',
  vault: 'خزينة الأدلة',
  requests: 'الطلبات',
  reviews: 'المراجعات',
  expiry: 'الانتهاء والتغطية',
  automatedCollection: 'التجميع التلقائي',
  mappings: 'الربط',
  catalog: 'الفهرس',
  tasks: 'المهام',
  totalEvidence: 'إجمالي الأدلة',
  pendingReviews: 'مراجعات معلقة',
  overdueRequests: 'طلبات متأخرة',
  expiringSoon: 'تنتهي قريباً',
  expired: 'منتهية الصلاحية',
  openTasks: 'مهام مفتوحة',
  uploadEvidence: 'رفع دليل',
  newRequest: 'طلب جديد',
  submitEvidence: 'تقديم دليل',
  verifyChain: 'التحقق من السلسلة',
  chainValid: 'تم التحقق من سلامة سلسلة الأدلة — جميع التجزئات صالحة',
  chainBroken: 'سلسلة الأدلة مكسورة — فشل فحص السلامة',
  evidenceType: 'نوع الدليل',
  controlId: 'معرّف الضابط',
  title: 'العنوان',
  description: 'الوصف',
  status: 'الحالة',
  priority: 'الأولوية',
  dueDate: 'تاريخ الاستحقاق',
  version: 'الإصدار',
  submittedBy: 'مقدّم من',
  createdAt: 'تاريخ الإنشاء',
  expiryDate: 'تاريخ الانتهاء',
  filePath: 'مسار الملف',
  fileSize: 'حجم الملف',
  contentHash: 'تجزئة المحتوى',
  previousHash: 'التجزئة السابقة',
  chainPosition: 'موضع السلسلة',
  connector: 'الموصل',
  connectors: 'الموصلات',
  schedules: 'الجداول',
  cronExpression: 'تعبير Cron',
  reminderText: 'التذكير',
  assignedTo: 'مسند إلى',
  actions: 'الإجراءات',
  approve: 'موافقة',
  reject: 'رفض',
  download: 'تحميل',
  upload: 'رفع',
  newVersion: 'إصدار جديد',
  viewDetails: 'عرض التفاصيل',
  search: 'البحث في الأدلة',
  allTypes: 'جميع الأنواع',
  noEvidence: 'لم يتم رفع أي أدلة بعد',
  noRequests: 'لا توجد طلبات أدلة',
  noReviews: 'لا توجد مراجعات معلقة',
  noTasks: 'لا توجد مهام مفتوحة',
  loading: 'جار التحميل…',
  retry: 'إعادة المحاولة',
  framework: 'الإطار',
  control: 'الضابط',
  mandatory: 'إلزامي',
  optional: 'اختياري',
  frequency: 'التكرار',
  retention: 'الاحتفاظ',
  fileTypes: 'أنواع الملفات',
  coverage: 'التغطية',
  freshness: 'الحداثة',
  slaStatus: 'حالة SLA',
  pending: 'قيد الانتظار',
  overdue: 'متأخر',
  acknowledged: 'تم الإقرار',
  submitted: 'مقدّم',
  approved: 'معتمد',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
};
