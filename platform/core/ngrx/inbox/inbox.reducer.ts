import { createReducer, on, createFeature } from '@ngrx/store';
import { InboxActions } from './inbox.actions';

export interface InboxState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: InboxState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const inboxFeature = createFeature({
  name: 'inbox',
  reducer: createReducer(
    initialState,
    on(InboxActions.loadDashboard, InboxActions.loadMessages, InboxActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(InboxActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(InboxActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(InboxActions.messagesLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(InboxActions.messagesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(InboxActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectInboxDashboard,
  selectItems: selectInboxItems,
  selectTotal: selectInboxTotal,
  selectLoading: selectInboxLoading,
  selectError: selectInboxError,
} = inboxFeature;
