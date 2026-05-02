"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toErrorMessage = toErrorMessage;
function toErrorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
//# sourceMappingURL=errors.js.map