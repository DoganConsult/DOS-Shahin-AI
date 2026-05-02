export interface KsaSector {
  code: string;
  nameEn: string;
  nameAr: string;
  parentCode?: string;
  regulators: string[];
  mandatoryFrameworks: string[];
}

export const KSA_SECTORS: KsaSector[] = [
  {
    code: 'banking',
    nameEn: 'Banking and Financial Services',
    nameAr: 'الخدمات المصرفية والمالية',
    regulators: ['SAMA', 'CMA'],
    mandatoryFrameworks: ['SAMA-CSF', 'NCA-ECC', 'PDPL'],
  },
  {
    code: 'insurance',
    nameEn: 'Insurance',
    nameAr: 'التأمين',
    regulators: ['SAMA'],
    mandatoryFrameworks: ['SAMA-CSF', 'NCA-ECC', 'PDPL'],
  },
  {
    code: 'capital_markets',
    nameEn: 'Capital Markets',
    nameAr: 'أسواق المال',
    regulators: ['CMA'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'telecom',
    nameEn: 'Telecommunications',
    nameAr: 'الاتصالات',
    regulators: ['CITC'],
    mandatoryFrameworks: ['CITC', 'NCA-ECC', 'PDPL'],
  },
  {
    code: 'government',
    nameEn: 'Government',
    nameAr: 'الجهات الحكومية',
    regulators: ['NCA', 'NDMO'],
    mandatoryFrameworks: ['NCA-ECC', 'NDMO', 'PDPL'],
  },
  {
    code: 'healthcare',
    nameEn: 'Healthcare',
    nameAr: 'الرعاية الصحية',
    regulators: ['MOH', 'CCHI'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'energy',
    nameEn: 'Energy and Utilities',
    nameAr: 'الطاقة والمرافق',
    regulators: ['ECRA'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'education',
    nameEn: 'Education',
    nameAr: 'التعليم',
    regulators: ['MOE', 'NCAAA'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'retail',
    nameEn: 'Retail and E-Commerce',
    nameAr: 'التجزئة والتجارة الإلكترونية',
    regulators: ['MCIT'],
    mandatoryFrameworks: ['PDPL'],
  },
  {
    code: 'real_estate',
    nameEn: 'Real Estate',
    nameAr: 'العقارات',
    regulators: ['REGA'],
    mandatoryFrameworks: ['PDPL'],
  },
  {
    code: 'logistics',
    nameEn: 'Logistics and Transportation',
    nameAr: 'اللوجستيات والنقل',
    regulators: ['GAL', 'GCAA'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'media',
    nameEn: 'Media and Entertainment',
    nameAr: 'الإعلام والترفيه',
    regulators: ['GCAM', 'CITC'],
    mandatoryFrameworks: ['CITC', 'PDPL'],
  },
  {
    code: 'ngo',
    nameEn: 'Non-Governmental Organizations',
    nameAr: 'المنظمات غير الحكومية',
    regulators: ['MCSA'],
    mandatoryFrameworks: ['PDPL'],
  },
  {
    code: 'startup',
    nameEn: 'Startups and Technology',
    nameAr: 'الشركات الناشئة والتكنولوجيا',
    regulators: ['MCIT', 'PIF'],
    mandatoryFrameworks: ['PDPL'],
  },
  {
    code: 'manufacturing',
    nameEn: 'Manufacturing and Industry',
    nameAr: 'التصنيع والصناعة',
    regulators: ['MISA'],
    mandatoryFrameworks: ['NCA-ECC', 'PDPL'],
  },
  {
    code: 'other',
    nameEn: 'Other',
    nameAr: 'أخرى',
    regulators: [],
    mandatoryFrameworks: ['PDPL'],
  },
];
