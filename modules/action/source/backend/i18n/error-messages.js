"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errMsg = errMsg;
function errMsg(errorDef, locale) {
    if (typeof errorDef === 'string')
        return errorDef;
    const loc = typeof locale === 'string' ? locale : locale?.locale ?? locale?.headers?.['accept-language'];
    if (loc === 'ar' && errorDef.messageAr)
        return errorDef.messageAr;
    return errorDef.messageEn;
}
//# sourceMappingURL=error-messages.js.map