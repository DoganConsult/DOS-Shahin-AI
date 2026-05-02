"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifest = void 0;
// Typed manifest helper — re-exports module.manifest.json with strong types.
// Resolves the `./manifest` subpath in package.json exports.
const module_manifest_json_1 = __importDefault(require("./module.manifest.json"));
exports.manifest = module_manifest_json_1.default;
exports.default = module_manifest_json_1.default;
//# sourceMappingURL=foundation.manifest.js.map