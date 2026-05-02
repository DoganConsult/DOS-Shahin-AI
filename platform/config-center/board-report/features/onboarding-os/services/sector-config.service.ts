/**
 * SectorConfigService — Single source of truth for ISIC4 sector data.
 * Eliminates duplication across registration-hero, review-diff, and shell-page.
 */
import { Injectable } from '@angular/core';

export interface SectorOption {
  value: string;
  en: string;
  ar: string;
  label?: string;
}

const ISIC4_SECTORS: SectorOption[] = [
  { value: 'A', en: 'Agriculture, forestry and fishing', ar: 'الزراعة والحراجة وصيد الأسماك' },
  { value: 'B', en: 'Mining and quarrying', ar: 'التعدين واستغلال المحاجر' },
  { value: 'C', en: 'Manufacturing', ar: 'الصناعة التحويلية' },
  { value: 'D', en: 'Electricity, gas, steam and air conditioning supply', ar: 'إمدادات الكهرباء والغاز والبخار وتكييف الهواء' },
  { value: 'E', en: 'Water supply; sewerage, waste management', ar: 'إمدادات المياه وأنشطة الصرف وإدارة النفايات' },
  { value: 'F', en: 'Construction', ar: 'التشييد' },
  { value: 'G', en: 'Wholesale and retail trade', ar: 'تجارة الجملة والتجزئة' },
  { value: 'H', en: 'Transportation and storage', ar: 'النقل والتخزين' },
  { value: 'I', en: 'Accommodation and food service activities', ar: 'أنشطة خدمات الإقامة والطعام' },
  { value: 'J', en: 'Information and communication', ar: 'المعلومات والاتصالات' },
  { value: 'K', en: 'Financial and insurance activities', ar: 'الأنشطة المالية وأنشطة التأمين' },
  { value: 'L', en: 'Real estate activities', ar: 'الأنشطة العقارية' },
  { value: 'M', en: 'Professional, scientific and technical activities', ar: 'الأنشطة المهنية والعلمية والتقنية' },
  { value: 'N', en: 'Administrative and support service activities', ar: 'الأنشطة الإدارية وخدمات الدعم' },
  { value: 'O', en: 'Public administration and defence', ar: 'الإدارة العامة والدفاع' },
  { value: 'P', en: 'Education', ar: 'التعليم' },
  { value: 'Q', en: 'Human health and social work activities', ar: 'أنشطة صحة الإنسان والعمل الاجتماعي' },
  { value: 'R', en: 'Arts, entertainment and recreation', ar: 'الفنون والترفيه والتسلية' },
  { value: 'S', en: 'Other service activities', ar: 'أنشطة الخدمات الأخرى' },
  { value: 'T', en: 'Activities of households as employers', ar: 'أنشطة الأسر المعيشية' },
  { value: 'U', en: 'Activities of extraterritorial organizations', ar: 'أنشطة المنظمات الدولية' },
];

@Injectable({ providedIn: 'root' })
export class SectorConfigService {
  private readonly sectors = ISIC4_SECTORS;

  /** Get all sectors with labels for the given language */
  getSectorOptions(lang: 'en' | 'ar' = 'en'): SectorOption[] {
    return this.sectors.map(s => ({
      ...s,
      label: lang === 'ar' ? s.ar : s.en,
    }));
  }

  /** Get sector name by code */
  getSectorName(code: string, lang: 'en' | 'ar' = 'en'): string {
    const sector = this.sectors.find(s => s.value === code);
    if (!sector) return code;
    return lang === 'ar' ? sector.ar : sector.en;
  }

  /** Get all sector codes */
  getSectorCodes(): string[] {
    return this.sectors.map(s => s.value);
  }
}
