import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const SearchActions = createActionGroup({
  source: 'Search',
  events: {
    'Search': props<{ query: string; module?: string }>(),
    'Search Results Loaded': props<{ results: any[]; total: number }>(),
    'Search Failed': props<{ error: string }>(),
    'Clear Results': emptyProps(),
  },
});
