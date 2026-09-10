import { newGame } from './core.js?v=0.3.0';
import { idPattern, requireRule } from './utils.js?v=0.3.0';
import { migrateBattle, BATTLE_LIMIT_MS } from './battle.js?v=0.3.0';
export const SAVE_KEY='baize_shuihu_save', BACKUP_KEY=SAVE_KEY+'_backup';
const integer=(n,min=0,max=10000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function safeTree(value,depth=0) {
  requireRule(depth<30,'存档嵌套过深。');
  if(value&&typeof value==='object')for(const [key,v] of Object.entries(value)){requireRule(!['__proto__','constructor','prototype'].includes(key),'存档包含不安全字段。');safeTree(v,depth+1);}
}
export function validateSave(s,data) {
  requireRule(object(s)&&s.version===2,'不支持这个存档版本。');safeTree(s);
  const check=(ok,msg)=>requireRule(ok,'存档校验失败：'+msg);
  check(integer(s.revision,0,Number.MAX_SAFE_INTEGER)&&integer(s.rng,1,4294967295),'版本游标');
  for(const key of ['clock','lastRegen','startedAt'])check(integer(s[key],0,8640000000000000),'时间');
  check(s.clock>=s.lastRegen&&s.clock>=s.startedAt,'时间顺序');check(integer(s.worldMinute,0,1439),'昼夜');
  check(Object.hasOwn(data.by.maps,s.location),'当前位置');check(object(s.player)&&s.player.name==='白泽寨主'&&typeof s.player.title==='string'&&s.player.title.length<60,'寨主');
  for(const key of ['silver','merit','prestige'])check(integer(s.player[key]),'货币');check(integer(s.player.stamina,0,100)&&integer(s.player.liangshanLevel,0,1),'体力或梁山等级');
  check(object(s.heroes)&&Object.keys(s.heroes).length===data.heroes.length,'好汉字典');
  for(const h of data.heroes){const v=s.heroes[h.id];check(v&&['unknown','heard','known','available','owned'].includes(v.status)&&integer(v.level,1,data.config.balance.heroLevelCap)&&integer(v.exp),'好汉状态');}
  check(Array.isArray(s.team)&&s.team.length<=3&&new Set(s.team).size===s.team.length&&s.team.every(id=>s.heroes[id]?.status==='owned'),'出阵队伍');
  check(object(s.inventory),'行囊');for(const [id,n] of Object.entries(s.inventory))check(Object.hasOwn(data.by.items,id)&&integer(n),'道具或数量');
  check(Array.isArray(s.equipment)&&s.equipment.length<=200&&integer(s.nextEquipment,1),'装备');
  check(new Set(s.equipment.map(e=>e.uid)).size===s.equipment.length,'装备实例重复');const slots=new Set();
  for(const e of s.equipment){check(/^eq_\d+$/.test(e.uid)&&Number(e.uid.slice(3))<s.nextEquipment&&Object.hasOwn(data.by.equipments,e.item)&&integer(e.plus,0,data.config.balance.strengthen.cap)&&(e.hero===null||s.heroes[e.hero]?.status==='owned'),'装备实例');if(e.hero){const slot=e.hero+':'+data.by.equipments[e.item].type;check(!slots.has(slot),'同一位置穿戴多件装备');slots.add(slot);}}
  check(object(s.progress)&&object(s.progress.flags)&&object(s.progress.stories)&&object(s.progress.actions)&&object(s.progress.clears),'剧情进度');
  for(const bag of [s.progress.flags,s.progress.actions])for(const [key,value] of Object.entries(bag))check(idPattern.test(key)&&typeof value==='boolean','剧情标记');
  check(Array.isArray(s.progress.visited)&&s.progress.visited.length<=data.maps.length&&new Set(s.progress.visited).size===s.progress.visited.length&&s.progress.visited.every(id=>Object.hasOwn(data.by.maps,id)),'地图访问');
  for(const [id,p] of Object.entries(s.progress.stories))check(data.by.stories[id]&&['active','completed'].includes(p.status)&&Object.hasOwn(data.by.stories[id].steps,p.step),'剧情步骤');
  check(Array.isArray(s.progress.claims)&&new Set(s.progress.claims).size===s.progress.claims.length&&s.progress.claims.every(id=>data.by.quests[id]?.type==='main'),'主线酬劳');
  for(const [id,n] of Object.entries(s.progress.clears))check(data.by.dungeons[id]&&integer(n),'通关记录');
  check(object(s.stats)&&object(s.daily)&&object(s.daily.counters)&&object(s.daily.dungeons),'差事数据');
  for(const stats of [s.stats,s.daily.counters])for(const [key,n] of Object.entries(stats))check(/^[a-z][a-zA-Z0-9_]*$/.test(key)&&integer(n),'计数');
  check(/^\d{4}-\d{2}-\d{2}$/.test(s.daily.date)&&Array.isArray(s.daily.ids)&&s.daily.ids.length===3&&new Set(s.daily.ids).size===3&&s.daily.ids.every(id=>data.by.quests[id]?.type==='daily'),'今日差事');
  check(Array.isArray(s.daily.claimed)&&new Set(s.daily.claimed).size===s.daily.claimed.length&&s.daily.claimed.every(id=>s.daily.ids.includes(id))&&typeof s.daily.bonus==='boolean','每日奖励');
  for(const [id,n] of Object.entries(s.daily.dungeons))check(data.by.dungeons[id]&&integer(n,0,3),'每日历练次数');
  check(Array.isArray(s.daily.events)&&s.daily.events.length<=data.events.length&&new Set(s.daily.events).size===s.daily.events.length&&s.daily.events.every(id=>data.by.events[id]),'际遇记录');
  check(object(s.recruit)&&integer(s.recruit.total)&&object(s.recruit.pity)&&object(s.recruit.fate),'招贤');
  for(const [key,max] of [['three',19],['four',49],['five',99]])check(integer(s.recruit.pity[key],0,max),'普通招贤保底');
  for(const [id,n] of Object.entries(s.recruit.fate))check(data.by.heroes[id]&&integer(n,0,4),'专属缘分');
  if(s.recruit.lastResult!==undefined){
    const r=s.recruit.lastResult;check(object(r)&&Object.hasOwn(data.by.heroes,r.hero)&&(r.target===null||Object.hasOwn(data.by.heroes,r.target))&&['joined','duplicate','clue'].includes(r.kind)&&integer(r.number,1,s.recruit.total)&&typeof r.inTeam==='boolean','招贤结果');
    check(r.tokens===(r.kind==='clue'?2:r.kind==='duplicate'?3:0)&&r.merit===(r.kind==='duplicate'?15:0)&&(!r.inTeam||r.kind==='joined'),'招贤所得');
  }
  const context=c=>check(c&&(c.type==='dungeon'?!!data.by.dungeons[c.id]:c.type==='event'?!!data.by.events[c.id]:c.type==='story'&&(c.id==='huangni'||!!data.by.stories[c.id])),'交战来源');
  const logs=a=>check(Array.isArray(a)&&a.length<=150&&a.every(t=>typeof t==='string'&&t.length<2000),'战报');
  check(!(s.battle&&s.scheme)&&!(s.event&&(s.battle||s.scheme)),'互斥事件');
  if(s.battle){const b=s.battle,live=b.mode==='realtime';
    check(live?(b.round===undefined&&integer(b.elapsed,0,BATTLE_LIMIT_MS)&&integer(b.itemReadyAt,0,BATTLE_LIMIT_MS+10000)):(b.mode===undefined&&integer(b.round,1,100)&&b.elapsed===undefined),'战斗时钟');
    check(Array.isArray(b.team)&&b.team.length>0&&b.team.length<=3&&Array.isArray(b.enemy)&&b.enemy.length>0&&b.enemy.length<=5&&[null,'victory','defeat','retreat'].includes(b.outcome)&&typeof b.guest==='boolean','战局');context(b.context);logs(b.log);
    for(const [side,units] of [['team',b.team],['enemy',b.enemy]]){
      check(new Set(units.map(u=>u.id)).size===units.length,'重复战斗单位');
      for(const u of units){
        check(u.side===side&&typeof u.name==='string'&&u.name.length<80&&typeof u.id==='string','战斗单位');check(side==='team'?!!data.by.heroes[u.id]:!!data.by.enemies[u.model],'战斗单位引用');
        for(const key of ['hp','maxHp','attack','defense','speed','strategy','rage'])check(integer(u[key],0,key==='rage'?100:1000000),'战斗属性');check(u.maxHp>0&&u.hp<=u.maxHp,'战斗气血');
        check(Array.isArray(u.skills)&&u.skills.length<=5&&u.skills.every(id=>data.by.skills[id]),'战斗技能');
        if(live)check(integer(u.nextAttackAt,u.hp>0&&!b.outcome?b.elapsed:0,BATTLE_LIMIT_MS+10000)&&integer(u.skillReadyAt,0,BATTLE_LIMIT_MS+10000)&&integer(u.attacks,0,10000),'单位出手与技能时钟');
        check(Array.isArray(u.statuses)&&u.statuses.length<=100&&u.statuses.every(e=>['poison','bleeding','stun','armor_break','rage'].includes(e.id)&&typeof e.value==='number'&&Number.isFinite(e.value)&&e.value>=0&&e.value<=1000&&(live?(integer(e.expiresAt,b.outcome?0:b.elapsed,BATTLE_LIMIT_MS+10000)&&(['poison','bleeding'].includes(e.id)?integer(e.nextTickAt,b.outcome?0:b.elapsed,BATTLE_LIMIT_MS+10000):e.nextTickAt===undefined)):integer(e.turns,1,5))),'战斗状态');
      }
    }
    if(b.context.type==='story')check(s.progress.stories[b.context.id]?.status==='active'&&!!data.by.stories[b.context.id].steps[b.context.next],'战后剧情');
  }
  if(s.scheme){const q=s.scheme;check(data.by.schemes[q.id]&&integer(q.turn,0,6)&&[null,'success','failure'].includes(q.outcome),'计策');context(q.context);logs(q.log);check(object(q.values),'计策状态');for(const key of ['alert','fatigue','heat','trust','exposure'])check(integer(q.values[key],0,100),'计策数值');}
  if(s.event)check(object(s.event)&&data.by.events[s.event.id],'待办际遇');
  check(typeof s.formationPending==='boolean'&&typeof s.message==='string'&&s.message.length<3000,'页面信息');
  check(Array.isArray(s.journal)&&s.journal.length<=300&&s.journal.every(e=>integer(e.at,0,8640000000000000)&&typeof e.text==='string'&&e.text.length<3000),'梁山志');
  return s;
}
export function parseSave(raw,data,now=Date.now()) {
  requireRule(typeof raw==='string'&&raw.length<=2000000,'存档应为不超过 2 MB 的 JSON 文本。');
  let s;try{s=JSON.parse(raw);}catch{throw new Error('无法解析存档 JSON。原存档未被覆盖。');}safeTree(s);
  requireRule(object(s),'存档格式不正确。');
  if(s.version===0){const base=newGame(data,now,s.rng||1);s={...base,...s,version:2,revision:s.revision||0,player:{...base.player,...s.player},heroes:{...base.heroes,...s.heroes},progress:{...base.progress,...s.progress}};
    if(Array.isArray(s.inventory))s.inventory=Object.fromEntries(s.inventory.map(i=>[i.id,i.count]));}
  if(s.version===1){
    const legacy=data.heroes.filter(h=>(h.introducedIn||1)===1);
    requireRule(object(s.heroes)&&Object.keys(s.heroes).length===legacy.length&&legacy.every(h=>Object.hasOwn(s.heroes,h.id)),'旧存档好汉字典不完整，不能自动修补原有进度。');
    for(const h of data.heroes.filter(h=>h.introducedIn===2))s.heroes[h.id]={status:'unknown',level:1,exp:0};
    s.version=2;
  }
  validateSave(s,data);migrateBattle(s.battle);return validateSave(s,data);
}
export class SaveConflict extends Error {}
export class SaveStore {
  constructor(storage,data){this.storage=storage;this.data=data;this.raw=null;}
  load(){try{this.raw=this.storage.getItem(SAVE_KEY);if(this.raw===null)return {status:'empty'};return {status:'ok',state:parseSave(this.raw,this.data)};}catch(error){return {status:this.raw===null?'unavailable':'invalid',message:error.message,raw:this.raw};}}
  write(state,force=false){validateSave(state,this.data);const disk=this.storage.getItem(SAVE_KEY);if(!force&&disk!==this.raw)throw new SaveConflict('另一个标签页已更新存档。请先导出本页进度，再重新载入，避免互相覆盖。');
    const next=JSON.stringify(state);let validDisk=false;if(disk){try{parseSave(disk,this.data);validDisk=true;}catch{requireRule(force,'当前存档损坏，须明确确认后才能替换。');}}
    if(validDisk&&disk!==next)this.storage.setItem(BACKUP_KEY,disk);this.storage.setItem(SAVE_KEY,next);this.raw=next;return true;}
  import(raw){return parseSave(raw,this.data);}
  backup(){const raw=this.storage.getItem(BACKUP_KEY);requireRule(raw,'尚无本机备份。');return parseSave(raw,this.data);}
}
