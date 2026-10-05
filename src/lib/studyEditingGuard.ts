export const STUDY_LEAVE_EVENT = 'baize:study-feedback-leave';
export function canLeaveStudyFeedback(): boolean {
  if (typeof window === 'undefined') return true;
  return window.dispatchEvent(new Event(STUDY_LEAVE_EVENT, { cancelable: true }));
}
