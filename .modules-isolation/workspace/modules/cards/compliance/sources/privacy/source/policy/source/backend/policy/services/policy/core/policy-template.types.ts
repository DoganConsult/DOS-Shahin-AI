import { safeQuery } from "@dos/db";

export interface PolicyTemplateVar {
  key: string;
  label_en: string;
  label_ar: string;
  default_value: string;
  source?: string;
}

export interface PolicyTemplate {
  template_key: string;
  title_en: string;
  title_ar: string;
  category: string;
  description_en: string;
  description_ar: string;
  frameworks: string[];
  sectors: string[];
  content_en: string;
  content_ar: string;
  guidance_en: string;
  guidance_ar: string;
  variables: PolicyTemplateVar[];
  review_frequency: string;
  tags: string[];
  sort_order: number;
}
