export interface KsaSector {
    code: string;
    nameEn: string;
    nameAr: string;
    parentCode?: string;
    regulators: string[];
    mandatoryFrameworks: string[];
}
export declare const KSA_SECTORS: KsaSector[];
