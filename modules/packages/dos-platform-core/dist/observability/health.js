"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeHealthContext = initializeHealthContext;
exports.healthCheck = healthCheck;
const os = __importStar(require("os"));
// Configured externally per service
let pgPool = null;
let redisClient = null;
function initializeHealthContext(pool, redis) {
    pgPool = pool;
    redisClient = redis;
}
async function healthCheck(req, res) {
    const health = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        git_sha: process.env.GIT_COMMIT_SHA || 'unknown',
        last_deploy: process.env.LAST_DEPLOY_TIME || 'unknown',
        system: {
            load: os.loadavg(),
            memory_free: os.freemem(),
            memory_total: os.totalmem()
        },
        dependencies: {
            database: 'unknown',
            redis: 'unknown'
        },
        tracing: {
            sampled: process.env.OTEL_TRACING_ENABLED === 'true',
            success_rate: '10%',
            error_rate: '100% (Forced)'
        }
    };
    try {
        if (pgPool) {
            await pgPool.query('SELECT 1');
            health.dependencies.database = 'connected';
        }
        else {
            health.dependencies.database = 'unconfigured';
        }
        if (redisClient) {
            await redisClient.ping();
            health.dependencies.redis = 'connected';
        }
        else {
            health.dependencies.redis = 'unconfigured';
        }
        res.status(200).json(health);
    }
    catch (error) {
        health.status = 'degraded';
        if (error instanceof Error) {
            health.dependencies.database = error.message;
        }
        // Push manual error spans if open-telemetry is running for 100% mapping tracking
        const spanHeader = req.headers['x-b3-traceid'];
        if (spanHeader) {
            // Logic pushing failing dependency span to tracer interface would exist here
        }
        res.status(503).json(health);
    }
}
//# sourceMappingURL=health.js.map