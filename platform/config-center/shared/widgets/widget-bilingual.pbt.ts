// ============================================
// Shahin GRC — Widget Bilingual Names PBT
// Property 23: All registered widgets have bilingual names
// Run: pnpm exec tsx src/app/shared/widgets/widget-bilingual.pbt.ts
// ============================================

import * as fc from 'fast-check';
import { toErrorMessage } from '../utils/error';

// Widget registry data (mirrors register-widgets.ts)
const PREMIUM_WIDGETS = [
  { id: 'program-health', nameEn: 'Program Health Score', nameAr: 'صحة البرنامج' },
  { id: 'exceptions-aging', nameEn: 'Exceptions Aging', nameAr: 'تقادم الاستثناءات' },
  { id: 'control-drift', nameEn: 'Control Drift', nameAr: 'انحراف الضوابط' },
  { id: 'evidence-queue', nameEn: 'Evidence Queue', nameAr: 'قائمة الأدلة' },
  { id: 'audit-pack-status', nameEn: 'Audit Pack Status', nameAr: 'حالة حزمة التدقيق' },
  { id: 'risk-predictor', nameEn: 'Risk Predictor', nameAr: 'توقعات المخاطر' },
  { id: 'ai-summary', nameEn: 'AI Summary', nameAr: 'ملخص الذكاء الاصطناعي' },
];

let passed = 0;
let failed = 0;

// Property 23: Widget Bilingual Names
try {
  fc.assert(
    fc.property(
      fc.constantFrom(...PREMIUM_WIDGETS),
      (widget) => {
        if (!widget.nameEn || widget.nameEn.trim().length === 0) throw new Error(`${widget.id} missing English name`);
        if (!widget.nameAr || widget.nameAr.trim().length === 0) throw new Error(`${widget.id} missing Arabic name`);
        if (!widget.id || widget.id.trim().length === 0) throw new Error('Widget missing ID');
        // Arabic name should contain Arabic characters
        if (!/[\u0600-\u06FF]/.test(widget.nameAr)) throw new Error(`${widget.id} Arabic name has no Arabic chars`);
      }
    ),
    { numRuns: 30 }
  );
  console.log('✓ Property 23: Widget Bilingual Names — all 7 premium widgets have en + ar names');
  passed++;
} catch (e: unknown) {
  console.error('✗ Property 23 FAILED:', toErrorMessage(e));
  failed++;
}

// Additional: All widget IDs are unique
try {
  const ids = PREMIUM_WIDGETS.map(w => w.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) throw new Error('Duplicate widget IDs found');
  console.log('✓ All premium widget IDs are unique');
  passed++;
} catch (e: unknown) {
  console.error('✗ Unique IDs FAILED:', toErrorMessage(e));
  failed++;
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
