# Incident Response Playbook

## Severity Levels
- **SEV-1 (Critical)**: Total platform outage, Data breach explicit, or massive Tenant isolation failure.
- **SEV-2 (High)**: Major service degradation (e.g. AI-Engine offline), but platform operations can continue degraded.
- **SEV-3 (Medium)**: Single component or module failing. Localized latency spikes.
- **SEV-4 (Low)**: Non-user-facing system alerts (e.g., cron job failed).

## Escalation Path
1. **L1 (On-Call Engineer)**: Acknowledges OpsGenie/PagerDuty webhook within 15 minutes. Must determine severity.
2. **L2 (SysAdmin / DevOps)**: Escalated if L1 determines infrastructural issues (Database Down, AWS routing).
3. **L3 (Engineering Lead)**: Paged if custom application architecture has buckled explicitly requiring code revisions or immediate auto-rollbacks.

## Communication Templates

**Initial Status Page Update (SEV-1 / SEV-2)**
> **[Investigating]**: We are currently investigating degraded performance across the Shahin-AI platform. Users may experience issues loading dashboards or saving compliance frameworks. We will provide an update shortly.

**Resolution Update**
> **[Resolved]**: The issue causing degraded performance has been resolved. We tracked the issue to a localized database load lock which has been successfully mitigated. All systems are 100% operational.

## Review & Post-Mortem
Every SEV-1 and SEV-2 incident requires a mandatory post-mortem document utilizing the Five-Whys logic submitted within 72 hours of incident close.
