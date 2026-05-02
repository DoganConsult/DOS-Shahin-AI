export interface UserLifecycleRow {
    user_id: string;
    email: string;
    display_name: string | null;
    status?: string;
    onboarding_complete?: boolean;
    member_onboarded?: boolean;
}
export declare function onboard(tenantId: string, userId: string): Promise<UserLifecycleRow | null>;
export declare function offboard(tenantId: string, userId: string): Promise<UserLifecycleRow | null>;
export declare function suspend(tenantId: string, userId: string): Promise<UserLifecycleRow | null>;
export declare function reactivate(tenantId: string, userId: string): Promise<UserLifecycleRow | null>;
