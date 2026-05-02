import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const MAPPER_FILE = 'modules/onboarding/source/backend/onboarding/mappers/normalized-profile.mapper.ts';
const STEP_FILES = [
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/tenant-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-core-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-compliance-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-operations-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-team-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-governance-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/activation-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/misc-steps.ts',
];

function extractProfileFieldAccess(src: string): Set<string> {
  const fields = new Set<string>();
  const re = /ctx\.profile\.(\w+)\??\.(\w+)/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    fields.add(`${match[1]}.${match[2]}`);
  }
  return fields;
}

function extractMapperSections(mapperSrc: string): Set<string> {
  const sections = new Set<string>();
  const profileBlock = mapperSrc.split('const profile')[1];
  if (!profileBlock) return sections;
  const sectionRe = /^\s{4}(\w+):\s*\{/gm;
  let match;
  while ((match = sectionRe.exec(profileBlock)) !== null) {
    sections.add(match[1]);
  }
  return sections;
}

describe('Profile Mapper Completeness', () => {
  const mapperSrc = read(MAPPER_FILE);

  const allFields = new Set<string>();
  for (const f of STEP_FILES) {
    const src = read(f);
    for (const field of extractProfileFieldAccess(src)) {
      allFields.add(field);
    }
  }

  const mapperSections = extractMapperSections(mapperSrc);

  const REQUIRED_SECTIONS = ['organization', 'regulatory', 'technology', 'governance', 'maturity', 'workspace', 'operations', 'structure', 'people'];

  for (const section of REQUIRED_SECTIONS) {
    it(`mapper populates profile.${section}`, () => {
      expect(mapperSections.has(section), `profile.${section} is not populated in the mapper`).toBe(true);
    });
  }

  it('all profile sections consumed by seed steps exist in mapper output', () => {
    const sections = new Set([...allFields].map(f => f.split('.')[0]));
    const missing = [...sections].filter(s => !mapperSections.has(s) && s !== 'profile');
    expect(missing, `Sections consumed by seed steps but missing from mapper: ${missing.join(', ')}`).toEqual([]);
  });

  const CRITICAL_FIELDS = [
    'workspace.dashboardProfile',
    'workspace.enabledModules',
    'workspace.riskAppetite',
    'workspace.startupMode',
    'operations.evidenceMode',
    'operations.reportingCadence',
    'operations.retentionPolicyYears',
    'operations.controlTestingModel',
    'operations.complianceCadence',
    'operations.auditUniverseSize',
    'operations.auditPlanStartMonth',
    'operations.incidentResponseSla',
    'people.personProfiles',
    'people.confirmedAssignments',
    'people.cisoName',
    'people.executiveSponsor',
    'people.invites',
    'structure.departmentsEnabled',
    'governance.approvalModel',
    'governance.hasCommittees',
    'governance.hasRiskCommittee',
    'maturity.riskAppetiteStyle',
    'maturity.riskDomainsEnabled',
    'technology.connectors',
    'technology.hasSSO',
    'technology.ssoProvider',
    'technology.mfaEnabled',
  ];

  for (const field of CRITICAL_FIELDS) {
    it(`mapper populates profile.${field}`, () => {
      const [section, key] = field.split('.');
      const sectionBlock = mapperSrc.split(new RegExp(`^\\s{4}${section}:\\s*\\{`, 'm'))[1];
      expect(sectionBlock, `Section ${section} not found in mapper`).toBeDefined();
      const endIdx = findMatchingBrace(sectionBlock);
      const sectionBody = sectionBlock.substring(0, endIdx);
      expect(sectionBody, `Field ${field} not found in mapper section`).toContain(key);
    });
  }
});

function findMatchingBrace(src: string): number {
  let depth = 1;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return src.length;
}
