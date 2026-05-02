import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export type GrcEntity =
  | 'risk' | 'control' | 'policy' | 'framework' | 'evidence'
  | 'incident' | 'finding' | 'vendor' | 'audit' | 'compliance'
  | 'workflow' | 'team' | 'assessment' | 'workspace' | 'governance'
  | 'ai';

export type GrcMutationAction = 'post' | 'put' | 'patch' | 'delete';

export interface GrcChangeEvent {
  entity: GrcEntity;
  action: GrcMutationAction;
  url: string;
}

/**
 * GrcLiveService — central cross-layer event bus.
 *
 * Any HTTP mutation (POST/PUT/PATCH/DELETE) intercepted by GrcMutationInterceptor
 * calls emit(). Any backend WebSocket event (agrc_event, data_update) also calls emit().
 *
 * Components subscribe to:
 *   - change$          : all GRC mutations (use with debounceTime)
 *   - risk$, control$, policy$, … : entity-specific streams
 *
 * This ensures that an action in any module (create risk, test control, submit evidence)
 * propagates to all interested layers (workspace home KPIs, AGRC-OS metrics, analytics,
 * audit trail, notification feed) without direct component-to-component coupling.
 */
@Injectable({ providedIn: 'root' })
export class GrcLiveService {
  /** Fires on every successful GRC mutation — the main integration bus. */
  readonly change$ = new Subject<GrcChangeEvent>();

  // ── Entity-specific streams ────────────────────────────────────────────────
  readonly risk$       = new Subject<GrcChangeEvent>();
  readonly control$    = new Subject<GrcChangeEvent>();
  readonly policy$     = new Subject<GrcChangeEvent>();
  readonly framework$  = new Subject<GrcChangeEvent>();
  readonly evidence$   = new Subject<GrcChangeEvent>();
  readonly incident$   = new Subject<GrcChangeEvent>();
  readonly finding$    = new Subject<GrcChangeEvent>();
  readonly vendor$     = new Subject<GrcChangeEvent>();
  readonly audit$      = new Subject<GrcChangeEvent>();
  readonly compliance$ = new Subject<GrcChangeEvent>();
  readonly workflow$   = new Subject<GrcChangeEvent>();
  readonly team$       = new Subject<GrcChangeEvent>();
  readonly assessment$ = new Subject<GrcChangeEvent>();
  readonly workspace$  = new Subject<GrcChangeEvent>();
  readonly governance$ = new Subject<GrcChangeEvent>();
  readonly ai$         = new Subject<GrcChangeEvent>();

  /**
   * Emit a change event — called by the HTTP interceptor and WebSocket bridge.
   * Routes to both the global change$ stream and the entity-specific stream.
   */
  emit(event: GrcChangeEvent): void {
    this.change$.next(event);
    const stream = (this as unknown)[event.entity + '$'] as Subject<GrcChangeEvent> | undefined;
    stream?.next(event);
  }

  /**
   * Returns change$ debounced by `ms` milliseconds — use in components to
   * avoid triggering multiple reloads on a burst of mutations.
   *
   * @example
   *   this.live.debounced(800).subscribe(() => this.reload());
   */
  debounced(ms = 600) {
    return this.change$.pipe(debounceTime(ms));
  }
}
