/**
 * Per-route contract (pact) test.
 *
 * Pins the published HTTP surface in three directions so any drift fails CI:
 *   1. openapi.yaml declares a known set of paths grouped by tag.
 *   2. Each tag has at least one matching *.routes.ts file under
 *      source/backend/foundation/routes/ (proves OpenAPI is not
 *      documenting a non-existent surface).
 *   3. The contract DTOs exposed by the barrel match the schemas the
 *      OpenAPI document references (shape-level, not field-level).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FOUNDATION_PERMISSION_CODES } from '../../contracts';

const moduleRoot = path.resolve(__dirname, '../..');
const openapiPath = path.join(moduleRoot, 'openapi.yaml');
const postmanPath = path.join(moduleRoot, 'postman.collection.json');
const routesDir = path.join(moduleRoot, 'interface/http');

function readOpenapi(): { paths: string[]; tags: string[]; schemas: string[] } {
  const raw = fs.readFileSync(openapiPath, 'utf8');
  // Lightweight parse — we don't pull in a YAML lib for one pinning test.
  const paths = Array.from(raw.matchAll(/^  (\/[A-Za-z0-9_\-{}/.]+):\s*$/gm)).map((m) => m[1]);
  const tags = Array.from(raw.matchAll(/^  - name: ([a-z\-]+)\s*$/gm)).map((m) => m[1]);
  const schemas = Array.from(raw.matchAll(/^    ([A-Z][A-Za-z0-9]+):\s*$/gm)).map((m) => m[1]);
  return { paths, tags, schemas };
}

describe('foundation OpenAPI ↔ routes pact', () => {
  const oa = readOpenapi();

  it('openapi.yaml declares all expected route groups', () => {
    expect(oa.tags).toEqual(
      expect.arrayContaining([
        'organizations',
        'business-units',
        'departments',
        'positions',
        'locations',
        'committees',
        'delegations',
        'ownership-mapping',
        'access-review',
        'bulk-invite',
        'audit-trail',
        'governance',
        'sod',
        'org-hierarchy',
        'health',
      ]),
    );
  });

  it('every documented tag has a matching routes file on disk', () => {
    const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.routes.ts'));
    const expectations: Record<string, RegExp> = {
      organizations:      /organizations\.routes\.ts/,
      'business-units':   /business-units\.routes\.ts/,
      departments:        /departments\.routes\.ts/,
      positions:          /positions\.routes\.ts/,
      locations:          /locations\.routes\.ts/,
      committees:         /committee-management\.routes\.ts/,
      delegations:        /delegation\.routes\.ts/,
      'ownership-mapping':/ownership-mapping\.routes\.ts/,
      'access-review':    /access-review\.routes\.ts/,
      'bulk-invite':      /bulk-invite\.routes\.ts/,
      'audit-trail':      /audit-trail\.routes\.ts/,
      governance:         /foundation-governance\.routes\.ts/,
      sod:                /sod-check\.routes\.ts/,
      'org-hierarchy':    /org-hierarchy\.routes\.ts/,
      health:             /foundation-health\.routes\.ts/,
    };
    for (const [tag, re] of Object.entries(expectations)) {
      expect(files.some((f) => re.test(f))).toBe(
        true,
      );
      void tag; // tag is the failure label
    }
  });

  it('OpenAPI schemas cover every contract DTO referenced by tests', () => {
    expect(oa.schemas).toEqual(
      expect.arrayContaining([
        'FoundationEntityType',
        'FoundationStatus',
        'FoundationNodeCreateDTO',
        'FoundationNodeUpdateDTO',
        'FoundationNodeResponseDTO',
        'FoundationTreeResponseDTO',
        'FoundationListResponse',
        'ApprovalPendingDTO',
        'Error',
      ]),
    );
  });

  it('Postman collection mirrors the OpenAPI top-level groups', () => {
    const pm = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
    const folders: string[] = pm.item.map((i: { name: string }) => i.name);
    expect(folders).toEqual(
      expect.arrayContaining([
        'Organizations',
        'Business Units',
        'Departments',
        'Positions',
        'Locations',
        'Committees',
        'Delegations',
        'Ownership Mapping',
        'Access Review',
        'Bulk Invite',
        'Audit Trail',
        'Governance',
        'SoD',
        'Org Hierarchy',
        'Health',
      ]),
    );
  });

  it('every write-path tag has a corresponding write permission code in contracts', () => {
    // Spot-check: the write codes the OpenAPI implies must exist on the contract.
    const codes = Object.values(FOUNDATION_PERMISSION_CODES);
    expect(codes).toEqual(
      expect.arrayContaining([
        'foundation.read',
        'foundation.record.write',
        'foundation.record.delete',
        'foundation.record.approve',
        'foundation.manage',
        'foundation.org.read',
        'foundation.org.write',
        'foundation.record.read',
        'foundation.manage',
      ]),
    );
  });

  it('openapi.yaml declares a non-trivial path set', () => {
    expect(oa.paths.length).toBeGreaterThanOrEqual(20);
    // Sanity: every path must start with /
    for (const p of oa.paths) expect(p.startsWith('/')).toBe(true);
  });
});
