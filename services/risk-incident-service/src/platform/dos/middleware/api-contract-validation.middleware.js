"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiContractValidation = createApiContractValidation;
const module_sdk_1 = require("@dos/module-sdk");
function sendValidationError(res, message, details) {
    res.status(400).json({
        error: 'CONTRACT_VIOLATION',
        message,
        details,
    });
}
function createApiContractValidation(options = {}) {
    const { strict = false, allowUnknownQueryParams = true, requiredHeaders = [], maxBodySizeBytes = 10 * 1024 * 1024, logViolations = true, } = options;
    return (req, res, next) => {
        try {
            for (const header of requiredHeaders) {
                if (!req.headers[header.toLowerCase()]) {
                    if (logViolations) {
                        module_sdk_1.logger.warn({ path: req.path, header }, '[ContractValidation] missing required header');
                    }
                    sendValidationError(res, `Required header '${header}' is missing`);
                    return;
                }
            }
            const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
            if (!isNaN(contentLength) && contentLength > maxBodySizeBytes) {
                if (logViolations) {
                    module_sdk_1.logger.warn({ path: req.path, contentLength, maxBodySizeBytes }, '[ContractValidation] body too large');
                }
                res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds maximum allowed size' });
                return;
            }
            if (strict && !allowUnknownQueryParams) {
                const knownParams = ['page', 'limit', 'offset', 'sort', 'order', 'search', 'filter', 'tenant_id'];
                const unknownParams = Object.keys(req.query).filter((k) => !knownParams.includes(k));
                if (unknownParams.length > 0) {
                    if (logViolations) {
                        module_sdk_1.logger.warn({ path: req.path, unknownParams }, '[ContractValidation] unknown query params');
                    }
                    sendValidationError(res, 'Unknown query parameters', { unknownParams });
                    return;
                }
            }
            next();
        }
        catch (err) {
            module_sdk_1.logger.error({ err, path: req.path }, '[ContractValidation] middleware error');
            next(err);
        }
    };
}
//# sourceMappingURL=api-contract-validation.middleware.js.map