// Re-export shim. Canonical implementation lives at:
//   shared/dynamic-ui/services/dynamic-page-experience.resolver.ts
export * from '../../../config-center/shared/dynamic-ui/services/dynamic-page-experience.resolver';
import { Injectable, signal } from '@angular/core';
import { DynamicPageExperienceResolver } from '../../../config-center/shared/dynamic-ui/services/dynamic-page-experience.resolver';

// Wave A3 — alias + minimal stubs so foundation/ui consumers compile.
// These bridge legacy import names to the canonical resolver. Real
// implementations live in dynamic-ui-service / AccessStore; the stubs
// expose the surface the foundation pages call (forRoute / context /
// visibleRoutes) returning safe defaults until the canonical providers
// are wired in.
@Injectable({ providedIn: 'root' })
export class DynamicAgentExperienceResolver {
  forRoute(_route: string): { primaryAgent: string | null; actions: unknown[] } | null {
    return null;
  }
}

export interface DynamicUiVisibleRoute {
  path_pattern: string;
  nba_enabled?: boolean;
  realtime_enabled?: boolean;
  [k: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DynamicUiBootstrapService {
  forRoute(_route: string) { return { ready: signal(true) }; }
  visibleRoutes(): DynamicUiVisibleRoute[] { return []; }
}

@Injectable({ providedIn: 'root' })
export class UserContextResolver {
  context(): { tenantId: string; userId: string; roles: string[]; profileType: string | null } {
    return { tenantId: '', userId: '', roles: [], profileType: null };
  }
}

