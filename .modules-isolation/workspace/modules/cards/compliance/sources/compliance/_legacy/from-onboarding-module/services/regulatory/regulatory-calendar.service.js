"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegulatoryCalendar = getRegulatoryCalendar;
exports.seedRegulatoryCalendar = seedRegulatoryCalendar;
exports.seedRegulatoryCalendarFromFrameworks = seedRegulatoryCalendarFromFrameworks;
async function getRegulatoryCalendar(_tenantId) {
    return { deadlines: [], nextAudit: null };
}
async function seedRegulatoryCalendar(_tenantId, _frameworks) {
    return { seeded: true };
}
async function seedRegulatoryCalendarFromFrameworks(tenantId, frameworkIds) {
    let seeded = 0;
    const errors = [];
    for (const fid of frameworkIds) {
        try {
            await seedRegulatoryCalendar(tenantId, [fid]);
            seeded++;
        }
        catch (err) {
            errors.push(err);
        }
    }
    return { seeded, errors };
}
//# sourceMappingURL=regulatory-calendar.service.js.map