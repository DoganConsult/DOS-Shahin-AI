import { Router } from 'express';
import { RouteDefinition } from '@dos/platform-core';
import type { MountableRoute } from '@dos/platform-core';
export interface ParityResult {
    timestamp: string;
    manifestCount: number;
    generatedCount: number;
    structuralMatches: number;
    structuralMismatches: ParityMismatch[];
    handlerIdentityMatches: number;
    handlerIdentityMismatches: number;
    missingInGenerated: string[];
    extraInGenerated: string[];
    validationIssues: string[];
    pass: boolean;
}
export interface ParityMismatch {
    path: string;
    field: string;
    manifest: string;
    generated: string;
}
type FactoryResolver = (def: RouteDefinition) => Router | null;
export declare function runShadowParity(manifest: MountableRoute[], factoryResolvers?: Map<string, FactoryResolver>, basePath?: string): ParityResult;
export {};
