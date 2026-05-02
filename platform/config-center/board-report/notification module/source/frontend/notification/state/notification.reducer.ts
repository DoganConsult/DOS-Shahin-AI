import { createFeature, createReducer, on } from '@ngrx/store';
import { NotificationActions, AppNotificationDto } from './notification.actions';

export interface NotificationState {
  notifications: AppNotificationDto[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  loaded: false,
  loading: false,
  error: null,
};

export const notificationFeature = createFeature({
  name: 'notification',
  reducer: createReducer(
    initialState,
    on(NotificationActions.loadHistory, (state) => ({ ...state, loading: true, error: null })),

    on(NotificationActions.historyLoaded, (state, { notifications }) => ({
      ...state,
      notifications,
      loaded: true,
      loading: false,
    })),
    on(NotificationActions.historyLoadFailed, (state, { error }) => ({ ...state, error, loading: false, loaded: true })),

    on(NotificationActions.receiveRealtime, (state, { notification }) => ({
      ...state,
      notifications: [notification, ...state.notifications],
    })),

    on(NotificationActions.markReadSuccess, (state, { id }) => ({
      ...state,
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    })),

    on(NotificationActions.markAllReadSuccess, (state) => ({
      ...state,
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    })),

    on(NotificationActions.clear, () => initialState),
  ),
});

export const {
  selectNotifications: selectAllNotifications,
  selectLoaded: selectNotificationsLoaded,
  selectLoading: selectNotificationsLoading,
  selectError: selectNotificationsError,
} = notificationFeature;

import { createSelector } from '@ngrx/store';

export const selectUnreadNotifications = createSelector(
  notificationFeature.selectNotifications,
  (notifications) => notifications.filter(n => !n.read),
);

export const selectUnreadCount = createSelector(
  selectUnreadNotifications,
  (unread) => unread.length,
);
