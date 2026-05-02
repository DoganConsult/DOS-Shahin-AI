import { Pipe, PipeTransform } from '@angular/core';

const FACT_NAMES: Record<string, { en: string; ar: string }> = {
  // Regulators
  'regulator.SAMA': { en: 'Central Bank (SAMA)', ar: 'البنك المركزي السعودي (ساما)' },
  'regulator.NCA': { en: 'National Cybersecurity Authority (NCA)', ar: 'الهيئة الوطنية للأمن السيبراني' },
  'regulator.CMA': { en: 'Capital Market Authority (CMA)', ar: 'هيئة السوق المالية' },
  'regulator.SDAIA': { en: 'Saudi Data & AI Authority (SDAIA)', ar: 'الهيئة السعودية للبيانات والذكاء الاصطناعي' },
  'regulator.CITC': { en: 'Communications & IT Commission (CITC)', ar: 'هيئة الاتصالات وتقنية المعلومات' },
  'regulator.CCHI': { en: 'Council of Cooperative Health Insurance', ar: 'مجلس الضمان الصحي التعاوني' },
  'regulator.MOH': { en: 'Ministry of Health', ar: 'وزارة الصحة' },
  'regulator.MOE': { en: 'Ministry of Education', ar: 'وزارة التعليم' },
  'regulator.MISA': { en: 'Ministry of Investment', ar: 'وزارة الاستثمار' },
  'regulator.ZATCA': { en: 'Zakat, Tax & Customs Authority', ar: 'هيئة الزكاة والضريبة والجمارك' },

  // Frameworks
  'framework.ISO27001': { en: 'ISO 27001 — Information Security', ar: 'آيزو 27001 — أمن المعلومات' },
  'framework.ISO22301': { en: 'ISO 22301 — Business Continuity', ar: 'آيزو 22301 — استمرارية الأعمال' },
  'framework.ISO31000': { en: 'ISO 31000 — Risk Management', ar: 'آيزو 31000 — إدارة المخاطر' },
  'framework.NIST_CSF': { en: 'NIST Cybersecurity Framework', ar: 'إطار NIST للأمن السيبراني' },
  'framework.NCA_ECC': { en: 'NCA Essential Cybersecurity Controls', ar: 'ضوابط الأمن السيبراني الأساسية' },
  'framework.NCA_CSCC': { en: 'NCA Cloud Security Controls', ar: 'ضوابط أمن الحوسبة السحابية' },
  'framework.SAMA_CSF': { en: 'SAMA Cyber Security Framework', ar: 'إطار الأمن السيبراني لساما' },
  'framework.PDPL': { en: 'Personal Data Protection Law', ar: 'نظام حماية البيانات الشخصية' },
  'framework.SOC2': { en: 'SOC 2 — Trust Services Criteria', ar: 'SOC 2 — معايير خدمات الثقة' },
  'framework.PCI_DSS': { en: 'PCI DSS — Payment Card Security', ar: 'PCI DSS — أمن بطاقات الدفع' },

  // Modules
  'module.audit': { en: 'Audit module', ar: 'وحدة التدقيق' },
  'module.risk': { en: 'Risk management module', ar: 'وحدة إدارة المخاطر' },
  'module.compliance': { en: 'Compliance module', ar: 'وحدة الامتثال' },
  'module.evidence': { en: 'Evidence collection module', ar: 'وحدة جمع الأدلة' },
  'module.policy': { en: 'Policy management module', ar: 'وحدة إدارة السياسات' },
  'module.incident': { en: 'Incident management module', ar: 'وحدة إدارة الحوادث' },
  'module.vendor': { en: 'Vendor risk module', ar: 'وحدة مخاطر الموردين' },
  'module.bcp': { en: 'Business continuity module', ar: 'وحدة استمرارية الأعمال' },
  'module.training': { en: 'Training & awareness module', ar: 'وحدة التدريب والتوعية' },
  'module.asset': { en: 'Asset management module', ar: 'وحدة إدارة الأصول' },
  'module.reporting': { en: 'Reporting module', ar: 'وحدة التقارير' },
  'module.exception': { en: 'Exception management module', ar: 'وحدة إدارة الاستثناءات' },

  // Org
  'org.complexity': { en: 'Organization complexity', ar: 'تعقيد المنظمة' },

  // Persona
  'dashboard.persona': { en: 'Operating persona', ar: 'الشخصية التشغيلية' },
};

@Pipe({
  name: 'factName',
  standalone: true,
})
export class FactNamePipe implements PipeTransform {
  transform(factCode: string, lang: 'en' | 'ar' = 'en'): string {
    const entry = FACT_NAMES[factCode];
    if (entry) return entry[lang];

    // Fallback: parse the fact_code into a readable format
    // e.g. "regulator.SAMA" → "Regulator: SAMA"
    const [category, code] = factCode.split('.');
    if (category && code) {
      const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
      return `${categoryLabel}: ${code}`;
    }
    return factCode;
  }
}
