"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.eventBus = void 0;
// Backend-level events port barrel — used by services that live at
// modules/<mod>/source/backend/<sub>/... importing via `../../ports/events.port`.
var module_sdk_1 = require("@dos/module-sdk");
exports.eventBus = {
    publish: function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return (_a = (0, module_sdk_1.getEventBus)()).publish.apply(_a, args);
    },
    subscribe: function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return (_a = (0, module_sdk_1.getEventBus)()).subscribe.apply(_a, args);
    },
};
exports.emitEvent = module_sdk_1.publishEvent;
