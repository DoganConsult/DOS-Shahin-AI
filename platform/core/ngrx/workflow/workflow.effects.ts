import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { WorkflowApiService } from '../../services/workflow-collab/workflow-api.service';
import { WorkflowActions } from './workflow.actions';

@Injectable()
export class WorkflowEffects {
  private actions$ = inject(Actions);
  private api = inject(WorkflowApiService);

  loadDefinitions$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(WorkflowActions.loadDefinitions, WorkflowActions.loadAll),
      switchMap(() =>
        this.api.getWorkflows().pipe(
          map((workflows) => WorkflowActions.definitionsLoaded({ definitions: (workflows || []) as any })),
          catchError((err) => of(WorkflowActions.definitionsLoadFailed({ error: err?.message || 'Failed to load workflow definitions' }))),
        ),
      ),
    ),
  );

  loadExecutions$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(WorkflowActions.loadExecutions, WorkflowActions.loadAll),
      switchMap(() =>
        this.api.getExecutions({ limit: 20 }).pipe(
          map((data: any) => WorkflowActions.executionsLoaded({ executions: (data?.executions || []) as any })),
          catchError((err) => of(WorkflowActions.executionsLoadFailed({ error: err?.message || 'Failed to load workflow executions' }))),
        ),
      ),
    ),
  );
}
