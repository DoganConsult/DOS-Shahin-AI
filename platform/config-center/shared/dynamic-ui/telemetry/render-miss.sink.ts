// render-miss.sink.ts — Phase 4 telemetry sink for Dynamic UI render misses.
//
// Replaces the inline console.warn lines in DynamicPageHostComponent /
// DynamicUiBootstrapService with a single structured emitter so that:
//   - Format stays consistent (DSOC event topic = "ui.render.miss" /
//     "ui.route.dropped").
//   - Same payload shape ships to console (dev) AND best-effort POST to
//     /api/dsoc/events (when the endpoint is reachable) for Grafana.
//   - Strict mode (DOS_DYNAMIC_UI_STRICT=1) throws on first miss so dev
//     /staging boots crash visibly rather than silently degrading.
//
// No new dependencies; the POST is fire-and-forget so backend absence
// can never break the SPA.

export type RenderMissReason =
  | 'empty_route'
  | 'missing_loader'
  | 'render_error'
  | 'missing_component_map';

export interface RenderMissEvent {
  topic: 'ui.render.miss' | 'ui.route.dropped';
  reason: RenderMissReason;
  route: string;
  widget_key?: string | null;
  zone?: string | null;
  module?: string | null;
  component_key?: string | null;
  error?: string | null;
}

const STRICT = (() => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { DOS_DYNAMIC_UI_STRICT?: boolean | string };
  return w.DOS_DYNAMIC_UI_STRICT === true || w.DOS_DYNAMIC_UI_STRICT === '1';
})();

const ENDPOINT = '/api/dsoc/events';

let queue: RenderMissEvent[] = [];
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  // Microtask-batched POST so a page render that misses N widgets results
  // in one HTTP roundtrip rather than N. fetch is fire-and-forget; if the
  // backend doesn't expose /api/dsoc/events the failed POST is swallowed.
  queueMicrotask(() => {
    flushScheduled = false;
    const batch = queue;
    queue = [];
    if (!batch.length) return;
    if (typeof fetch !== 'function') return;
    try {
      void fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      }).catch(() => { /* silent — telemetry must never break the SPA */ });
    } catch {
      /* fetch unavailable; drop on the floor */
    }
  });
}

export function notifyRenderMiss(ev: RenderMissEvent): void {
  // Always log for local dev visibility (matches Phase 0 console.warn shape).
  const tag = `[${ev.topic}]`;
  const json = JSON.stringify(ev);
  if (ev.reason === 'render_error') console.error(tag, json);
  else console.warn(tag, json);

  queue.push(ev);
  scheduleFlush();

  if (STRICT) {
    // Dev/staging surface: stop the show on the first silent skip so the
    // bug can't slip past CI into a user report.
    throw new Error(`[ui.strict] ${ev.topic}: ${json}`);
  }
}
