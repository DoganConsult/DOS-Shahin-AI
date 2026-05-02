import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AiGovernanceApiService } from '../../../features/ai-governance/services/ai-governance-api.service';
import { AiGovernanceActions } from './ai-governance.actions';

@Injectable()
export class AiGovernanceEffects {
  private actions$ = inject(Actions);
  private api = inject(AiGovernanceApiService);

  loadAssets$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AiGovernanceActions.loadAssets, AiGovernanceActions.loadAll),
      switchMap(() =>
        this.api.listAssets().pipe(
          map((data: any) => AiGovernanceActions.assetsLoaded({ assets: data?.assets ?? data?.items ?? [] })),
          catchError((err) => of(AiGovernanceActions.assetsLoadFailed({ error: err?.message || 'Failed to load AI assets' }))),
        ),
      ),
    ),
  );

  loadModelsRequiringAssessment$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AiGovernanceActions.loadModelsRequiringAssessment, AiGovernanceActions.loadAll),
      switchMap(() =>
        this.api.getModelsRequiringAssessment().pipe(
          map((data: any) => AiGovernanceActions.modelsRequiringAssessmentLoaded({ models: data?.models ?? data ?? [] })),
          catchError((err) => of(AiGovernanceActions.modelsRequiringAssessmentLoadFailed({ error: err?.message || 'Failed to load models requiring assessment' }))),
        ),
      ),
    ),
  );
}
