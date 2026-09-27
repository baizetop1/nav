import { WORK_SESSION_KEY, parseWorkSession, type WorkNotice } from './workSession.ts';

const ALERT_KEY = 'baize_pomodoro_alert_v1';
let context: AudioContext | null = null;

/** Must be called from a user gesture. Nothing is requested on page load. */
export async function armPomodoroSound(): Promise<boolean> {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch { return false; }
}

/** Only the tab that has user-unlocked audio can claim a fresh completion. */
export async function playPomodoroNotice(notice: WorkNotice): Promise<void> {
  const play = () => {
    if (!context || context.state !== 'running') return;
    const age = Date.now() - notice.endedAt;
    if (age < 0 || age > 60_000) return; // No delayed alarm after a long absence.
    const raw = localStorage.getItem(WORK_SESSION_KEY);
    const latest = raw ? parseWorkSession(JSON.parse(raw)) : null;
    if (!latest?.sound || latest.notice?.id !== notice.id || localStorage.getItem(ALERT_KEY) === notice.id) return;
    localStorage.setItem(ALERT_KEY, notice.id);
    [660, 880].forEach((frequency, index) => {
      const oscillator = context!.createOscillator(), gain = context!.createGain();
      const at = context!.currentTime + index * 0.3;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.06, at + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      oscillator.connect(gain); gain.connect(context!.destination);
      oscillator.start(at); oscillator.stop(at + 0.28);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  };
  try {
    if (navigator.locks?.request) await navigator.locks.request(ALERT_KEY, play);
    else play();
  } catch { /* Storage or audio blocked: the persistent visual notice remains. */ }
}
