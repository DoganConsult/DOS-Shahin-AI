/**
 * DosCommandCenter — §26.2 universal "Command Center" composition.
 *
 * The Command Center is the canonical layout used by EVERY module
 * overview page (and only overview pages, per §30.4). It composes:
 *
 *   • KPI strip            — module-overview KPIs only
 *   • Work queue           — approvals + tasks for the current user
 *   • Risk / readiness     — top signals
 *   • AI recommendations   — agent-driven cards
 *   • Pending approvals    — workflow-attached
 *   • Recent activity      — module-scoped audit trail
 *   • Quick actions        — contract-derived buttons
 *
 * The component does NOT fetch data; it renders pre-resolved slots so
 * §3.4 "Render from resolved contract" stays clean. The component does
 * NOT know about modules — §1.1 shell knowledge boundary.
 *
 * Slots (transcluded in this exact order):
 *   [slot=kpi-strip]            (only when kpiScope=module-overview)
 *   [slot=work-queue]
 *   [slot=readiness]
 *   [slot=ai-recommendations]
 *   [slot=pending-approvals]
 *   [slot=recent-activity]
 *   [slot=quick-actions]
 */
export declare class DosCommandCenterComponent {
    moduleCode?: string;
    kpiScope: 'module-overview' | 'page-local' | 'none';
    density: 'compact' | 'cozy' | 'comfortable';
    ariaLabel: string;
    kpiAriaLabel: string;
}
