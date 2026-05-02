import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ExternalServicesActions } from './external-services.actions';

@Injectable()
export class ExternalServicesEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  checkHealth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExternalServicesActions.checkHealth),
      switchMap(() =>
        this.http.get<Record<string, boolean>>('/api/external-services/health').pipe(
          map((services) => ExternalServicesActions.healthChecked({ services })),
          catchError((err: any) => of(ExternalServicesActions.healthCheckFailed({ error: err?.message || 'Health check failed' }))),
        ),
      ),
    ),
  );

  loadCISOFrameworks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExternalServicesActions.loadCISOFrameworks),
      switchMap(() =>
        this.http.get<{ frameworks: any[] }>('/api/external-services/ciso-assistant/frameworks').pipe(
          map((data) => ExternalServicesActions.cISOFrameworksLoaded({ frameworks: data?.frameworks ?? [] })),
          catchError((err: any) => of(ExternalServicesActions.cISOFrameworksLoadFailed({ error: err?.message || 'Failed to load CISO frameworks' }))),
        ),
      ),
    ),
  );

  loadOpenProjectWorkPackages$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExternalServicesActions.loadOpenProjectWorkPackages),
      switchMap((action) =>
        this.http.get<{ workPackages: any[] }>(`/api/external-services/openproject/work-packages${'projectId' in action && action.projectId ? `?projectId=${action.projectId}` : ''}`).pipe(
          map((data) => ExternalServicesActions.openProjectWorkPackagesLoaded({ workPackages: data?.workPackages ?? [] })),
          catchError((err: any) => of(ExternalServicesActions.openProjectWorkPackagesLoadFailed({ error: err?.message || 'Failed to load work packages' }))),
        ),
      ),
    ),
  );

  loadGovReadyControls$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExternalServicesActions.loadGovReadyControls),
      switchMap((action) =>
        this.http.get<{ controls: any[] }>(`/api/external-services/govready/controls${'systemId' in action && action.systemId ? `?systemId=${action.systemId}` : ''}`).pipe(
          map((data) => ExternalServicesActions.govReadyControlsLoaded({ controls: data?.controls ?? [] })),
          catchError((err: any) => of(ExternalServicesActions.govReadyControlsLoadFailed({ error: err?.message || 'Failed to load GovReady controls' }))),
        ),
      ),
    ),
  );
}
