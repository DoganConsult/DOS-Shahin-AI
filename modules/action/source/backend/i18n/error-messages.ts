export function errMsg(
  errorDef: string | { messageEn: string; messageAr?: string },
  locale?: any,
): string {
  if (typeof errorDef === 'string') return errorDef;
  const loc = typeof locale === 'string' ? locale : locale?.locale ?? locale?.headers?.['accept-language'];
  if (loc === 'ar' && errorDef.messageAr) return errorDef.messageAr;
  return errorDef.messageEn;
}
