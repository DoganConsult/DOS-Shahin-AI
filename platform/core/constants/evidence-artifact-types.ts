/**
 * Canonical evidence/attachment types for GRC (policy, framework, control, risk).
 * Use these codes for "Required Evidence" (الأدلة المطلوبة) and attachment UI.
 * Align with backend and NCA assessment UI.
 */
export const EVIDENCE_ARTIFACT_TYPES = [
  { code: 'document', labelEn: 'Document', labelAr: 'وثيقة' },
  { code: 'approval_record', labelEn: 'Approval record', labelAr: 'سجل اعتماد' },
  { code: 'meeting_minutes', labelEn: 'Meeting minutes', labelAr: 'محضر اجتماع' },
  { code: 'assessment_report', labelEn: 'Assessment report', labelAr: 'تقرير تقييم' },
  { code: 'treatment_plan', labelEn: 'Treatment plan', labelAr: 'خطة معالجة' },
  { code: 'config', labelEn: 'Configuration', labelAr: 'إعدادات' },
  { code: 'log', labelEn: 'Log / audit trail', labelAr: 'سجل' },
  { code: 'training_record', labelEn: 'Training record', labelAr: 'سجل تدريب' },
  { code: 'vendor_attestation', labelEn: 'Vendor attestation', labelAr: 'إقرار المورد' },
  { code: 'screenshot', labelEn: 'Screenshot', labelAr: 'لقطة شاشة' },
] as const;

export type EvidenceArtifactTypeCode = (typeof EVIDENCE_ARTIFACT_TYPES)[number]['code'];

export const EVIDENCE_ARTIFACT_TYPE_CODES: EvidenceArtifactTypeCode[] =
  EVIDENCE_ARTIFACT_TYPES.map((t) => t.code);

export function getEvidenceTypeLabel(
  code: string,
  locale: 'en' | 'ar' = 'en'
): string {
  const t = EVIDENCE_ARTIFACT_TYPES.find((x) => x.code === code);
  return t ? (locale === 'ar' ? t.labelAr : t.labelEn) : code;
}
