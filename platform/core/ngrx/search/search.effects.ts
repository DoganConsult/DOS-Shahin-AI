import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SearchApiService } from '../../../features/search/services/search-api.service';
import { SearchActions } from './search.actions';

@Injectable()
export class SearchEffects {
  private actions$ = inject(Actions);
  private api = inject(SearchApiService);

  search$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(SearchActions.search),
      switchMap(({ query, module }) =>
        this.api.search(query, { module }).pipe(
          map((data: any) => SearchActions.searchResultsLoaded({ results: data.data || data.results || data, total: data.total ?? 0 })),
          catchError((err) => of(SearchActions.searchFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
