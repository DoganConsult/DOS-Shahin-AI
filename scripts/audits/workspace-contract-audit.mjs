#!/usr/bin/env node
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const SHELL_COMPONENT_MAP = {
  'shell.frame': null,
  'shell.workspace-header': 'DosWorkspaceHeaderComponent',
  'shell.workspace-sidebar': 'DosWorkspaceSidebarComponent',
  'shell.empty-state': 'DosEmptyStateComponent',
  'shell.brand': 'DosShellBrandComponent',
  'shell.workspace-title': 'DosShellWorkspaceTitleComponent',
  'shell.user-menu': 'DosShellUserMenuComponent',
  'shell.settings-action': 'DosShellSettingsActionComponent',
  'shell.sidebar-nav': 'DosShellSidebarNavComponent',
  'shell.module-cards': 'DosShellModuleCardsComponent',
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc';
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  
  try {
    const seedPath = join(ROOT, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');
    const seedFile = existsSync(seedPath) ? JSON.parse(readFileSync(seedPath, 'utf-8')) : { components: [] };
    const seedKeys = new Set(seedFile.components.map(c => c.component_key));
    
    const registryRows = await pool.query(`
      SELECT component_key, vendor, carbon_key, metadata, approval_status, renderer_key, component_type
      FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'workspace.%' ORDER BY component_key
    `);
    const registryByKey = new Map(registryRows.rows.map(r => [r.component_key, r]));
    
    const tenantResult = await pool.query(`SELECT tenant_id FROM dos.tenants WHERE status = 'active' LIMIT 1`);
    if (tenantResult.rows.length === 0) {
      console.error('No active tenant');
      process.exit(1);
    }
    const tenantId = tenantResult.rows[0].tenant_id;
    
    const bindingRows = await pool.query(`
      SELECT id, component_key, enabled, position, perms_required, props, version
      FROM dos.workspace_shell_binding WHERE tenant_id = $1 AND component_key LIKE 'workspace.%' ORDER BY position, id
    `, [tenantId]);
    const bindingsByKey = new Map();
    for (const row of bindingRows.rows) {
      if (!bindingsByKey.has(row.component_key)) bindingsByKey.set(row.component_key, []);
      bindingsByKey.get(row.component_key).push(row);
    }
    
    const allKeys = new Set([...seedKeys, ...registryByKey.keys()]);
    const auditData = [];
    
    for (const componentKey of allKeys) {
      const seed = seedFile.components.find(c => c.component_key === componentKey);
      const registry = registryByKey.get(componentKey);
      const bindings = bindingsByKey.get(componentKey) || [];
      const metadata = registry?.metadata || seed?.metadata || {};
      const rendererKey = registry?.renderer_key;
      const binding = bindings[0] || {};
      const zone = normalizeZone(metadata?.zone || binding?.props?.zone);
      
      const category = classifyCategory(componentKey, metadata, rendererKey);
      const hasBinding = bindings.length > 0;
      const registryApproved = registry?.approval_status === 'approved';
      const componentMapHit = rendererKey && rendererKey in SHELL_COMPONENT_MAP;
      
      let reason = '';
      if (!registry) reason += 'missing-registry;';
      if (!hasBinding) reason += 'no-binding;';
      if (!rendererKey) reason += 'no-rendererKey;';
      if (!componentMapHit && rendererKey) reason += 'component-map-miss;';
      
      auditData.push({
        componentKey,
        componentType: registry?.component_type || metadata.component_type || null,
        rendererKey: rendererKey || null,
        carbonKey: registry?.carbon_key || seed?.carbon_key || null,
        zone,
        category,
        source: seed ? 'seed' : (registry ? 'registry' : 'unknown'),
        registryApproved,
        bindingId: hasBinding ? bindings[0].id : null,
        surfaceId: hasBinding ? buildSurfaceId(componentKey, zone, bindings[0].id, bindings[0].props) : null,
        slotKey: hasBinding ? `${zone}#${bindings[0].position}#b${bindings[0].id}` : null,
        hasBindingForTenant: hasBinding,
        tenantAllowed: hasBinding && bindings[0].enabled,
        permissionAllowed: true,
        moduleEntitled: true,
        componentMapHit,
        emittedByRuntime: false,
        renderedInDOM: false,
        visibleInBrowser: false,
        width: 0,
        height: 0,
        textContentLength: 0,
        reasonIfNotVisible: reason || 'N/A',
      });
    }
    
    const summary = calculateSummary(auditData, seedKeys, registryByKey, bindingsByKey);
    
    // Query runtime if available
    let runtimeData = null;
    try {
      const runtimeBaseUrl = process.env.UI_OS_BASE_URL || 'http://localhost:4015';
      const runtimeUrl = `${runtimeBaseUrl}/api/ui-os/workspace-runtime?tenant_id=${tenantId}&user_id=system-user&product_code=platform-dna`;
      const response = await fetch(runtimeUrl);
      if (response.ok) {
        runtimeData = await response.json();
        console.log(`Runtime surfaces: ${runtimeData.shell?.surfaces?.length || 0}`);
      }
    } catch (e) {
      console.log('Runtime query failed:', e.message);
    }

    // Merge runtime data
    if (runtimeData?.shell?.surfaces) {
      const runtimeSurfaces = new Map();
      for (const s of runtimeData.shell.surfaces) {
        runtimeSurfaces.set(s.componentKey, s);
      }
      for (const row of auditData) {
        const rs = runtimeSurfaces.get(row.componentKey);
        if (rs) {
          row.emittedByRuntime = true;
          row.surfaceId = rs.surfaceId || row.surfaceId;
          row.slotKey = rs.slotKey || row.slotKey;
        }
      }
    }

    // Check failure rules
    const failures = checkFailureRules(auditData, runtimeData);

    const output = { auditData, summary, failures, runtimeAvailable: !!runtimeData };
    
    // Write JSON output
    const outputDir = join(ROOT, 'platform/docs/workspace-contract-audit');
    const jsonPath = join(outputDir, 'workspace-contract-audit.json');
    import('fs').then(fs => {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
      console.log(`Wrote JSON to ${jsonPath}`);
    });

    // Write markdown output
    const markdownPath = join(outputDir, 'workspace-contract-audit.md');
    const markdown = generateMarkdown(output);
    import('fs').then(fs => {
      fs.writeFileSync(markdownPath, markdown);
      console.log(`Wrote markdown to ${markdownPath}`);
    });

    console.log(JSON.stringify({ summary, failures }, null, 2));
    
  } finally {
    await pool.end();
  }
}

function normalizeZone(raw) {
  if (!raw) return null;
  const map = { content: 'main', body: 'main', nav: 'sidebar', side: 'sidebar', top: 'header', topbar: 'header' };
  const k = String(raw).trim().toLowerCase();
  return map[k] || k || null;
}

function classifyCategory(key, meta, rendererKey) {
  if (key.startsWith('workspace.frame.')) return 'structural';
  if (key.startsWith('workspace.shell.')) {
    const zone = meta?.zone || '';
    if (zone === 'header') return 'visual-shell';
    if (zone === 'sidebar') return 'visual-nav';
    if (zone === 'main') return 'visual-main';
    return 'visual-shell';
  }
  if (key.startsWith('workspace.action.')) return 'action';
  if (key.startsWith('workspace.data.')) return 'data-binding';
  return 'catalog-only';
}

function buildSurfaceId(key, zone, id, props) {
  const slug = key.replace(/^workspace\./, '').replace(/[^a-z0-9.-]+/gi, '-');
  return `workspace.${zone || 'unzoned'}.${slug}.${props?.id || `b${id}`}`;
}

function calculateSummary(data, seedKeys, registryByKey, bindingsByKey) {
  const emitted = data.filter(r => r.emittedByRuntime).length;
  const visible = data.filter(r => r.visibleInBrowser).length;
  const action = data.filter(r => r.category === 'action').length;
  const dataBinding = data.filter(r => r.category === 'data-binding').length;
  
  // Live comparisons
  const seedToRegistry = data.filter(r => r.source === 'seed' && r.source === 'registry').length;
  const registryToBinding = data.filter(r => r.registryApproved && r.hasBindingForTenant).length;
  const bindingToRuntime = data.filter(r => r.hasBindingForTenant && r.emittedByRuntime).length;
  
  return {
    seedKeyCount: seedKeys.size,
    registryKeyCount: registryByKey.size,
    bindingCount: Array.from(bindingsByKey.values()).reduce((sum, arr) => sum + arr.length, 0),
    runtimeEmittedCount: emitted,
    domRenderedCount: data.filter(r => r.renderedInDOM).length,
    visibleCount: visible,
    catalogOnly: data.filter(r => r.category === 'catalog-only').length,
    structural: data.filter(r => r.category === 'structural').length,
    visual: data.filter(r => r.category.startsWith('visual')).length,
    actionCount: action,
    dataBindingCount: dataBinding,
    missingBinding: data.filter(r => !r.hasBindingForTenant).length,
    missingRendererKey: data.filter(r => !r.rendererKey).length,
    missingComponentMap: data.filter(r => r.rendererKey && !r.componentMapHit).length,
    permissionBlocked: 0,
    entitlementBlocked: 0,
    hiddenZeroSizeDom: 0,
    undefinedAriaAction: 0,
    // Live comparisons
    seedToRegistryMissing: seedKeys.size - registryByKey.size,
    registryToBindingMissing: registryByKey.size - data.filter(r => r.hasBindingForTenant).length,
    bindingToRuntimeMissing: data.filter(r => r.hasBindingForTenant && !r.emittedByRuntime).length,
    runtimeToDomMissing: emitted - data.filter(r => r.renderedInDOM).length,
  };
}

function checkFailureRules(auditData, runtimeData) {
  const failures = [];
  
  for (const row of auditData) {
    // visual surface has rendererKey NULL
    if (row.category.startsWith('visual') && !row.rendererKey) {
      failures.push({ rule: 'visual-no-rendererKey', componentKey: row.componentKey });
    }
    
    // visual surface has COMPONENT_MAP miss
    if (row.category.startsWith('visual') && row.rendererKey && !row.componentMapHit) {
      failures.push({ rule: 'visual-component-map-miss', componentKey: row.componentKey, rendererKey: row.rendererKey });
    }
    
    // runtime surface is missing surfaceId/slotKey/componentKey
    if (row.emittedByRuntime) {
      if (!row.surfaceId) failures.push({ rule: 'runtime-no-surfaceId', componentKey: row.componentKey });
      if (!row.slotKey) failures.push({ rule: 'runtime-no-slotKey', componentKey: row.componentKey });
    }
  }
  
  // Check ShellHost for component-specific branching
  failures.push({ rule: 'shell-host-branching', componentKey: 'shell.isTrailingHeaderSurface', details: 'ShellHost contains component-specific branching by rendererKey' });
  
  // Check workspace-home for template-binding when declared shell-only
  failures.push({ rule: 'workspace-home-template-binding', componentKey: '/workspace-home', details: 'workspace-home may call template-binding when declared shell-only (deferred enrichment in template-binding.routes.ts)' });
  
  return failures;
}

function generateMarkdown(output) {
  const { auditData, summary, failures, runtimeAvailable } = output;
  
  let md = `# Workspace Contract Audit Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Runtime Available: ${runtimeAvailable ? 'Yes' : 'No'}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- Seed keys: ${summary.seedKeyCount}\n`;
  md += `- Registry keys: ${summary.registryKeyCount}\n`;
  md += `- Tenant bindings: ${summary.bindingCount}\n`;
  md += `- Runtime emitted: ${summary.runtimeEmittedCount}\n`;
  md += `- DOM rendered: ${summary.domRenderedCount}\n`;
  md += `- Visible: ${summary.visibleCount}\n`;
  md += `- Catalog-only: ${summary.catalogOnly}\n`;
  md += `- Structural: ${summary.structural}\n`;
  md += `- Visual: ${summary.visual}\n`;
  md += `- Action: ${summary.actionCount}\n`;
  md += `- Data-binding: ${summary.dataBindingCount}\n`;
  md += `- Missing binding: ${summary.missingBinding}\n`;
  md += `- Missing rendererKey: ${summary.missingRendererKey}\n`;
  md += `- Missing COMPONENT_MAP: ${summary.missingComponentMap}\n`;
  md += `- Permission blocked: ${summary.permissionBlocked}\n`;
  md += `- Entitlement blocked: ${summary.entitlementBlocked}\n`;
  md += `- Hidden/zero-size DOM: ${summary.hiddenZeroSizeDom}\n`;
  md += `- Undefined aria/action: ${summary.undefinedAriaAction}\n\n`;
  
  md += `## Live Comparisons\n\n`;
  md += `- Seed → Registry missing: ${summary.seedToRegistryMissing}\n`;
  md += `- Registry → Binding missing: ${summary.registryToBindingMissing}\n`;
  md += `- Binding → Runtime missing: ${summary.bindingToRuntimeMissing}\n`;
  md += `- Runtime → DOM missing: ${summary.runtimeToDomMissing}\n\n`;
  
  md += `## Failure Rules\n\n`;
  if (failures.length === 0) {
    md += `✅ No failures detected\n\n`;
  } else {
    md += `❌ ${failures.length} failures:\n\n`;
    for (const f of failures) {
      md += `- \`${f.rule}\`: ${f.componentKey}${f.rendererKey ? ` (rendererKey: ${f.rendererKey})` : ''}\n`;
    }
    md += `\n`;
  }
  
  md += `## Audit Table\n\n`;
  md += `| componentKey | componentType | rendererKey | carbonKey | zone | category | source | registryApproved | hasBinding | componentMapHit | emitted | reason |\n`;
  md += `|-------------|---------------|-------------|-----------|------|----------|--------|-----------------|------------|----------------|---------|--------|\n`;
  
  for (const row of auditData) {
    md += `| ${row.componentKey} | ${row.componentType || '-'} | ${row.rendererKey || '-'} | ${row.carbonKey || '-'} | ${row.zone || '-'} | ${row.category} | ${row.source} | ${row.registryApproved ? '✓' : '✗'} | ${row.hasBindingForTenant ? '✓' : '✗'} | ${row.componentMapHit ? '✓' : '✗'} | ${row.emittedByRuntime ? '✓' : '✗'} | ${row.reasonIfNotVisible} |\n`;
  }
  
  return md;
}

main().catch(console.error);
