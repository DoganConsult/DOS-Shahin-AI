export declare function list(...args: any[]): Promise<any[]>;
export declare function getById(...args: any[]): Promise<any>;
export declare function create(...args: any[]): Promise<any>;
export declare function update(...args: any[]): Promise<any>;
export declare function remove(...args: any[]): Promise<void>;
export declare class ProvisioningOrchestratorService {
    [key: string]: (...args: any[]) => any;
    list(...args: any[]): Promise<any[]>;
    getById(...args: any[]): Promise<any>;
    create(...args: any[]): Promise<any>;
    update(...args: any[]): Promise<any>;
    remove(...args: any[]): Promise<void>;
    approve(...args: any[]): Promise<any>;
    startProvisioning(...args: any[]): Promise<any>;
    getTemporalStatus(...args: any[]): Promise<any>;
    retryProvisioning(...args: any[]): Promise<any>;
    cancelProvisioning(...args: any[]): Promise<any>;
}
