export function correlationMiddleware(req, _res, next) {
    req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    next();
}
export default correlationMiddleware;
//# sourceMappingURL=correlation.js.map