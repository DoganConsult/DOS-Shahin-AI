interface ServiceNode {
    service_id: string;
    name: string;
    service_type: string;
    criticality: string;
    status: string;
    sla_target_uptime: number | null;
    rto_hours: number | null;
    rpo_hours: number | null;
    applications: AppNode[];
    children: ServiceNode[];
}
interface AppNode {
    application_id: string;
    name: string;
    app_type: string;
    criticality: string;
    status: string;
    environment: string;
    assets: AssetNode[];
}
interface AssetNode {
    asset_id: string;
    name: string;
    type: string;
    criticality: string;
    status: string;
}
export declare function getFullServiceMap(tenantId: string): Promise<ServiceNode[]>;
export declare function getServiceImpact(tenantId: string, serviceId: string): Promise<{
    service: {
        service_id: any;
        name: any;
        criticality: any;
        sla_target_uptime: any;
    };
    impactSummary: {
        dependentServicesCount: number;
        applicationsCount: number;
        assetsCount: number;
        criticalDependents: number;
    };
    dependentServices: any[];
    applications: unknown[];
    assets: unknown[];
} | null>;
export declare function getServiceMapStats(tenantId: string): Promise<any>;
export {};
