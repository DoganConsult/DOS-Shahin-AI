export declare function humanizeHeader(field: string): string;
export declare function escapeXml(str: string): string;
export declare function toCSV(data: any[], columns?: string[]): string;
export declare function toJSON(data: any[]): string;
export declare function toXML(data: any[], moduleCode: string): string;
export declare function toXLSX(data: any[], columns?: string[], sheetName?: string): Buffer;
export declare function buildZipBuffer(files: Record<string, string>): Buffer;
export declare function crc32(buf: Buffer): number;
export declare function toPDF(data: any[], title: string, columns?: string[], watermark?: string): Buffer;
