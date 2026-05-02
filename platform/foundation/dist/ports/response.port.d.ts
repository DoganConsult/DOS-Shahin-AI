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
export declare function bindResponsePort(impl: {
    ok?: OkFn;
    action?: ActionFn;
}): void;
export declare const ok: OkFn;
export declare const action: ActionFn;
