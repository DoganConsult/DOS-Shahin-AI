import type { WidgetStatus } from '../contracts/widgets.contracts';

export const WIDGET_STATES: readonly WidgetStatus[] = [
  'draft', 'registered', 'active', 'deprecated', 'archived',
] as const;

export const WIDGET_TRANSITIONS: Record<WidgetStatus, WidgetStatus[]> = {
  draft: ['registered', 'archived'],
  registered: ['active', 'draft', 'archived'],
  active: ['deprecated', 'archived'],
  deprecated: ['archived'],
  archived: [],
};

export const WIDGET_TERMINAL_STATES: readonly WidgetStatus[] = ['archived'];

export function isValidWidgetTransition(from: WidgetStatus, to: WidgetStatus): boolean {
  return WIDGET_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isWidgetTerminal(state: WidgetStatus): boolean {
  return WIDGET_TERMINAL_STATES.includes(state);
}
