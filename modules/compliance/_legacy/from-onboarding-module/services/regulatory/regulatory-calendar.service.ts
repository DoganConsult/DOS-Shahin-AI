export async function getRegulatoryCalendar(_tenantId: string) {
  return { deadlines: [], nextAudit: null };
}
export async function seedRegulatoryCalendar(_tenantId: string, _frameworks: string[]) {
  return { seeded: true };
}

export async function seedRegulatoryCalendarFromFrameworks(tenantId: string, frameworkIds: string[]) {
  let seeded = 0;
  const errors: any[] = [];
  for (const fid of frameworkIds) {
    try { await seedRegulatoryCalendar(tenantId, [fid]); seeded++; }
    catch (err) { errors.push(err); }
  }
  return { seeded, errors };
}
