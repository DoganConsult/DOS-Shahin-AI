import type { Express, Router } from 'express';
import { bindDatabasePort, bindLoggerPort, bindMiddlewarePort, bindResponsePort, bindResiliencePort, bindLifecyclePort, bindBlueprintPort, bindAiPort } from './ports';
import { type FoundationAggregatorDeps } from './interface/http/foundation-aggregator.routes';
import manifest from './module.manifest.json';
export interface FoundationHostBindings {
    database?: Parameters<typeof bindDatabasePort>[0];
    logger?: Parameters<typeof bindLoggerPort>[0];
    middleware?: Parameters<typeof bindMiddlewarePort>[0];
    response?: Parameters<typeof bindResponsePort>[0];
    resilience?: Parameters<typeof bindResiliencePort>[0];
    lifecycle?: Parameters<typeof bindLifecyclePort>[0];
    blueprint?: Parameters<typeof bindBlueprintPort>[0];
    ai?: Parameters<typeof bindAiPort>[0];
}
export interface RegisterFoundationOptions extends FoundationHostBindings {
    app?: Express;
    mountPath?: string;
    aggregatorDeps?: FoundationAggregatorDeps;
}
export interface RegisterFoundationResult {
    moduleCode: string;
    routeBase: string;
    router: Router;
    healthRouter: Router;
    manifest: typeof manifest;
}
export declare function bindFoundationPorts(bindings?: FoundationHostBindings): void;
export declare function registerFoundation(options?: RegisterFoundationOptions): RegisterFoundationResult;
export declare function onInstall(ctx?: {
    tenantId?: string;
}): Promise<void>;
export declare function onActivate(ctx?: {
    tenantId?: string;
}): Promise<void>;
export declare function onMigrate(ctx?: {
    tenantId?: string;
    toVersion?: string;
}): Promise<void>;
export declare function onUninstall(ctx?: {
    tenantId?: string;
}): Promise<void>;
export default registerFoundation;
