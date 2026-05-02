import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { VendorApiService } from '../../../features/vendor-risk/services/vendor-api.service';
import { VendorActions } from './vendor.actions';

@Injectable()
export class VendorEffects {
  private actions$ = inject(Actions);
  private api = inject(VendorApiService);

  loadVendors$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(VendorActions.loadVendors, VendorActions.loadAll),
      switchMap(() =>
        this.api.getVendors().pipe(
          map((vendors) => VendorActions.vendorsLoaded({ vendors: (vendors || []) as any })),
          catchError((err) => of(VendorActions.vendorsLoadFailed({ error: err?.message || 'Failed to load vendors' }))),
        ),
      ),
    ),
  );

  loadRiskProfiles$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(VendorActions.loadRiskProfiles, VendorActions.loadAll),
      switchMap(() =>
        this.api.getVendorRiskProfiles().pipe(
          map((profiles) => VendorActions.riskProfilesLoaded({ profiles: (profiles || []) as any })),
          catchError((err) => of(VendorActions.riskProfilesLoadFailed({ error: err?.message || 'Failed to load vendor risk profiles' }))),
        ),
      ),
    ),
  );

  loadSLABreaches$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(VendorActions.loadSLABreaches, VendorActions.loadAll),
      switchMap(() =>
        this.api.getSLABreaches().pipe(
          map((breaches) => VendorActions.sLABreachesLoaded({ breaches: (breaches || []) as any })),
          catchError((err) => of(VendorActions.sLABreachesLoadFailed({ error: err?.message || 'Failed to load SLA breaches' }))),
        ),
      ),
    ),
  );
}
