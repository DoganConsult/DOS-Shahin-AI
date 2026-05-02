"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterGetFirst = exports.masterQuery = exports.withTransactionIsolation = exports.withTransaction = exports.assertTenantId = exports.withTenantClient = exports.getTenantClient = exports.tenantScopedQuery = exports.tenantSchema = exports.closeServicePool = exports.createServicePool = exports.closePool = exports.getPool = exports.withPoolClient = exports.withClient = exports.getClient = exports.safeQueryWithClient = exports.safeQuery = exports.query = void 0;
// Barrel re-export of @dos/db platform surface.
// Pattern matches modules/onboarding/source/config/database.ts;
// module backends dynamically import from '../../../config/database.js'.
var db_1 = require("@dos/db");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return db_1.query; } });
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
Object.defineProperty(exports, "safeQueryWithClient", { enumerable: true, get: function () { return db_1.safeQueryWithClient; } });
Object.defineProperty(exports, "getClient", { enumerable: true, get: function () { return db_1.getClient; } });
Object.defineProperty(exports, "withClient", { enumerable: true, get: function () { return db_1.withClient; } });
Object.defineProperty(exports, "withPoolClient", { enumerable: true, get: function () { return db_1.withPoolClient; } });
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return db_1.getPool; } });
Object.defineProperty(exports, "closePool", { enumerable: true, get: function () { return db_1.closePool; } });
Object.defineProperty(exports, "createServicePool", { enumerable: true, get: function () { return db_1.createServicePool; } });
Object.defineProperty(exports, "closeServicePool", { enumerable: true, get: function () { return db_1.closeServicePool; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
Object.defineProperty(exports, "tenantScopedQuery", { enumerable: true, get: function () { return db_1.tenantScopedQuery; } });
Object.defineProperty(exports, "getTenantClient", { enumerable: true, get: function () { return db_1.getTenantClient; } });
Object.defineProperty(exports, "withTenantClient", { enumerable: true, get: function () { return db_1.withTenantClient; } });
Object.defineProperty(exports, "assertTenantId", { enumerable: true, get: function () { return db_1.assertTenantId; } });
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return db_1.withTransaction; } });
Object.defineProperty(exports, "withTransactionIsolation", { enumerable: true, get: function () { return db_1.withTransactionIsolation; } });
Object.defineProperty(exports, "masterQuery", { enumerable: true, get: function () { return db_1.masterQuery; } });
Object.defineProperty(exports, "masterGetFirst", { enumerable: true, get: function () { return db_1.masterGetFirst; } });
//# sourceMappingURL=database.js.map