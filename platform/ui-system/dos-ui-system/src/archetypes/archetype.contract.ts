import type { TemplateRef } from '@angular/core';

export type ArchetypeId =
  | 'overview'
  | 'list'
  | 'object'
  | 'workflow'
  | 'audit'
  | 'settings'
  | 'catalog'
  | 'hierarchy'
  | 'review'
  | 'lifecycle'
  | 'diagnostics'
  | 'reference'
  | 'policy'
  | 'matrix';

export interface ArchetypeZoneSpec {
  zone: string;
  surfaces: ReadonlyArray<{
    componentKey: string;
    permsRequired?: ReadonlyArray<string>;
    props?: Readonly<Record<string, unknown>>;
  }>;
}

export interface ArchetypePageSpec {
  archetype: ArchetypeId;
  pageId: string;
  moduleCode: string;
  title: { i18nKey?: string; fallback?: string; label?: string };
  zones: ReadonlyArray<ArchetypeZoneSpec>;
  agents: ReadonlyArray<{ agentId: string; isPrimary: boolean; presentation: string }>;
}

export interface ArchetypeRenderContext {
  pageSpec: ArchetypePageSpec;
  zoneTemplate?: TemplateRef<{ zone: string }>;
}
