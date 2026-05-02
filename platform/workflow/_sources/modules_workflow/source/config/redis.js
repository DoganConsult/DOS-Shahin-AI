"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnected = exports.getRedis = void 0;
var db_1 = require("@dos/db");
Object.defineProperty(exports, "getRedis", { enumerable: true, get: function () { return db_1.getRedis; } });
Object.defineProperty(exports, "redisConnected", { enumerable: true, get: function () { return db_1.redisConnected; } });
