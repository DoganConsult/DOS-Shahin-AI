/**
 * Self-contained runner: seeds the full question bank using pg directly.
 * Usage: tsx ops/scripts/run-question-seed.ts
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc',
});

async function query(sql: string, params?: any[]) {
  return pool.query(sql, params);
}

// Import just the QUESTIONS array — no @dos/* deps needed at this scope
// We'll dynamically import the file and extract QUESTIONS
async function main() {
  // Patch the module resolution so the seed file can load
  const Module = require('module');
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...args: any[]) {
    // Stub out @dos/* modules — only safeQuery is used, and we override it
    if (request.startsWith('@dos/')) {
      if (request === '@dos/db') {
        return require.resolve('./stub-dos-db');
      }
      // Return a stub for any other @dos module
      return require.resolve('./stub-dos-db');
    }
    return originalResolve.call(this, request, ...args);
  };

  // Create stub module
  const fs = require('fs');
  const stubPath = require('path').join(__dirname, 'stub-dos-db.js');
  fs.writeFileSync(stubPath, `
    const _pool = require('pg').Pool;
    const pool = new _pool({ connectionString: process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc' });
    module.exports.safeQuery = async (sql, params) => pool.query(sql, params);
    module.exports.query = module.exports.safeQuery;
    module.exports.getClient = async () => await pool.connect();
    module.exports.tenantSchema = (id) => 'tenant_' + id.replace(/-/g, '_');
  `);

  try {
    console.log('[seed] Loading question bank...');
    const seedModule = require('../../modules/onboarding/source/backend/onboarding/data/seed-onboarding-questions');
    const seedFn = seedModule.seedOnboardingQuestionBank;

    console.log('[seed] Seeding public.onboarding_question_bank...');
    const count = await seedFn();
    console.log(`[seed] Seeded ${count} questions into public.onboarding_question_bank`);

    // Sync to onb.question_bank
    console.log('[seed] Syncing to onb.question_bank...');
    const syncResult = await query(`
      INSERT INTO onb.question_bank (question_code, stage_code, section_code, question_type, label_en, label_ar,
        help_text_en, help_text_ar, placeholder_en, placeholder_ar, options, validation_rules,
        is_required, sequence_no, is_active)
      SELECT question_code, stage_code, section_code,
        CASE WHEN question_type IN ('text','number','boolean','date','select','multi_select','json','lookup','chips','json_rows','email')
             THEN question_type ELSE 'text' END,
        label_en, label_ar,
        help_text_en, help_text_ar, placeholder_en, placeholder_ar, options_json, validation_json,
        is_required, sort_order, is_active
      FROM public.onboarding_question_bank
      ON CONFLICT (question_code) DO UPDATE SET
        stage_code = EXCLUDED.stage_code,
        section_code = EXCLUDED.section_code,
        question_type = EXCLUDED.question_type,
        label_en = EXCLUDED.label_en,
        label_ar = EXCLUDED.label_ar,
        help_text_en = EXCLUDED.help_text_en,
        help_text_ar = EXCLUDED.help_text_ar,
        placeholder_en = EXCLUDED.placeholder_en,
        placeholder_ar = EXCLUDED.placeholder_ar,
        options = EXCLUDED.options,
        validation_rules = EXCLUDED.validation_rules,
        is_required = EXCLUDED.is_required,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `);
    console.log(`[seed] Synced ${syncResult.rowCount} questions to onb.question_bank`);

    // Verify
    const pubCount = await query('SELECT count(*)::int AS c FROM public.onboarding_question_bank');
    const onbCount = await query('SELECT count(*)::int AS c FROM onb.question_bank');
    console.log(`[seed] Final counts: public.onboarding_question_bank=${pubCount.rows[0].c}, onb.question_bank=${onbCount.rows[0].c}`);

  } finally {
    // Clean up stub
    try { fs.unlinkSync(stubPath); } catch {}
    await pool.end();
  }
}

main().then(() => process.exit(0)).catch(err => { console.error('[seed] FAILED:', err.message); process.exit(1); });
