export declare function findById(...args: any[]): Promise<any>;
export declare function findAll(...args: any[]): Promise<any[]>;
export declare function insert(...args: any[]): Promise<any>;
export declare class ProvisioningJobRepo {
    [key: string]: (...args: any[]) => any;
    findById(...args: any[]): Promise<any>;
    findAll(...args: any[]): Promise<any[]>;
    insert(...args: any[]): Promise<any>;
    update(...args: any[]): Promise<any>;
    remove(...args: any[]): Promise<void>;
    markFailed(...args: any[]): Promise<void>;
}
