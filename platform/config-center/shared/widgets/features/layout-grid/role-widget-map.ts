/**
 * Role widget map — determines which dashboard widgets are visible per role.
 */
export const ROLE_WIDGET_MAP: Record<string, string[]> = {};

export function isWidgetVisibleToRole(widgetId: string, role: string): boolean {
  const allowed = ROLE_WIDGET_MAP[widgetId];
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(role) || role === 'admin' || role === 'owner';
}
