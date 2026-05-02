"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_EVENT_SCHEMAS = exports.FOUNDATION_EVENT_ENVELOPE_SCHEMA = void 0;
const foundation_event_envelope_schema_json_1 = __importDefault(require("./foundation.event-envelope.schema.json"));
exports.FOUNDATION_EVENT_ENVELOPE_SCHEMA = foundation_event_envelope_schema_json_1.default;
exports.FOUNDATION_EVENT_SCHEMAS = {
    envelope: foundation_event_envelope_schema_json_1.default,
};
//# sourceMappingURL=index.js.map