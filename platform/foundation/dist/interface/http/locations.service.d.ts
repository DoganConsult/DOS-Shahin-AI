export interface Location {
    location_id: string;
    tenant_id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
    location_type: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    parent_location_id: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreateLocationInput {
    name_en: string;
    name_ar?: string;
    code?: string;
    location_type?: string;
    country?: string;
    city?: string;
    address?: string;
    parent_location_id?: string;
    latitude?: number;
    longitude?: number;
    status?: string;
    description?: string;
}
export type UpdateLocationInput = Partial<CreateLocationInput>;
export declare function listLocations(tenantId: string, opts?: {
    page?: number;
    pageSize?: number;
    location_type?: string;
    country?: string;
    parent_id?: string;
    search?: string;
}): Promise<{
    data: Location[];
    total: number;
}>;
export declare function getLocation(tenantId: string, id: string): Promise<Location | null>;
export declare function listChildLocations(tenantId: string, parentId: string): Promise<Location[]>;
export declare function listLocationBUs(tenantId: string, locationId: string): Promise<any[]>;
export declare function createLocation(tenantId: string, input: CreateLocationInput, actorId: string): Promise<Location>;
export declare function updateLocation(tenantId: string, id: string, input: UpdateLocationInput): Promise<Location | null>;
export declare function deleteLocation(tenantId: string, id: string): Promise<boolean>;
export declare function assignBuToLocation(tenantId: string, locationId: string, buId: string): Promise<void>;
export declare function removeBuFromLocation(tenantId: string, locationId: string, buId: string): Promise<void>;
