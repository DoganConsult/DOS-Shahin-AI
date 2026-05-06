import type { Type } from '@angular/core';
import type { ArchetypeId } from './archetype.contract';
import { DosOverviewArchetypeComponent } from './overview-archetype.component';
import { DosListArchetypeComponent } from './list-archetype.component';
import { DosObjectArchetypeComponent } from './object-archetype.component';
import { DosWorkflowArchetypeComponent } from './workflow-archetype.component';
import { DosAuditArchetypeComponent } from './audit-archetype.component';
import { DosSettingsArchetypeComponent } from './settings-archetype.component';
import { DosCatalogArchetypeComponent } from './catalog-archetype.component';
import { DosHierarchyArchetypeComponent } from './hierarchy-archetype.component';
import { DosReviewArchetypeComponent } from './review-archetype.component';
import { DosLifecycleArchetypeComponent } from './lifecycle-archetype.component';
import { DosDiagnosticsArchetypeComponent } from './diagnostics-archetype.component';
import { DosReferenceArchetypeComponent } from './reference-archetype.component';
import { DosPolicyArchetypeComponent } from './policy-archetype.component';
import { DosMatrixArchetypeComponent } from './matrix-archetype.component';

export const ARCHETYPE_REGISTRY: Readonly<Record<ArchetypeId, Type<unknown>>> = Object.freeze({
  overview:    DosOverviewArchetypeComponent,
  list:        DosListArchetypeComponent,
  object:      DosObjectArchetypeComponent,
  workflow:    DosWorkflowArchetypeComponent,
  audit:       DosAuditArchetypeComponent,
  settings:    DosSettingsArchetypeComponent,
  catalog:     DosCatalogArchetypeComponent,
  hierarchy:   DosHierarchyArchetypeComponent,
  review:      DosReviewArchetypeComponent,
  lifecycle:   DosLifecycleArchetypeComponent,
  diagnostics: DosDiagnosticsArchetypeComponent,
  reference:   DosReferenceArchetypeComponent,
  policy:      DosPolicyArchetypeComponent,
  matrix:      DosMatrixArchetypeComponent,
});

export function resolveArchetype(id: ArchetypeId): Type<unknown> {
  const cmp = ARCHETYPE_REGISTRY[id];
  if (!cmp) throw new Error(`Unknown archetype: ${id}`);
  return cmp;
}
