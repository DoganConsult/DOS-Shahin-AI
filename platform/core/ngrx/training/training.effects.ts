import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TrainingApiService } from '../../services/api/training-api.service';
import { TrainingActions } from './training.actions';

@Injectable()
export class TrainingEffects {
  private actions$ = inject(Actions);
  private api = inject(TrainingApiService);

  loadSnapshot$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(TrainingActions.loadSnapshot, TrainingActions.loadAll),
      switchMap(() =>
        this.api.listCourses().pipe(
          map((snapshot) => TrainingActions.snapshotLoaded({ snapshot })),
          catchError((err) => of(TrainingActions.snapshotLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadPrograms$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(TrainingActions.loadPrograms, TrainingActions.loadAll),
      switchMap(() =>
        this.api.listCourses().pipe(
          map((data: any) => TrainingActions.programsLoaded({ programs: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(TrainingActions.programsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
