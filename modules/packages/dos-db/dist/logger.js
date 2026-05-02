"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDbLogger = setDbLogger;
exports.getDbLogger = getDbLogger;
const pino_1 = __importDefault(require("pino"));
let _logger = (0, pino_1.default)({ name: 'dos-db', level: process.env.LOG_LEVEL || 'info' });
function setDbLogger(logger) {
    _logger = logger;
}
function getDbLogger() {
    return _logger;
}
//# sourceMappingURL=logger.js.map