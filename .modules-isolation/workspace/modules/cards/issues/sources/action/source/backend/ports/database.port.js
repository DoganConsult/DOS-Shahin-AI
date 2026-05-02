"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantClient = exports.withTenantClient = exports.withClient = exports.emptyResult = exports.assertTenantId = exports.tenantSchema = exports.getPool = exports.safeQuery = exports.query = void 0;
// Backend-level database port barrel — used by services that live at
// modules/<mod>/source/backend/<sub>/... importing via `../../ports/database.port`.
var db_1 = require("@dos/db");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return db_1.query; } });
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return db_1.getPool; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
Object.defineProperty(exports, "assertTenantId", { enumerable: true, get: function () { return db_1.assertTenantId; } });
Object.defineProperty(exports, "emptyResult", { enumerable: true, get: function () { return db_1.emptyResult; } });
Object.defineProperty(exports, "withClient", { enumerable: true, get: function () { return db_1.withClient; } });
Object.defineProperty(exports, "withTenantClient", { enumerable: true, get: function () { return db_1.withTenantClient; } });
Object.defineProperty(exports, "getTenantClient", { enumerable: true, get: function () { return db_1.getTenantClient; } });
//# sourceMappingURL=database.port.js.map