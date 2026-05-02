"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAbacFactory = initAbacFactory;
exports.getAbacAdapter = getAbacAdapter;
exports.resetAbacFactory = resetAbacFactory;
const abac_port_1 = require("./dauth-ports/abac.port");
let cached = null;
function initAbacFactory(options = {}) {
    const native = options.native ?? new abac_port_1.AbstainAbacAdapter();
    const cerbos = options.cerbos;
    const shadow = options.shadow ?? false;
    const enforce = options.enforce ?? false;
    if (enforce && cerbos) {
        cached = {
            primary: cerbos,
            shadow: shadow ? native : undefined,
        };
    }
    else if (shadow && cerbos) {
        cached = { primary: native, shadow: cerbos };
    }
    else {
        cached = { primary: native };
    }
    return cached;
}
function getAbacAdapter() {
    if (!cached) {
        cached = { primary: new abac_port_1.AbstainAbacAdapter() };
    }
    return cached;
}
function resetAbacFactory() {
    cached = null;
}
//# sourceMappingURL=abac-factory.js.map