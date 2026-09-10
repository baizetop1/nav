import { attributes } from './hero.js?v=0.4.1';
import { bounded, pick, random, requireRule } from './utils.js?v=0.4.1';
import { initializeGrowthBattle, growthHit, growthSkillReason, growthTimes, advanceBosses, negativeStatus } from './growth-battle.js?v=0.4.1';

export const BATTLE_LIMIT_MS=180000, STATUS_MS=2000, SKILL_COOLDOWN_MS=5000, ITEM_COOLDOWN_MS=3000;
export const BATTLE_ITEMS=['jinchuangyao','huiqisan','jiedudan'];
export const battleSkillMode=state=>state.battleSkillMode||'manual';
const alive=u=>u.hp>0;
const harmful=negativeStatus;
const log=(b,text)=>{b.log.push(`【${(b.elapsed/1000).toFixed(1)}秒】${text}`);if(b.log.length>120)b.log.shift();};
const has=(u,id)=>u.statuses.some(s=>s.id===id);
export function damage(attack,defense,rate,variance=1,critical=false){return Math.max(1,Math.round(Math.max(1,attack*rate-defense*.5)*variance*(critical?1.5:1)));}
export function attackInterval(u){return Math.round(bounded(3000*100/(100+u.speed),900,3000));}
export function statusName(id){return ({bleeding:'流血',poison:'中毒',armor_break:'破甲',stun:'眩晕',rage:'狂怒',guard:'护阵',taunt:'嘲讽',weaken:'削弱'})[id]||id;}
export function addStatus(u,status,elapsed=0){
  const next={id:status.id,value:status.value,expiresAt:elapsed+status.turns*STATUS_MS};
  if(['poison','bleeding'].includes(status.id))next.nextTickAt=elapsed+STATUS_MS;
  const old=status.id!=='poison'&&u.statuses.find(s=>s.id===status.id);
  if(old){old.expiresAt=Math.max(old.expiresAt,next.expiresAt);if(['guard','weaken'].includes(status.id))old.value=Math.max(old.value,next.value);return;}
  if(u.statuses.length<100)u.statuses.push(next);
}
function unit(id,name,attribute,skills,side){const u={id,name,...attribute,maxHp:attribute.hp,rage:0,skills:[...skills],side,statuses:[],attacks:0,skillReadyAt:0};u.nextAttackAt=attackInterval(u);return u;}
export function startBattle(state,data,{enemies,guest,scale=1,context}){
  requireRule(!state.battle&&!state.scheme,'先结束当前战局。');
  const team=guest?[unit(guest.id,data.by.heroes[guest.id].name,attributes(state,guest.id,data,guest.level,false),data.by.heroes[guest.id].skills,'team')]:state.team.map(id=>unit(id,data.by.heroes[id].name,attributes(state,id,data),data.by.heroes[id].skills,'team'));
  requireRule(team.length>0,'先与白胜相识、邀他作向导，或在招贤馆招募好汉并编队。');
  state.battle={mode:'realtime',elapsed:0,itemReadyAt:0,team,enemy:enemies.map((id,i)=>{
    const e=data.by.enemies[id],stats=Object.fromEntries(Object.entries(e.attribute).map(([key,value])=>[key,Math.round(value*(key==='speed'?1:scale))]));
    return {...unit(id+'_'+i,e.name,stats,e.skills,'enemy'),model:id};
  }),context,guest:!!guest,outcome:null,log:['【交战开始】双方自行迎敌。你可随时调度技能、用药或撤退。']};
  initializeGrowthBattle(state,state.battle,data);
}
// Only convert validated legacy battles. Never replay time spent away from the page.
export function migrateBattle(b){
  if(!b||b.mode==='realtime')return;
  b.mode='realtime';b.elapsed=0;b.itemReadyAt=0;delete b.round;
  for(const u of [...b.team,...b.enemy]){
    const statuses=u.statuses;u.statuses=[];for(const s of statuses)addStatus(u,s,0);
    u.attacks=0;u.nextAttackAt=attackInterval(u);u.skillReadyAt=0;
  }
  log(b,'原战局已接续为自动交战，气血、怒气、药物与剧情均保留。点击继续交战后再行推进。');
}
function settle(b){
  if(b.outcome)return true;
  if(!b.team.some(alive)){b.outcome='defeat';log(b,'众好汉已无力再战。收拢人手，整备后可再来。');}
  else if(!b.enemy.some(alive)){b.outcome='victory';log(b,'敌阵已散，此战得胜。');}
  else if(b.elapsed>=BATTLE_LIMIT_MS){b.outcome='retreat';log(b,'交战已久，双方难分胜负，你下令撤出。');}
  return !!b.outcome;
}
function hit(state,u,skill,data){
  if(state.battle.rules===2)return growthHit(state,u,skill,data,growthApi);
  const b=state.battle,friends=u.side==='team'?b.team:b.enemy,opponents=u.side==='team'?b.enemy:b.team,effect=skill?.effect||{kind:'damage',rate:1};
  if(skill)u.rage-=skill.cost;else u.rage=bounded(u.rage+10,0,100);
  if(effect.kind==='heal'){
    const target=friends.filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],heal=Math.min(target.maxHp-target.hp,Math.round(target.maxHp*effect.rate));
    target.hp+=heal;log(b,`${u.name}施展【${skill.name}】，照应${target.name}，回复 ${heal} 点气血。`);return;
  }
  const targets=opponents.filter(alive),target=random(state)<.8?targets[0]:pick(state,targets),critical=random(state)<.05;
  const defense=target.defense*(has(target,'armor_break')?.7:1),attack=(effect.kind==='strategy'?u.strategy:u.attack)*(has(u,'rage')?1.2:1);
  const loss=damage(attack,defense,effect.rate,.9+random(state)*.2,critical);
  target.hp=Math.max(0,target.hp-loss);target.rage=bounded(target.rage+15,0,100);
  log(b,`${u.name}${skill?'施展【'+skill.name+'】':'进击'}，${critical?'【暴击】':''}${target.name}损失 ${loss} 点气血。`);
  if(effect.status&&alive(target)){addStatus(target,effect.status,b.elapsed);log(b,`${target.name}受到【${statusName(effect.status.id)} · ${effect.status.turns*STATUS_MS/1000}秒】。`);}
  if(!alive(target))log(b,`${target.name}已无力再战。`);
}
export function enemySkill(b,u,data){
  const available=u.skills.map(id=>data.by.skills[id]).filter(s=>s.type!=='passive'&&s.cost<=u.rage&&(s.effect.kind!=='heal'||b.enemy.some(f=>alive(f)&&f.hp<f.maxHp)));
  return available.length?available[u.attacks%available.length]:undefined;
}
export function setBattleSkillMode(state,mode){
  const b=state.battle;requireRule(b&&!b.outcome,'当前没有进行中的交战。');
  requireRule(['manual','auto'].includes(mode),'无效的技能释放方式。');
  if(battleSkillMode(state)===mode)return;
  state.battleSkillMode=mode;
  log(b,mode==='auto'?'【技能模式】已启用自动技能：条件满足时按出阵顺序施招，药物仍由你手动使用。':'【技能模式】已切换手动技能：普攻继续自动进行，招式由你决定。');
}
function castAutomaticSkills(state,data){
  const b=state.battle;if(battleSkillMode(state)!=='auto'||settle(b))return;
  // Same-time decisions follow saved team order, then each hero's skill order.
  // Use the exact manual validation/cost/cooldown path; never automate medicines.
  for(const u of b.team){
    const options=u.skills.map(id=>data.by.skills[id]);
    if(b.rules===2)options.sort((a,c)=>(c.training?.tier==='advanced')-(a.training?.tier==='advanced'));
    const skill=options.find(s=>!skillReason(b,u,s));
    if(!skill)continue;
    log(b,`【自动技能】${u.name}自行施展【${skill.name}】。`);
    castSkill(state,data,u.id,skill.id);
    if(b.outcome)break;
  }
}
// Independent timestamps: a fast unit may strike twice before a slower unit acts.
// Exact event resolution keeps results independent of UI timer slice sizes.
export function advanceBattle(state,data,delta){
  const b=state.battle;requireRule(b?.mode==='realtime','当前没有自动交战。');
  requireRule(Number.isInteger(delta)&&delta>0&&delta<=1000,'战斗时间步长无效。');
  if(b.outcome)return;
  const end=Math.min(b.elapsed+delta,BATTLE_LIMIT_MS),units=[...b.team,...b.enemy];
  castAutomaticSkills(state,data);
  while(!b.outcome){
    const times=units.filter(alive).map(u=>u.nextAttackAt);
    if(b.rules===2)times.push(...growthTimes(b));
    if(battleSkillMode(state)==='auto')for(const u of b.team)if(alive(u)&&u.skillReadyAt>b.elapsed)times.push(u.skillReadyAt);
    for(const u of units)for(const s of u.statuses){times.push(s.expiresAt);if(s.nextTickAt)times.push(s.nextTickAt);}
    const next=Math.min(...times);if(next>end)break;b.elapsed=next;
    for(const u of units){
      for(const s of u.statuses)if(s.nextTickAt===next&&alive(u)){
        const loss=s.id==='bleeding'?Math.max(1,Math.round(u.maxHp*.02)):Math.round(s.value);u.hp=Math.max(0,u.hp-loss);
        log(b,`${u.name}【${statusName(s.id)}】损失 ${loss} 点气血。`);
      }
      for(const s of u.statuses)if(s.nextTickAt===next)s.nextTickAt+=STATUS_MS;
      u.statuses=u.statuses.filter(s=>s.expiresAt>next);
    }
    if(settle(b))break;
    if(b.rules===2){advanceBosses(state,growthApi);if(settle(b))break;}
    const due=units.filter(u=>alive(u)&&u.nextAttackAt===next).sort((a,b)=>b.speed-a.speed);
    for(const u of due){
      if(!alive(u))continue;u.nextAttackAt=next+attackInterval(u);
      if(has(u,'stun'))log(b,`${u.name}【眩晕】一时无法行动。`);
      else{hit(state,u,u.side==='enemy'?enemySkill(b,u,data):undefined,data);u.attacks++;}
      if(settle(b))break;
    }
    if(!b.outcome)castAutomaticSkills(state,data);
  }
  if(!b.outcome){b.elapsed=end;settle(b);}
}
export function skillReason(b,u,skill){
  if(!b||b.outcome)return '战局已结束';
  if(!u||u.side!=='team'||!b.team.includes(u)||!skill||!u.skills.includes(skill.id)||skill.type==='passive')return '无此可用技能';
  if(!alive(u))return '已退阵';
  if(has(u,'stun'))return '眩晕中';
  if(u.skillReadyAt>b.elapsed)return `调息 ${Math.ceil((u.skillReadyAt-b.elapsed)/1000)}秒`;
  if(u.rage<skill.cost)return `怒气 ${u.rage}/${skill.cost}`;
  if(b.rules===2){const reason=growthSkillReason(b,u,skill);if(reason!==null)return reason;}
  if(skill.effect.kind==='heal'&&!b.team.some(f=>alive(f)&&f.hp<f.maxHp))return '同伴无需恢复';
  return '';
}
export function castSkill(state,data,heroId,skillId){
  const b=state.battle,u=b?.team.find(u=>u.id===heroId),skill=data.by.skills[skillId],reason=skillReason(b,u,skill);
  requireRule(!reason,reason);hit(state,u,skill,data);u.skillReadyAt=b.elapsed+(b.rules===2&&skill.training?.tier==='advanced'?7000:SKILL_COOLDOWN_MS);settle(b);
}
export function battleItemQuote(state,data,id){
  const b=state.battle,item=data.by.items[id];
  if(!b||b.outcome)return {reason:'战局已结束'};
  if(!BATTLE_ITEMS.includes(id)||!item)return {reason:'这件物品不能在战斗中使用'};
  if(!(state.inventory[id]>0))return {reason:'行囊中没有此药'};
  if(b.itemReadyAt>b.elapsed)return {reason:`用药间隔 ${Math.ceil((b.itemReadyAt-b.elapsed)/1000)}秒`};
  const living=b.team.filter(alive),target=item.effect.cleanse?living.find(u=>u.statuses.some(s=>harmful(s.id))):item.effect.rage?[...living].filter(u=>u.rage<100).sort((a,b)=>a.rage-b.rage)[0]:[...living].filter(u=>u.hp<u.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  return target?{target,reason:''}:{reason:'暂无需要此药的同伴'};
}
export function useBattleItem(state,data,id){
  const {target,reason}=battleItemQuote(state,data,id);requireRule(!reason,reason+'，不消耗道具。');
  const b=state.battle,item=data.by.items[id];state.inventory[id]--;
  if(item.effect.hp)target.hp=Math.min(target.maxHp,target.hp+item.effect.hp);
  if(item.effect.rage)target.rage=Math.min(100,target.rage+item.effect.rage);
  if(item.effect.cleanse)target.statuses=target.statuses.filter(s=>!harmful(s.id));
  b.itemReadyAt=b.elapsed+ITEM_COOLDOWN_MS;log(b,`你将【${item.name}】交给${target.name}，药效即刻生效，双方仍在交战。`);
}
export function retreatBattle(state){const b=state.battle;requireRule(b&&!b.outcome,'当前没有可撤出的战斗。');b.outcome='retreat';log(b,'你下令退回安全处。此战未取胜，已消耗的药物与历练次数不会返还。');}
const growthApi={log,damage,addStatus,statusName};
