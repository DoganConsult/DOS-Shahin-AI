/**
 * Typed shell actions — UI-OS runtime emits these; shell-host dispatches only.
 * No raw route reads in consumers — normalize at ingest.
 */

export type ShellDispatchEventName =
  | 'ai.control.open_sod_review'
  | 'ai.control.open_explainability'
  | 'ai.control.execute_simulation'
  | (string & {});

export type ShellAction =
  | { kind: 'navigate'; path: string }
  | { kind: 'open_external'; url: string }
  | { kind: 'toggle_language' }
  | { kind: 'toggle_theme' }
  | { kind: 'open_context_tab'; tab: string }
  | { kind: 'open_command' }
  | { kind: 'close_overlay' }
  | { kind: 'clear_error' }
  | { kind: 'dispatch_event'; eventName: ShellDispatchEventName; payload?: Record<string, unknown> };

/** Banner row after UI-OS chrome resolution + live merge (title/message are resolved strings). */
export interface ShellBanner {
  id: string;
  kind: 'info' | 'warning' | 'error' | 'success' | 'danger';
  title: string;
  message?: string;
  subtitle?: string;
  actionLabel?: string;
  /** Primary action — replaces legacy actionRoute. */
  action?: ShellAction;
  dismissible?: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Parse UI-OS JSON action shape into ShellAction; invalid → null.
 */
export function parseShellAction(raw: unknown): ShellAction | null {
  if (!isRecord(raw)) return null;
  const kind = raw['kind'];
  if (typeof kind !== 'string') return null;
  switch (kind) {
    case 'navigate': {
      const path = raw['path'];
      return typeof path === 'string' && path.trim() ? { kind: 'navigate', path } : null;
    }
    case 'open_external': {
      const url = raw['url'];
      return typeof url === 'string' && url.trim() ? { kind: 'open_external', url } : null;
    }
    case 'toggle_language':
      return { kind: 'toggle_language' };
    case 'toggle_theme':
      return { kind: 'toggle_theme' };
    case 'open_context_tab': {
      const tab = raw['tab'];
      return typeof tab === 'string' && tab.trim() ? { kind: 'open_context_tab', tab } : null;
    }
    case 'open_command':
      return { kind: 'open_command' };
    case 'close_overlay':
      return { kind: 'close_overlay' };
    case 'clear_error':
      return { kind: 'clear_error' };
    case 'dispatch_event': {
      const eventName = raw['eventName'];
      const payload = raw['payload'];
      return typeof eventName === 'string' && eventName.trim()
        ? { kind: 'dispatch_event', eventName, payload: (payload && typeof payload === 'object' && !Array.isArray(payload)) ? payload as Record<string, unknown> : undefined }
        : null;
    }
    default:
      return null;
  }
}
