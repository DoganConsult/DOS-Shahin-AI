export declare function getRegulatoryCalendar(_tenantId: string): Promise<{
    deadlines: never[];
    nextAudit: null;
}>;
export declare function seedRegulatoryCalendar(_tenantId: string, _frameworks: string[]): Promise<{
    seeded: boolean;
}>;
export declare function seedRegulatoryCalendarFromFrameworks(tenantId: string, frameworkIds: string[]): Promise<{
    seeded: number;
    errors: any[];
}>;
