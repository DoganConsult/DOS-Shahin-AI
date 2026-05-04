/**
 * Carbon-backed tooltip wrapper. Carbon's tooltip is a `<cds-tooltip>`
 * element that wraps the trigger via content projection.
 *
 * Inputs: id/enterDelayMs/leaveDelayMs/disabled/description/templateContext.
 *
 * Wave 8 note: This component is currently exported but has no consumers in
 * the workspace (NG8113 warning is expected). It is intentionally retained as
 * a ready-to-use wrapper for agent-tile hover tooltips and future use cases.
 * Do NOT import AccessStore or tenant context here — this is a pure UI primitive.
 */
export declare class DosCarbonTooltipComponent {
    description: string;
    enterDelayMs: number;
    leaveDelayMs: number;
    disabled: boolean;
}
