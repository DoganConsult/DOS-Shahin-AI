export interface CorsConfigOptions {
    serviceCode: string;
    additionalOrigins?: string[];
}
interface CorsOptions {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
}
export declare function createCorsConfig(options?: CorsConfigOptions): CorsOptions;
export {};
