"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantSchema = exports.safeQuery = void 0;
exports.getClient = getClient;
var database_port_1 = require("../ports/database.port");
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return database_port_1.query; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return database_port_1.tenantSchema; } });
const database_port_2 = require("../ports/database.port");
async function getClient() {
    const pool = (0, database_port_2.getPool)();
    if (pool && typeof pool.connect === 'function') {
        return pool.connect();
    }
    return pool;
}
//# sourceMappingURL=database.js.map