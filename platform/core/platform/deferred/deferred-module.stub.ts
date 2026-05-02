// Foundation-Only Bring-Up — universal deferred-module stub.
//
// Path-mapped via tsconfig so EVERY dynamic import that points at a
// deferred (non-Foundation) feature module resolves to this single file
// instead of the deleted/broken on-disk source. This lets the SPA build
// while keeping deferred modules cleanly hidden behind a controlled
// "feature unavailable" placeholder.
//
// Any symbol the consumer asks for (`m.WorkflowHubComponent`, etc.) maps
// to the same DeferredModulePlaceholderComponent thanks to the Proxy
// re-export at the bottom of this file.

import { Component, ChangeDetectionStrategy, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-deferred-module-placeholder',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="deferred-module-placeholder">
      <h2>Module unavailable</h2>
      <p>This module is not active in the current Foundation-only bring-up.</p>
    </section>
  `,
  styles: [`
    .deferred-module-placeholder {
      padding: var(--cds-spacing-07);
      text-align: center;
      color: var(--shell-text-secondary);
    }
  `],
})
export class DeferredModulePlaceholderComponent {}

// Inert API service. Any method invocation returns an empty observable.
// Using Proxy + a permissive index signature so consumers can call any
// method name (`getGaps`, `getRegulatoryChanges`, etc.) without the SPA
// build needing per-method declarations.
@Injectable({ providedIn: 'root' })
export class DeferredModuleApiServiceStub {
  [method: string]: (...args: any[]) => Observable<any>;
  constructor() {
    return new Proxy(this, {
      get: (_t, _prop) => (..._args: any[]) => of(null as any),
    });
  }
}

// Default + namespace-style export. Anything any consumer destructures from
// this module (named export, default, or otherwise) resolves to the
// placeholder component. Routes, lazy loads, and barrel re-exports all
// degrade safely without crashing the build.
const handler: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop) {
    if (prop === 'default') return DeferredModulePlaceholderComponent;
    if (typeof prop === 'string' && /Service$/.test(prop)) {
      return DeferredModuleApiServiceStub;
    }
    return DeferredModulePlaceholderComponent;
  },
};

const proxy = new Proxy<Record<string, unknown>>({}, handler);
export default DeferredModulePlaceholderComponent;
export { proxy as __deferredProxy };
