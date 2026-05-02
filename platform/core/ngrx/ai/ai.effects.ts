import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AiApiService } from '../../../features/ai/services/ai-api.service';
import { AiActions } from './ai.actions';

@Injectable()
export class AiEffects {
  private actions$ = inject(Actions);
  private api = inject(AiApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AiActions.loadDashboard, AiActions.loadAll),
      switchMap(() =>
        this.api.getKernelStatus().pipe(
          map((dashboard) => AiActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(AiActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadAgents$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AiActions.loadAgents, AiActions.loadAll),
      switchMap(() =>
        this.api.getProcessTable().pipe(
          map((data: any) => AiActions.agentsLoaded({ agents: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(AiActions.agentsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
