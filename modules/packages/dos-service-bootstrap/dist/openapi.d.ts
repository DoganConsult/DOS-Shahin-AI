import { Express } from 'express';
export interface OpenApiConfig {
    serviceCode: string;
    version?: string;
    description?: string;
    apiBase?: string;
}
export declare function setupServiceOpenApi(app: Express, config: OpenApiConfig): void;
//# sourceMappingURL=openapi.d.ts.map