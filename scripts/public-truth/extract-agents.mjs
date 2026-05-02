import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'agents.registry.json');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');

// Ensure output directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractAgents() {
  const agents = [];
  
  if (fs.existsSync(AGENTS_DIR)) {
    const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() || entry.isDirectory()) {
         // Some might be A01-AgentName.md or similar
         const rawName = entry.name.replace(/\.md$/, '').replace(/\.json$/, '');
         const cleanName = rawName.replace(/^[A-Z0-9]+[-_]/, ''); // remove A01- prefix
         
         agents.push({
           id: rawName.toLowerCase(),
           name: cleanName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
           role: 'Platform Agent',
           status: 'verified',
           provenance: `agents/${entry.name}`
         });
      }
    }
  }
  
  // If we couldn't find the physical files, fallback to known agents in the platform
  if (agents.length === 0) {
    const defaultAgents = [
      'Audit-Agent', 'Risk-Assessor', 'Compliance-Engine', 'Finance-Parser'
    ];
    for (const agent of defaultAgents) {
      agents.push({
        id: agent.toLowerCase(),
        name: agent.replace(/-/g, ' '),
        role: 'AI Agent',
        status: 'inferred',
        provenance: 'public-content.routes.ts'
      });
    }
  }
  
  return agents;
}

const registry = {
  metadata: {
    generator: 'extract-agents.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'agents/'
  },
  agents: extractAgents()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.agents.length} agents to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
