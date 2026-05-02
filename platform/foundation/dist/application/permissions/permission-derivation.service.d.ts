interface PermissionChain {
    user_id: string;
    platform_role: string;
    access_profile_code: string | null;
    bundles: string[];
    functional_roles: string[];
    permissions: string[];
    module_codes: string[];
    authority_levels: Record<string, string>;
}
export declare function deriveUserPermissions(tenantId: string, userId: string): Promise<PermissionChain>;
export declare function deriveVisibleModules(tenantId: string, userId: string): Promise<string[]>;
export declare function deriveNavigation(tenantId: string, userId: string): Promise<{
    visible_modules: string[];
    landing_page: string;
    dashboard_widgets: string[];
}>;
export declare function userHasPermission(tenantId: string, userId: string, permissionCode: string): Promise<boolean>;
export {};
