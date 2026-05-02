/**
 * Setup Wizard shared types and constants.
 *
 * Extracted from setup-wizard.component.ts so that the parent orchestrator
 * and child presentational components can share the same definitions.
 */

import type { FrameworkRecommendation, RoleRecommendation } from '@app/core/services/user-account/journey.service';

// ── Step type ──

export type SetupStep =
  | 'welcome'
  | 'company_name'
  | 'industry_sector'
  | 'employee_count'
  | 'ksa_region'
  | 'subsidiaries'
  | 'confirm'
  | 'complete';

// ── Chat message ──

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  contentEn: string;
  contentAr: string;
  timestamp: Date;
  stepId?: SetupStep;
  /** Extra data for framework/role display */
  frameworks?: FrameworkRecommendation[];
  roles?: RoleRecommendation[];
  isTyping?: boolean;
}

// ── Session persistence ──

export interface WizardSessionState {
  currentStep: SetupStep;
  companyName: string;
  selectedSector: string;
  selectedEmployeeCount: string;
  selectedRegion: string;
  subsidiaries: string[];
  messages: ChatMessage[];
}

// ── Reference data constants ──

/** Industry sectors available in the wizard (mirrors backend KSA_SECTORS categories) */
export const INDUSTRY_SECTORS: { id: string; labelEn: string; labelAr: string }[] = [
  { id: 'SEC-KSA-GOV-MIN', labelEn: 'Government Ministries', labelAr: 'الوزارات الحكومية' },
  { id: 'SEC-KSA-GOV-AUTH', labelEn: 'Government Authorities & Agencies', labelAr: 'الهيئات والمؤسسات الحكومية' },
  { id: 'SEC-KSA-GOV-MUN', labelEn: 'Municipalities & Regional Government', labelAr: 'الأمانات والبلديات والحكم المحلي' },
  { id: 'SEC-KSA-FIN-BANK', labelEn: 'Banking & Financial Services', labelAr: 'البنوك والخدمات المالية' },
  { id: 'SEC-KSA-FIN-INS', labelEn: 'Insurance', labelAr: 'التأمين' },
  { id: 'SEC-KSA-FIN-FINTECH', labelEn: 'Fintech & Digital Payments', labelAr: 'التقنية المالية والمدفوعات الرقمية' },
  { id: 'SEC-KSA-FIN-CAPITAL', labelEn: 'Capital Markets & Securities', labelAr: 'أسواق المال والأوراق المالية' },
  { id: 'SEC-KSA-HEALTH-HOSP', labelEn: 'Hospitals & Healthcare Providers', labelAr: 'المستشفيات ومقدمي الرعاية الصحية' },
  { id: 'SEC-KSA-HEALTH-PHARMA', labelEn: 'Pharmaceuticals & Life Sciences', labelAr: 'الأدوية وعلوم الحياة' },
  { id: 'SEC-KSA-TELCO-ISP', labelEn: 'Telecommunications', labelAr: 'الاتصالات' },
  { id: 'SEC-KSA-ENERGY-OG', labelEn: 'Oil & Gas', labelAr: 'النفط والغاز' },
  { id: 'SEC-KSA-ENERGY-UTIL', labelEn: 'Utilities & Power', labelAr: 'المرافق والطاقة' },
  { id: 'SEC-KSA-EDU-UNI', labelEn: 'Education & Universities', labelAr: 'التعليم والجامعات' },
  { id: 'SEC-KSA-RETAIL-ECOM', labelEn: 'Retail & E-Commerce', labelAr: 'التجزئة والتجارة الإلكترونية' },
  { id: 'SEC-KSA-TECH-SAAS', labelEn: 'Technology & SaaS', labelAr: 'التقنية والبرمجيات' },
  { id: 'SEC-KSA-TRANSPORT-AIR', labelEn: 'Aviation & Transport', labelAr: 'الطيران والنقل' },
  { id: 'SEC-KSA-CONSTRUCT-GEN', labelEn: 'Construction & Real Estate', labelAr: 'البناء والعقارات' },
  { id: 'SEC-KSA-TOURISM-HOTEL', labelEn: 'Tourism & Hospitality', labelAr: 'السياحة والضيافة' },
];

export const EMPLOYEE_COUNTS: { id: string; labelEn: string; labelAr: string }[] = [
  { id: '1-50', labelEn: '1-50 employees', labelAr: '١–٥٠ موظف' },
  { id: '51-200', labelEn: '51-200 employees', labelAr: '٥١–٢٠٠ موظف' },
  { id: '201-1000', labelEn: '201-1,000 employees', labelAr: '٢٠١–١٬٠٠٠ موظف' },
  { id: '1001-5000', labelEn: '1,001-5,000 employees', labelAr: '١٬٠٠١–٥٬٠٠٠ موظف' },
  { id: '5000+', labelEn: '5,000+ employees', labelAr: '٥٬٠٠٠+ موظف' },
];

export const KSA_REGIONS: { id: string; labelEn: string; labelAr: string }[] = [
  { id: 'riyadh', labelEn: 'Riyadh Region', labelAr: 'منطقة الرياض' },
  { id: 'makkah', labelEn: 'Makkah Region', labelAr: 'منطقة مكة المكرمة' },
  { id: 'madinah', labelEn: 'Madinah Region', labelAr: 'منطقة المدينة المنورة' },
  { id: 'eastern', labelEn: 'Eastern Province', labelAr: 'المنطقة الشرقية' },
  { id: 'qassim', labelEn: 'Qassim Region', labelAr: 'منطقة القصيم' },
  { id: 'asir', labelEn: 'Asir Region', labelAr: 'منطقة عسير' },
  { id: 'tabuk', labelEn: 'Tabuk Region', labelAr: 'منطقة تبوك' },
  { id: 'hail', labelEn: 'Hail Region', labelAr: 'منطقة حائل' },
  { id: 'northern_borders', labelEn: 'Northern Borders', labelAr: 'منطقة الحدود الشمالية' },
  { id: 'jazan', labelEn: 'Jazan Region', labelAr: 'منطقة جازان' },
  { id: 'najran', labelEn: 'Najran Region', labelAr: 'منطقة نجران' },
  { id: 'baha', labelEn: 'Al Baha Region', labelAr: 'منطقة الباحة' },
  { id: 'jawf', labelEn: 'Al Jawf Region', labelAr: 'منطقة الجوف' },
];

export const SETUP_STEPS: SetupStep[] = [
  'welcome',
  'company_name',
  'industry_sector',
  'employee_count',
  'ksa_region',
  'subsidiaries',
  'confirm',
];

export const SESSION_KEY = 'shahin_setup_wizard_progress';
