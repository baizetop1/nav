import { parseSave } from './save.js?v=0.12.0';

// Explicit game-only projection. Unknown fields and application credentials never travel.
const fields = names => Object.fromEntries(names.split(' ').map(k => [k, true]));
const context = fields('type id next kind tier period terrain');
const unit = {...fields('id name hp attack defense speed strategy maxHp rage skills side attacks skillReadyAt nextAttackAt model resistUntil'), statuses: [{...fields('id value expiresAt nextTickAt')}], corps:fields('id arm rank troops'), training:{quality:true,levels:{'*':true},bond:true},boss:fields('kind readyAt pendingAt phase')};
const shape = {
  ...fields('version commandVersion rosterVersion revision clock lastRegen rng worldMinute location startedAt team nextEquipment message formationPending battleSkillMode'),
  player: fields('name title silver merit prestige stamina liangshanLevel'),
  heroes: {'*': fields('status level exp quality')}, inventory: {'*': true},
  camp:{...fields('version day wood food troops wounded mode tactic deployment work sorties arm'),buildings:fields('hall farm lumber barracks clinic market')},
  frontier:{version:true,lastAt:true,stations:{'*':fields('worker carry bank')},posts:{'*':fields('guard safeAt threat carry bank')}},
  development:{version:true,corps:{'*':true},presets:{'*':fields('team mode tactic deployment')},goal:fields('kind id'),ledger:[{...fields('date wins losses recruits'),gained:{'*':true},spent:{'*':true}}]},
  campaign:{version:true,daily:{date:true,uses:{'*':true}},weekly:{'*':fields('tier score elapsed hp')}},
  growth:{version:true,skills:{'*':true},mounts:{'*':fields('rank intimacy riding')}},
  equipment: [fields('uid item plus hero locked')],
  progress: {flags: {'*': true}, stories: {'*': fields('status step')}, visited: true, actions: {'*': true}, claims: true, clears: {'*': true}},
  stats: {'*': true}, daily: {...fields('date ids claimed bonus events'), counters: {'*': true}, dungeons: {'*': true}},
  recruit: {total: true, pity: fields('three four five'), fate: {'*': true}, lastResult: fields('hero target kind number inTeam tokens merit'), lastBatch:[fields('hero target kind number inTeam tokens merit')]},
  battle: {orders:fields('version focus stance reserve readyAt'),expedition:fields('troops tactic arm'),...fields('mode elapsed itemReadyAt guest outcome log rules martial frontierRules'), team: [unit], enemy: [unit], context},
  scheme: {...fields('id turn outcome log'), values: fields('alert fatigue heat trust exposure'), context},
  event: fields('id'), journal: [fields('at text')]
};
function project(value, spec) {
  if (value === null || spec === true) return value;
  if (Array.isArray(spec)) return value.map(v => project(v, spec[0]));
  return Object.fromEntries(Object.entries(value).filter(([k]) => Object.hasOwn(spec, k) || Object.hasOwn(spec, '*')).map(([k,v]) => [k, project(v, spec[k] ?? spec['*'])]));
}
export function gameSnapshot(state, data) {
  const valid = parseSave(JSON.stringify(state), data);
  return parseSave(JSON.stringify(project(valid, shape)), data);
}
export const slotNumber = id => String(id).padStart(2, '0');
export function slotId(id) { const n = Number(id); if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error('存档编号须为 01—20。'); return n; }
export function slotName(name) { if (typeof name !== 'string' || !name.trim() || name.trim().length > 40 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('存档名称须为 1—40 个可见字符。'); return name.trim(); }
export function exportSave(state, record, data) {
  return JSON.stringify({format: 'baize-shuihu-box', version: 1, name: record.name, localSlot: record.id,
    cloudRevision: record.cloud?.revision ?? null, state: gameSnapshot(state, data)}, null, 2);
}
export function importSave(raw, data) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 2000000) throw new Error('存档不能超过 2 MB。');
  let file; try { file = JSON.parse(raw); } catch { throw new Error('无法解析存档 JSON。'); }
  if (file?.format === 'baize-shuihu-box') {
    if (file.version !== 1) throw new Error('不支持这个存档匣文件版本。');
    return {state: gameSnapshot(file.state, data), name: slotName(file.name)};
  }
  return {state: gameSnapshot(file, data)};
}
export function exportName(record) {
  return `白泽水浒_${slotNumber(record.id)}号_${record.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')}_云端版本${record.cloud?.revision ?? '未关联'}.json`;
}
