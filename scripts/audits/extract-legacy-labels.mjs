#!/usr/bin/env node
/**
 * Extract legacy label patterns from frontend code and generate DB seed data
 * 
 * This script:
 * 1. Scans for labelKey, label_fallback, labelEn, labelAr patterns
 * 2. Extracts the values and their contexts
 * 3. Generates INSERT statements for dos.dynamic_ui_navigation and dos.dynamic_ui_routes
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

// ═══════════════════════════════════════════════════════════════════
// SCAN FOR LEGACY PATTERNS
// ═══════════════════════════════════════════════════════════════════

// List of known files with legacy patterns from previous grep scan
const KNOWN_LEGACY_FILES = [
  'platform/access/dos-access-store/src/generated/module-navigation.registry.ts',
  'platform/access/dos-access-store/src/nav-sources/platform-dna-nav.source.ts',
  'platform/access/dos-access-store/src/nav-sources/module-library-nav.source.ts',
  'platform/runtime/routing/route-registry.store.ts',
  'platform/runtime/config/products-modules-config.models.ts',
  'platform/runtime/config/products-modules-config.service.spec.ts',
  'platform/runtime/config/feature-catalog.model.ts',
  'platform/registries/module-ui.registry.ts',
  'platform/registries/dashboard.registry.ts',
  'platform/registries/action.registry.ts',
  'platform/core/runtime/ui-state.models.ts',
  'platform/core/services/platform-api-types.ts',
  'platform/core/platform/shell/workspace-shell-binding.service.ts',
  'platform/core/platform/shell/templates/module-records.template.ts',
  'platform/core/platform/shell/templates/module-heatmap.template.ts',
  'platform/core/platform/shell/templates/module-audit-trail.template.ts',
  'platform/core/platform/shell/templates/module-template.types.ts',
  'platform/core/modules/module-crud-api.service.ts',
  'platform/core/form-engine/form-schema.types.ts',
  'platform/core/dashboard/dashboard-api.models.ts',
  'platform/core/constants/evidence-artifact-types.ts',
  'platform/core/grc/services/grc-ops-platform.types.ts',
  'platform/workflow/ui/features/workflow/pages/workflow-hub/workflow-hub.component.ts',
  'platform/workflow/ui/features/workflow/pages/workflow-3level/workflow-supervisor-dashboard.component.html',
  'platform/workflow/ui/features/workflow/pages/workflow-3level/workflow-supervisor-dashboard.component.ts',
  'platform/workflow/ui/features/workflow/pages/operations-hub/operations-hub.component.ts',
  'platform/workflow/ui/features/workflow/pages/cooperative-workflows/cooperative-workflows.component.ts',
  'platform/workflow/ui/features/workflow/pages/cooperative-workflows/cooperative-workflows.component.html',
  'platform/workflow/ui/features/workflow/pages/automation-hub/automation-hub.component.ts',
  'platform/workflow/ui/features/workflow/pages/approval-center/approval-center.component.ts',
  'platform/workflow/ui/features/workflow/pages/approval-center/approval-center.component.html',
  'platform/workflow/ui/features/workflow/pages/workflow-3level/workflow-ai-config.component.ts',
  'platform/workflow/ui/features/workflow/contracts/workflow.contracts.ts',
  'platform/ui-system/module_ui_os_contract-pack/shahin_workspace_step2_fix_plan.md',
  'platform/ui-system/module_ui_os_contract-pack/foundation-complete-direct-seed.json',
  'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json',
  'platform/ui-system/module_complete_direct_seed_pack/foundation-complete-direct-seed.json',
  'platform/ui-system/module_complete_direct_seed_pack/risk-complete-direct-seed.json',
  'platform/ui-system/dos-ui-system/src/agentic/agentic.contract.ts',
  'platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts',
  'platform/ui-system/dos-ui-system/src/components/twin-graph.component.ts',
  'platform/ui-system/dos-ui-system/src/carbon/dos-carbon-search.component.ts',
  'platform/ui-system/dos-ui-system/src/components/workspace-switcher.component.ts',
  'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts',
  'platform/ui-system/dos-ui-system/src/components/module-switcher.component.ts',
  'platform/dos/contracts/cockpit-config.contract.ts',
  'platform/config-center/shared/contracts/module-shell-registry-ops.ts',
  'platform/config-center/shared/types/navigation.types.ts',
];

function findFilesWithLegacyPatterns() {
  // Return known list instead of scanning (to avoid ENOBUFS)
  return KNOWN_LEGACY_FILES.filter(file => {
    const fullPath = path.join(ROOT, file);
    return fs.existsSync(fullPath);
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACT LABEL DATA FROM FILE
// ═══════════════════════════════════════════════════════════════════

function extractLabelData(filePath) {
  const fullPath = path.join(ROOT, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  const labels = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Extract labelKey patterns
    const labelKeyMatch = line.match(/labelKey\s*[:=]\s*['"`]([^'"`]+)['"`]/);
    if (labelKeyMatch) {
      labels.push({
        type: 'labelKey',
        key: labelKeyMatch[1],
        line: i + 1,
        file: filePath
      });
    }
    
    // Extract label_fallback patterns
    const labelFallbackMatch = line.match(/label_fallback\s*[:=]\s*['"`]([^'"`]+)['"`]/);
    if (labelFallbackMatch) {
      labels.push({
        type: 'label_fallback',
        key: labelFallbackMatch[1],
        line: i + 1,
        file: filePath
      });
    }
    
    // Extract labelEn patterns
    const labelEnMatch = line.match(/labelEn\s*[:=]\s*['"`]([^'"`]+)['"`]/);
    if (labelEnMatch) {
      labels.push({
        type: 'labelEn',
        key: labelEnMatch[1],
        line: i + 1,
        file: filePath
      });
    }
    
    // Extract labelAr patterns
    const labelArMatch = line.match(/labelAr\s*[:=]\s*['"`]([^'"`]+)['"`]/);
    if (labelArMatch) {
      labels.push({
        type: 'labelAr',
        key: labelArMatch[1],
        line: i + 1,
        file: filePath
      });
    }
  }
  
  return labels;
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE DB SEED SQL
// ═══════════════════════════════════════════════════════════════════

function generateSeedSql(labels) {
  let sql = '-- Legacy label patterns extracted from frontend code\n';
  sql += '-- Migration: 20260511_1300_legacy_label_extraction.sql\n';
  sql += '-- This seeds the dynamic_ui tables with extracted label data\n\n';
  sql += 'BEGIN;\n\n';
  
  // Group by type
  const byType = {};
  labels.forEach(label => {
    if (!byType[label.type]) byType[label.type] = [];
    byType[label.type].push(label);
  });
  
  // Generate INSERT statements for each type
  Object.entries(byType).forEach(([type, items]) => {
    sql += `-- ${type} patterns (${items.length} items)\n`;
    
    items.forEach((item, idx) => {
      const id = crypto.randomUUID();
      const moduleCode = extractModuleCode(item.file);
      const route = extractRoute(item.file);
      
      if (type === 'labelKey') {
        // labelKey is used as i18n key - store as title_key
        sql += `INSERT INTO dos.dynamic_ui_routes (id, module_code, path_pattern, title_key) VALUES ('${id}', '${moduleCode}', '${route || '/unknown'}', '${item.key}') ON CONFLICT DO NOTHING;\n`;
      } else if (type === 'label_fallback') {
        // label_fallback is the fallback text - store as title_key for now
        sql += `INSERT INTO dos.dynamic_ui_routes (id, module_code, path_pattern, title_key) VALUES ('${id}', '${moduleCode}', '${route || '/unknown'}', '${item.key}') ON CONFLICT DO NOTHING;\n`;
      } else if (type === 'labelEn') {
        // labelEn is i18n English - store as title_key
        sql += `INSERT INTO dos.dynamic_ui_routes (id, module_code, path_pattern, title_key) VALUES ('${id}', '${moduleCode}', '${route || '/unknown'}', '${item.key}') ON CONFLICT DO NOTHING;\n`;
      } else if (type === 'labelAr') {
        // labelAr is i18n Arabic - store as title_key for now (will need i18n table later)
        sql += `INSERT INTO dos.dynamic_ui_routes (id, module_code, path_pattern, title_key) VALUES ('${id}', '${moduleCode}', '${route || '/unknown'}', '${item.key}') ON CONFLICT DO NOTHING;\n`;
      }
    });
    
    sql += '\n';
  });
  
  sql += 'COMMIT;\n';
  
  return sql;
}

function extractModuleCode(filePath) {
  const parts = filePath.split('/');
  const platformIndex = parts.indexOf('platform');
  if (platformIndex === -1) return 'unknown';
  
  // Try to extract from path like platform/foundation/... -> foundation
  if (platformIndex + 1 < parts.length) {
    return parts[platformIndex + 1].replace(/-/g, '_');
  }
  
  return 'unknown';
}

function extractRoute(filePath) {
  const parts = filePath.split('/');
  // Try to extract from file path
  if (filePath.includes('pages/')) {
    const pagesIndex = parts.indexOf('pages');
    if (pagesIndex + 1 < parts.length) {
      return `/${parts[pagesIndex + 1].replace(/\.(component|page)\.(ts|html)$/, '')}`;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('═══ Legacy Label Extraction ═══\n');
  
  const files = findFilesWithLegacyPatterns();
  console.log(`Found ${files.length} files with legacy patterns\n`);
  
  const allLabels = [];
  
  for (const filePath of files) {
    const labels = extractLabelData(filePath);
    allLabels.push(...labels);
  }
  
  console.log(`Extracted ${allLabels.length} label patterns\n`);
  
  // Group by type
  const byType = {};
  allLabels.forEach(label => {
    if (!byType[label.type]) byType[label.type] = [];
    byType[label.type].push(label);
  });
  
  console.log('Breakdown by type:');
  Object.entries(byType).forEach(([type, items]) => {
    console.log(`  ${type}: ${items.length}`);
  });
  
  // Generate seed SQL
  const sql = generateSeedSql(allLabels);
  
  const outputPath = path.join(ROOT, 'platform/dos/migrations/public/20260511_1300_legacy_label_extraction.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  
  console.log(`\nGenerated seed SQL: ${outputPath}`);
  
  // Generate report
  const reportPath = path.join(ROOT, 'docs/legacy-label-extraction-report.md');
  const report = generateReport(files, allLabels, byType);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`Generated report: ${reportPath}`);
}

function generateReport(files, allLabels, byType) {
  let report = '# Legacy Label Extraction Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- Files scanned: ${files.length}\n`;
  report += `- Labels extracted: ${allLabels.length}\n\n`;
  report += `## Breakdown by Type\n\n`;
  
  Object.entries(byType).forEach(([type, items]) => {
    report += `- **${type}**: ${items.length} items\n`;
  });
  
  report += `\n## Files with Legacy Patterns\n\n`;
  files.slice(0, 50).forEach(file => {
    report += `- ${file}\n`;
  });
  
  if (files.length > 50) {
    report += `- ... ${files.length - 50} more files\n`;
  }
  
  return report;
}

main();
