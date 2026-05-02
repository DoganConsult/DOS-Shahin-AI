export declare function list(...args: any[]): Promise<any[]>;
export declare function getById(...args: any[]): Promise<any>;
export declare function create(...args: any[]): Promise<any>;
export declare function update(...args: any[]): Promise<any>;
export declare function remove(...args: any[]): Promise<void>;
export declare class DashboardEditorService {
    list(...args: any[]): Promise<any[]>;
    getById(...args: any[]): Promise<any>;
    create(...args: any[]): Promise<any>;
    update(...args: any[]): Promise<any>;
    remove(...args: any[]): Promise<void>;
    listAvailableWidgets(...args: any[]): Promise<any[]>;
    saveLayout(...args: any[]): Promise<any>;
    resetLayout(...args: any[]): Promise<any>;
}
