/** Device-only panel visibility; intentionally separate from timer/session data. */
export const WORK_PANEL_EXPANDED_KEY = 'nav_work_session_expanded_v1';

export function initialWorkPanelOpen(hasCurrentSession: boolean, preference: string | null): boolean {
  // A real running/paused session still needs controls and reconciliation.
  // A completed phase or a pending notice is not an instruction to reopen.
  return hasCurrentSession || preference === 'true';
}
