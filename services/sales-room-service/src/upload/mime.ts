/**
 * Allowed MIME types per asset_type. Configurable via env
 * SALES_ROOM_ALLOWED_MIME (comma-separated). The default catalogue
 * matches the asset_type CHECK constraint in migration 2000.
 */

const DEFAULTS: Record<string, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  pdf: ['application/pdf'],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
  ],
  brochure: ['application/pdf'],
  onepager: ['application/pdf'],
  legal: ['application/pdf'],
  technical: ['application/pdf', 'text/markdown', 'text/plain'],
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
};

export function loadAllowedMime(): Record<string, string[]> {
  const override = process.env.SALES_ROOM_ALLOWED_MIME;
  if (!override) return DEFAULTS;
  // Format: 'pdf:application/pdf;video:video/mp4,video/webm'
  const result: Record<string, string[]> = { ...DEFAULTS };
  for (const group of override.split(';')) {
    const [type, list] = group.split(':');
    if (!type || !list) continue;
    result[type.trim()] = list.split(',').map(s => s.trim()).filter(Boolean);
  }
  return result;
}

export function isMimeAllowed(assetType: string, mime: string, table = loadAllowedMime()): boolean {
  const list = table[assetType];
  return Array.isArray(list) && list.includes(mime);
}

export function maxUploadBytes(): number {
  const v = Number(process.env.SALES_ROOM_MAX_UPLOAD_MB || '512');
  if (!Number.isFinite(v) || v <= 0) return 512 * 1024 * 1024;
  return v * 1024 * 1024;
}
