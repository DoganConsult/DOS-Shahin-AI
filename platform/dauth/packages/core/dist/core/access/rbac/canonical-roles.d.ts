export interface RoleDef {
    code: string;
    name: string;
    description: string;
    tier: 'platform' | 'tenant' | 'module';
    isSystem: boolean;
}
export declare const CANONICAL_ROLES: RoleDef[];
