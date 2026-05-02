import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'platform.registry.json');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractPlatform() {
  const loadRegistry = (filename) => {
    const p = path.join(GENERATED_DIR, filename);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    return null;
  };

  const modulesReg = loadRegistry('modules.registry.json') || {};
  const agentsReg = loadRegistry('agents.registry.json') || {};
  const frameworksReg = loadRegistry('frameworks.registry.json') || {};
  const servicesReg = loadRegistry('services.registry.json') || {};
  const workflowsReg = loadRegistry('workflows.registry.json') || {};
  const landingSourcesReg = loadRegistry('landing-sources.registry.json') || {};

  const modulesCount = (modulesReg.modules || []).length;
  const agentsCount = (agentsReg.agents || []).length;
  const frameworksCount = (frameworksReg.frameworks || []).length;
  const servicesCount = (servicesReg.services || []).length;
  const workflowsCount = (workflowsReg.workflows || []).length;
  const landingSourcesCount = (landingSourcesReg.landingSources || []).length;

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    provenance: 'DOS-AIO Public Truth Layer',
    status: 'verified',
    summary: {
      modules_count: modulesCount,
      agents_count: agentsCount,
      frameworks_count: frameworksCount,
      services_count: servicesCount,
      workflows_count: workflowsCount,
      landing_sources_count: landingSourcesCount
    },
    catalogs: {
      modules: modulesReg,
      agents: agentsReg,
      frameworks: frameworksReg,
      services: servicesReg,
      workflows: workflowsReg,
      landingSources: landingSourcesReg
    }
  };
}

const registry = extractPlatform();

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote platform.registry.json to ${path.relative(REPO_ROOT, OUTPUT_PATH)} containing aggregation of all sub-registries.`);
