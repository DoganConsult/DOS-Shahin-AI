"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fgaClient = void 0;
// @ts-nocheck — module-layer imports not yet extracted
const sdk_1 = require("@openfga/sdk");
exports.fgaClient = new sdk_1.OpenFgaClient({
    apiUrl: process.env.FGA_API_URL || 'http://localhost:8080',
    storeId: process.env.FGA_STORE_ID || 'default-store',
    authorizationModelId: process.env.FGA_MODEL_ID,
});
//# sourceMappingURL=fga-client.js.map