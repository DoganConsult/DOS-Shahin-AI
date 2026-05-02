export const KSA_AUTHORITIES = ['SAMA', 'NCA', 'CMA', 'NDMO', 'CITC', 'SDAIA', 'ZATCA', 'MOH', 'MISA'] as const;

export const KSA_FRAMEWORKS = [
  { code: 'SAMA-CSF', nameEn: 'SAMA Cyber Security Framework', nameAr: 'إطار الأمن السيبراني لساما', authority: 'SAMA' },
  { code: 'NCA-ECC', nameEn: 'NCA Essential Cybersecurity Controls', nameAr: 'ضوابط الأمن السيبراني الأساسية', authority: 'NCA' },
  { code: 'NCA-DCC', nameEn: 'NCA Data Cybersecurity Controls', nameAr: 'ضوابط أمن البيانات', authority: 'NCA' },
  { code: 'NCA-CCC', nameEn: 'NCA Cloud Cybersecurity Controls', nameAr: 'ضوابط الأمن السيبراني السحابي', authority: 'NCA' },
  { code: 'NCA-OTCC', nameEn: 'NCA OT Cybersecurity Controls', nameAr: 'ضوابط أمن التقنيات التشغيلية', authority: 'NCA' },
  { code: 'PDPL', nameEn: 'Personal Data Protection Law', nameAr: 'نظام حماية البيانات الشخصية', authority: 'SDAIA' },
  { code: 'CST', nameEn: 'Cloud Security Standard', nameAr: 'معيار أمن الحوسبة السحابية', authority: 'NCA' },
] as const;

export const OBLIGATION_STATUSES = ['draft', 'active', 'compliant', 'non_compliant', 'waived', 'archived'] as const;
export const REGULATORY_CHANGE_TYPES = ['new_regulation', 'amendment', 'guidance', 'circular', 'enforcement'] as const;

export const MATURITY_DIMENSIONS = ['governance', 'risk', 'compliance', 'technology', 'people'] as const;

export const KSA_REGULATORY_LIMITS = {
  MAX_OBLIGATIONS_PER_FRAMEWORK: 500,
  MAX_MAPPING_DEPTH: 3,
  MAX_EXPORT_ROWS: 10000,
  SNAPSHOT_RETENTION_MONTHS: 36,
} as const;
