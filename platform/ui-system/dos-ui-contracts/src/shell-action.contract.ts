/**
 * Typed shell actions — UI-OS runtime emits these; shell-host dispatches only.
 * No raw route/detailRoute/evidenceUri reads in consumers — normalize at ingest.
 */

export type ShellAction =
  | { kind: 'navigate'; path: string }
  | { kind: 'open_external'; url: string }
  | { kind: 'toggle_language' }
  | { kind: 'toggle_theme' }
  | { kind: 'open_context_tab'; tab: string }
  | { kind: 'open_command' }
  | { kind: 'close_overlay'; overlay: string }
  | { kind: 'clear_error' }
  | { kind: 'dispatch_event'; name: string; detail?: unknown };

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
    case 'close_overlay': {
      const overlay = raw['overlay'];
      return typeof overlay === 'string' && overlay.trim()
        ? { kind: 'close_overlay', overlay }
        : null;
    }
    case 'clear_error':
      return { kind: 'clear_error' };
    case 'dispatch_event': {
      const name = raw['name'];
      return typeof name === 'string' && name.trim()
        ? { kind: 'dispatch_event', name, detail: raw['detail'] }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Normalize legacy route/detailRoute/evidenceUri blobs → ShellAction (single ingest point).
 */
export function shellActionFromLegacyRecord(rec: Record<string, unknown>): ShellAction | null {
  const direct = parseShellAction(rec['action']);
  if (direct) return direct;
  const route = rec['route'];
  if (typeof route === 'string' && route.trim()) return { kind: 'navigate', path: route };
  const detailRoute = rec['detailRoute'];
  if (typeof detailRoute === 'string' && detailRoute.trim()) {
    return { kind: 'navigate', path: detailRoute };
  }
  const evidenceUri = rec['evidenceUri'];
  if (typeof evidenceUri === 'string' && evidenceUri.trim()) {
    return { kind: 'open_external', url: evidenceUri };
  }
  return null;
}
