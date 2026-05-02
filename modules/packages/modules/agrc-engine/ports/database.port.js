"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyResult = exports.tenantSchema = exports.assertTenantId = exports.safeQuery = exports.getPool = exports.query = void 0;
var db_1 = require("@dos/db");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return db_1.query; } });
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return db_1.getPool; } });
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
var db_2 = require("@dos/db");
Object.defineProperty(exports, "assertTenantId", { enumerable: true, get: function () { return db_2.assertTenantId; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_2.tenantSchema; } });
var db_3 = require("@dos/db");
Object.defineProperty(exports, "emptyResult", { enumerable: true, get: function () { return db_3.emptyResult; } });
//# sourceMappingURL=database.port.js.map