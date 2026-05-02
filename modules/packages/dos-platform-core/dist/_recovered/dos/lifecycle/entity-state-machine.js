"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityStateMachine = void 0;
class EntityStateMachine {
    constructor(_cfg) { }
    canTransition(_from, _to) { return true; }
    transition(_from, _to) { return _to; }
}
exports.EntityStateMachine = EntityStateMachine;
exports.default = EntityStateMachine;
//# sourceMappingURL=entity-state-machine.js.map