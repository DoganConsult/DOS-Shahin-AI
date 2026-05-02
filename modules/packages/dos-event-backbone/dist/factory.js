"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBackbone = createEventBackbone;
exports.createDualPublishBridge = createDualPublishBridge;
const redis_stream_bus_1 = require("./redis-stream-bus");
const bridge_1 = require("./bridge");
function createEventBackbone(config) {
    return new redis_stream_bus_1.RedisStreamEventBus(config);
}
function createDualPublishBridge(config, legacyPublish) {
    const backbone = new redis_stream_bus_1.RedisStreamEventBus(config);
    return new bridge_1.DualPublishBridge(backbone, legacyPublish);
}
//# sourceMappingURL=factory.js.map