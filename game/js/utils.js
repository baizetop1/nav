export const clone = value => structuredClone(value);
export function requireRule(ok, message) { if (!ok) throw new Error(message); }
export const bounded = (n, min, max) => Math.max(min, Math.min(max, n));
export const dayKey = now => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
// One seeded source for battles, invitations, events and loot. Its cursor is saved.
export function random(state) {
  let x = state.rng >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng = (x >>> 0) || 1; return state.rng / 4294967296;
}
export const pick = (state, values) => values[Math.floor(random(state) * values.length)];
export function weighted(state, entries) {
  let n = random(state) * entries.reduce((sum, e) => sum + e.weight, 0);
  return entries.find(e => (n -= e.weight) < 0) || entries.at(-1);
}
export function count(state, key, amount = 1) {
  state.stats[key] = (state.stats[key] || 0) + amount;
  state.daily.counters[key] = (state.daily.counters[key] || 0) + amount;
}
export function journal(state, text, now = state.clock) {
  state.journal.push({ at: now, text });
  if (state.journal.length > 300) state.journal.splice(0, state.journal.length - 300);
  state.message = text;
}
export const idPattern = /^[a-z][a-z0-9_]*$/;
