"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errMsg = errMsg;
/**
 * Internationalized error message helper.
 * Returns the English message by default; uses Arabic if locale is 'ar'.
 */
function errMsg(errorDef, locale) {
    if (typeof errorDef === 'string')
        return errorDef;
    const loc = typeof locale === 'string' ? locale : locale?.locale;
    if (loc === 'ar' && errorDef.messageAr)
        return errorDef.messageAr;
    return errorDef.messageEn;
}
//# sourceMappingURL=error-messages.js.map