"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRegisteredEventTypes = exports.resetEventBackboneForTesting = exports.initEventBackbone = exports.registerEventType = exports.subscribe = exports.emitEvent = exports.publish = exports.eventBus = exports.DeadLetterQueue = exports.createDualPublishBridge = exports.createEventBackbone = exports.DualPublishBridge = exports.RedisStreamEventBus = void 0;
var redis_stream_bus_1 = require("./redis-stream-bus");
Object.defineProperty(exports, "RedisStreamEventBus", { enumerable: true, get: function () { return redis_stream_bus_1.RedisStreamEventBus; } });
var bridge_1 = require("./bridge");
Object.defineProperty(exports, "DualPublishBridge", { enumerable: true, get: function () { return bridge_1.DualPublishBridge; } });
var factory_1 = require("./factory");
Object.defineProperty(exports, "createEventBackbone", { enumerable: true, get: function () { return factory_1.createEventBackbone; } });
Object.defineProperty(exports, "createDualPublishBridge", { enumerable: true, get: function () { return factory_1.createDualPublishBridge; } });
var dead_letter_queue_1 = require("./dead-letter-queue");
Object.defineProperty(exports, "DeadLetterQueue", { enumerable: true, get: function () { return dead_letter_queue_1.DeadLetterQueue; } });
// Canonical public contract for consumers (workflow engine, agent services,
// tenant-service, foundation modules). See singleton.ts for the rationale.
var singleton_1 = require("./singleton");
Object.defineProperty(exports, "eventBus", { enumerable: true, get: function () { return singleton_1.eventBus; } });
Object.defineProperty(exports, "publish", { enumerable: true, get: function () { return singleton_1.publish; } });
Object.defineProperty(exports, "emitEvent", { enumerable: true, get: function () { return singleton_1.emitEvent; } });
Object.defineProperty(exports, "subscribe", { enumerable: true, get: function () { return singleton_1.subscribe; } });
Object.defineProperty(exports, "registerEventType", { enumerable: true, get: function () { return singleton_1.registerEventType; } });
Object.defineProperty(exports, "initEventBackbone", { enumerable: true, get: function () { return singleton_1.initEventBackbone; } });
Object.defineProperty(exports, "resetEventBackboneForTesting", { enumerable: true, get: function () { return singleton_1.resetEventBackboneForTesting; } });
Object.defineProperty(exports, "listRegisteredEventTypes", { enumerable: true, get: function () { return singleton_1.listRegisteredEventTypes; } });
//# sourceMappingURL=index.js.map