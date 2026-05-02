export const CONTROLS_SEED_CATEGORIES = [
  { code: 'general', nameEn: 'General', nameAr: 'عام', sortOrder: 1 },
  { code: 'operational', nameEn: 'Operational', nameAr: 'تشغيلي', sortOrder: 2 },
  { code: 'technical', nameEn: 'Technical', nameAr: 'تقني', sortOrder: 3 },
  { code: 'regulatory', nameEn: 'Regulatory', nameAr: 'تنظيمي', sortOrder: 4 },
] as const;

export const CONTROLS_DEFAULT_SETTINGS = {
  autoArchiveEnabled: false,
  autoArchiveDays: 730,
  requireApprovalForClose: true,
  requireEvidenceForApproval: true,
  notifyOnStatusChange: true,
  defaultSlaHours: 24,
} as const;
