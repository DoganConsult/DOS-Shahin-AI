import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface AppNotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

export const NotificationActions = createActionGroup({
  source: 'Notification',
  events: {
    'Load History': emptyProps(),
    'History Loaded': props<{ notifications: AppNotificationDto[] }>(),
    'History Load Failed': props<{ error: string }>(),

    'Receive Realtime': props<{ notification: AppNotificationDto }>(),

    'Mark Read': props<{ id: string }>(),
    'Mark Read Success': props<{ id: string }>(),

    'Mark All Read': emptyProps(),
    'Mark All Read Success': emptyProps(),

    'Clear': emptyProps(),
  },
});
