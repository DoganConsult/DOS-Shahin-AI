import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface IncidentItemDto {
  incidentId: string;
  title: string;
  severity: string;
  status: string;
  reportedAt: string;
  assignedTo: string | null;
  category: string;
}

export const IncidentActions = createActionGroup({
  source: 'Incident',
  events: {
    'Load Incidents': emptyProps(),
    'Incidents Loaded': props<{ incidents: IncidentItemDto[] }>(),
    'Incidents Load Failed': props<{ error: string }>(),

    'Load Near Misses': emptyProps(),
    'Near Misses Loaded': props<{ nearMisses: IncidentItemDto[] }>(),
    'Near Misses Load Failed': props<{ error: string }>(),

    'Load Trends': emptyProps(),
    'Trends Loaded': props<{ trends: Record<string, unknown> }>(),
    'Trends Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});
