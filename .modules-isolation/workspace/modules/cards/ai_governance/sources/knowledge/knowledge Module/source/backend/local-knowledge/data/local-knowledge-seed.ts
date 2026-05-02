import { catchHandler, EC } from '@dos/platform-core/resilience';
export interface LocalKnowledgeSeedData {
  defaultConfigs: Record<string, unknown>;
  sourceTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  chunkStrategies: Array<{ code: string; labelEn: string; labelAr: string; defaultSize: number }>;
}

export function getLocalKnowledgeSeedData(): LocalKnowledgeSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'local-knowledge',
      embeddingModel: 'text-embedding-3-small',
      defaultChunkStrategy: 'paragraph',
      defaultChunkSize: 512,
      chunkOverlap: 50,
      maxDocumentSizeMb: 50,
      autoSyncEnabled: true,
      syncIntervalHours: 4,
      staleDocumentDays: 90,
    },
    sourceTypes: [
      { code: 'upload', labelEn: 'File Upload', labelAr: 'رفع ملف' },
      { code: 'url', labelEn: 'URL Import', labelAr: 'استيراد رابط' },
      { code: 'api', labelEn: 'API Integration', labelAr: 'تكامل API' },
      { code: 'manual', labelEn: 'Manual Entry', labelAr: 'إدخال يدوي' },
      { code: 'sharepoint', labelEn: 'SharePoint', labelAr: 'شيربوينت' },
      { code: 'confluence', labelEn: 'Confluence', labelAr: 'كونفلونس' },
    ],
    chunkStrategies: [
      { code: 'paragraph', labelEn: 'Paragraph', labelAr: 'فقرة', defaultSize: 512 },
      { code: 'sentence', labelEn: 'Sentence', labelAr: 'جملة', defaultSize: 256 },
      { code: 'fixed_size', labelEn: 'Fixed Size', labelAr: 'حجم ثابت', defaultSize: 512 },
      { code: 'semantic', labelEn: 'Semantic', labelAr: 'دلالي', defaultSize: 1024 },
    ],
  };
}

export async function seedLocalKnowledgeModule(tenantId: string, schema: string): Promise<void> {
  const data = getLocalKnowledgeSeedData();
  const { safeQuery } = await import('../../../config/database.js');
  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['local-knowledge', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
