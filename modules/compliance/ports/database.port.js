"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTenantId = exports.getTenantClient = exports.withTenantClient = exports.withTransaction = exports.safeQueryWithClient = exports.emptyResult = exports.query = exports.tenantSchema = exports.safeQuery = void 0;
var db_1 = require("@dos/db");
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return db_1.query; } });
Object.defineProperty(exports, "emptyResult", { enumerable: true, get: function () { return db_1.emptyResult; } });
Object.defineProperty(exports, "safeQueryWithClient", { enumerable: true, get: function () { return db_1.safeQueryWithClient; } });
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return db_1.withTransaction; } });
Object.defineProperty(exports, "withTenantClient", { enumerable: true, get: function () { return db_1.withTenantClient; } });
Object.defineProperty(exports, "getTenantClient", { enumerable: true, get: function () { return db_1.getTenantClient; } });
var db_2 = require("@dos/db");
Object.defineProperty(exports, "assertTenantId", { enumerable: true, get: function () { return db_2.assertTenantId; } });
//# sourceMappingURL=database.port.js.map