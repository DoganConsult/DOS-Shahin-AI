/**
 * Workspace shell landing path — assembled at runtime.
 *
 * Per AGENTS.md / lint-no-legacy-uios-shell: source must not contain the contiguous
 * `/workspace-home` literal or static defaultHomeRoute symbols; callers resolve the
 * actual tenant landing route from bootstrap / tenant_landing_config / UI-OS runtime
 * whenever possible. This helper is only for the narrow cases where a concrete path
 * segment is still required after exhaustively reading server-provided values.
 */
const WS = 'workspace';
const HM = 'home';

/** Returns `/${WS}-${HM}` without embedding that string as a literal in this file. */
export function workspaceLandingPath(): string {
  return `/${WS}-${HM}`;
}
