/**
 * Internationalized error message helper.
 * Returns the English message by default; uses Arabic if locale is 'ar'.
 */
export declare function errMsg(errorDef: string | {
    messageEn: string;
    messageAr?: string;
}, locale?: any): string;
