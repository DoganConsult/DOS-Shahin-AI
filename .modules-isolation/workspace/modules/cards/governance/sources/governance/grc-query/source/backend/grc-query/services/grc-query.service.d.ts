import { GrcQueryResultContract, GrcSavedQueryContract } from '../contracts/grc-query.contract';
export declare function unifiedSearch(tenantId: string, userId: string, query: string, _limit?: number, _modules?: string[]): Promise<GrcQueryResultContract>;
export declare function federatedSearch(tenantId: string, userId: string, dsl: any, _limit?: number, _modules?: string[]): Promise<GrcQueryResultContract>;
export declare function nlqSearch(tenantId: string, userId: string, prompt: string, _limit?: number): Promise<GrcQueryResultContract>;
export declare function saveQuery(tenantId: string, userId: string, name: string, dsl: any, isPublic?: boolean): Promise<GrcSavedQueryContract>;
export declare function listSavedQueries(tenantId: string, userId: string): Promise<GrcSavedQueryContract[]>;
export declare function deleteSavedQuery(tenantId: string, userId: string, queryId: string): Promise<void>;
