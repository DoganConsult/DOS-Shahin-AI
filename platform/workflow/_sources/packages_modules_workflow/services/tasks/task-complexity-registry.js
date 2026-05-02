"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskComplexity = registerTaskComplexity;
exports.getTaskComplexity = getTaskComplexity;
exports.getAllTaskComplexities = getAllTaskComplexities;
const _registry = new Map();
function registerTaskComplexity(taskType, tier) {
    _registry.set(taskType, tier);
}
function getTaskComplexity(taskType) {
    return _registry.get(taskType);
}
function getAllTaskComplexities() {
    return new Map(_registry);
}
//# sourceMappingURL=task-complexity-registry.js.map