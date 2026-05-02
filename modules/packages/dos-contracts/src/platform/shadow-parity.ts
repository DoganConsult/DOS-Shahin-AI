// @ts-nocheck — platform validation tool, stabilizing incrementally
import path from 'path';
import { Router } from 'express';
import { generateMountPlan, toMountableRoutes, validateMountPlan } from '@dos/platform-core';
import { ROUTE_CATALOG } from '@dos/platform-core';
import { RouteDefinition } from '@dos/platform-core';
import type { MountableRoute } from '@dos/platform-core';

export interface ParityResult {
  timestamp: string;
  manifestCount: number;
  generatedCount: number;
  structuralMatches: number;
  structuralMismatches: ParityMismatch[];
  handlerIdentityMatches: number;
  handlerIdentityMismatches: number;
  missingInGenerated: string[];
  extraInGenerated: string[];
  validationIssues: string[];
  pass: boolean;
}

export interface ParityMismatch {
  path: string;
  field: string;
  manifest: string;
  generated: string;
}

type FactoryResolver = (def: RouteDefinition) => Router | null;

export function runShadowParity(
  manifest: MountableRoute[],
  factoryResolvers?: Map<string, FactoryResolver>,
  basePath?: string,
): ParityResult {
  const resolvedBase = basePath ?? path.resolve(__dirname, '..');

  const manifestCatalog = ROUTE_CATALOG.filter(
    r => r.ownerKind !== 'platform' && !r.notes?.includes('auto-discovered'),
  );

  const plan = generateMountPlan(manifestCatalog, {
    basePath: resolvedBase,
    factoryResolvers,
    skipUnresolvable: true,
  });

  const generated = toMountableRoutes(plan);
  const validationIssues = validateMountPlan(plan);

  const manifestByPath = new Map<string, MountableRoute[]>();
  for (const r of manifest) {
    if (!manifestByPath.has(r.path)) manifestByPath.set(r.path, []);
    manifestByPath.get(r.path)!.push(r);
  }

  const generatedByPath = new Map<string, MountableRoute[]>();
  for (const r of generated) {
    if (!generatedByPath.has(r.path)) generatedByPath.set(r.path, []);
    generatedByPath.get(r.path)!.push(r);
  }

  const allPaths = new Set([...manifestByPath.keys(), ...generatedByPath.keys()]);
  const missingInGenerated: string[] = [];
  const extraInGenerated: string[] = [];
  const structuralMismatches: ParityMismatch[] = [];
  let structuralMatches = 0;
  let handlerIdentityMatches = 0;
  let handlerIdentityMismatches = 0;

  for (const p of allPaths) {
    const mEntries = manifestByPath.get(p) ?? [];
    const gEntries = generatedByPath.get(p) ?? [];

    if (mEntries.length > 0 && gEntries.length === 0) {
      missingInGenerated.push(p);
      continue;
    }
    if (gEntries.length > 0 && mEntries.length === 0) {
      extraInGenerated.push(p);
      continue;
    }

    if (mEntries.length !== gEntries.length) {
      structuralMismatches.push({
        path: p,
        field: 'handlerCount',
        manifest: String(mEntries.length),
        generated: String(gEntries.length),
      });
    }

    for (let i = 0; i < Math.min(mEntries.length, gEntries.length); i++) {
      const m = mEntries[i];
      const g = gEntries[i];
      let structuralMatch = true;

      if (m.handler === g.handler) {
        handlerIdentityMatches++;
      } else {
        handlerIdentityMismatches++;
      }

      if ((m.module ?? '') !== (g.module ?? '')) {
        structuralMismatches.push({ path: p, field: 'module', manifest: m.module ?? 'none', generated: g.module ?? 'none' });
        structuralMatch = false;
      }

      if ((m.tier ?? '') !== (g.tier ?? '')) {
        structuralMismatches.push({ path: p, field: 'tier', manifest: m.tier ?? 'none', generated: g.tier ?? 'none' });
        structuralMatch = false;
      }

      if ((m.product ?? '') !== (g.product ?? '')) {
        structuralMismatches.push({ path: p, field: 'product', manifest: m.product ?? 'none', generated: g.product ?? 'none' });
        structuralMatch = false;
      }

      if (structuralMatch) structuralMatches++;
    }
  }

  const pass = structuralMismatches.length === 0
    && missingInGenerated.length === 0
    && extraInGenerated.length === 0
    && validationIssues.length === 0;

  return {
    timestamp: new Date().toISOString(),
    manifestCount: manifest.length,
    generatedCount: generated.length,
    structuralMatches,
    structuralMismatches,
    handlerIdentityMatches,
    handlerIdentityMismatches,
    missingInGenerated,
    extraInGenerated,
    validationIssues,
    pass,
  };
}
