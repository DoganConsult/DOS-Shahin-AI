/**
 * Response port — outbound interface for canonical HTTP response shaping.
 * Default impl produces a stable envelope so the module is usable standalone;
 * host can override (e.g. with @dos/module-sdk) via bindResponsePort.
 */

export type ResponseEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export type OkFn = <T>(data: T, req?: unknown) => ResponseEnvelope<T>;
export type ActionFn = (message: string, req?: unknown) => ResponseEnvelope;

let _ok: OkFn = (data) => ({ ok: true, data });
let _action: ActionFn = (message) => ({ ok: true, message });

export function bindResponsePort(impl: { ok?: OkFn; action?: ActionFn }) {
  if (impl.ok) _ok = impl.ok;
  if (impl.action) _action = impl.action;
}

export const ok: OkFn = (data, req) => _ok(data, req);
export const action: ActionFn = (message, req) => _action(message, req);
