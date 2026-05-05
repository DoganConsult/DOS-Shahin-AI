import { safeQuery, tenantSchema } from '../../ports/database.port';
const INJECTION_PATTERNS = [
    { name: 'system_override', regex: /\b(ignore\s+(all\s+)?previous|disregard\s+(all\s+)?instructions|forget\s+(everything|all|prior))\b/i, severity: 'high' },
    { name: 'role_hijack', regex: /\b(you\s+are\s+now|act\s+as\s+if|pretend\s+(to\s+be|you're)|new\s+instructions?:)\b/i, severity: 'high' },
    { name: 'jailbreak_attempt', regex: /\b(DAN|do\s+anything\s+now|jailbreak|bypass\s+(filter|safety|guard)|unrestricted\s+mode)\b/i, severity: 'critical' },
    { name: 'data_exfil', regex: /\b(reveal\s+(your|the)\s+(system|secret|internal)|show\s+me\s+(your|the)\s+prompt|what\s+are\s+your\s+instructions)\b/i, severity: 'high' },
    { name: 'encoding_attack', regex: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|&#\d{2,4};|%[0-9a-f]{2}/gi, severity: 'medium' },
    { name: 'delimiter_injection', regex: /(\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|<<SYS>>|<\/SYS>)/i, severity: 'high' },
    { name: 'recursive_prompt', regex: /\b(repeat\s+(this|the\s+following)\s+\d+\s+times|infinite\s+loop|while\s*\(true\))\b/i, severity: 'medium' },
    { name: 'sql_injection', regex: /\b(DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+.*SET|INSERT\s+INTO|UNION\s+SELECT|;\s*--)\b/i, severity: 'critical' },
    { name: 'tool_abuse', regex: /\b(execute\s+command|run\s+shell|os\.system|subprocess|eval\(|exec\()\b/i, severity: 'critical' },
];
export function detectInjection(input) {
    const detections = [];
    let sanitized = input;
    for (const pattern of INJECTION_PATTERNS) {
        const matches = input.match(pattern.regex);
        if (matches) {
            detections.push({
                type: pattern.name,
                severity: pattern.severity,
                match: matches[0].slice(0, 100),
            });
            sanitized = sanitized.replace(pattern.regex, '[FILTERED]');
        }
        pattern.regex.lastIndex = 0;
    }
    const hasCritical = detections.some(d => d.severity === 'critical');
    const hasHigh = detections.filter(d => d.severity === 'high').length >= 2;
    return {
        safe: !hasCritical && !hasHigh,
        detections,
        sanitized,
    };
}
export async function logInjectionAttempt(tenantId, userId, agentId, input, result) {
    if (result.detections.length === 0)
        return;
    const schema = tenantSchema(tenantId);
    const maxSeverity = result.detections.reduce((max, d) => {
        const order = { critical: 3, high: 2, medium: 1, low: 0 };
        return (order[d.severity] || 0) > (order[max] || 0) ? d.severity : max;
    }, 'low');
    try {
        await safeQuery(`INSERT INTO "${schema}".prompt_injection_log
         (tenant_id, user_id, agent_id, input_preview, detection_type, severity, blocked)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
            tenantId, userId || null, agentId || null,
            input.slice(0, 500),
            result.detections.map(d => d.type).join(','),
            maxSeverity,
            !result.safe,
        ]);
    }
    catch { /* non-fatal */ }
}
export async function guardInput(tenantId, input, userId, agentId) {
    const result = detectInjection(input);
    if (result.detections.length > 0) {
        await logInjectionAttempt(tenantId, userId, agentId, input, result);
    }
    if (!result.safe) {
        return {
            allowed: false,
            sanitizedInput: result.sanitized,
            warning: `Prompt injection detected: ${result.detections.map(d => d.type).join(', ')}`,
        };
    }
    return { allowed: true, sanitizedInput: result.sanitized };
}
export async function getInjectionStats(tenantId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const stats = { total: 0, blocked: 0, byType: {} };
    try {
        const result = await safeQuery(`SELECT detection_type, blocked, COUNT(*)::int AS cnt
       FROM "${schema}".prompt_injection_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY detection_type, blocked`, [tenantId, daysBack]);
        for (const row of result.rows) {
            stats.total += row.cnt;
            if (row.blocked)
                stats.blocked += row.cnt;
            const types = (row.detection_type || '').split(',');
            for (const t of types) {
                if (t)
                    stats.byType[t] = (stats.byType[t] || 0) + row.cnt;
            }
        }
    }
    catch { /* non-fatal */ }
    return stats;
}
//# sourceMappingURL=prompt-injection-guard.service.js.map