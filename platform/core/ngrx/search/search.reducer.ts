import { createReducer, on, createFeature } from '@ngrx/store';
import { SearchActions } from './search.actions';

export interface SearchState {
  query: string;
  results: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  query: '',
  results: [],
  total: 0,
  loading: false,
  error: null,
};

export const searchFeature = createFeature({
  name: 'search',
  reducer: createReducer(
    initialState,
    on(SearchActions.search, (state, { query }) => ({ ...state, query, loading: true, error: null })),
    on(SearchActions.searchResultsLoaded, (state, { results, total }) => ({ ...state, results, total, loading: false })),
    on(SearchActions.searchFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(SearchActions.clearResults, () => initialState),
  ),
});

export const {
  selectQuery: selectSearchQuery,
  selectResults: selectSearchResults,
  selectTotal: selectSearchTotal,
  selectLoading: selectSearchLoading,
  selectError: selectSearchError,
} = searchFeature;
