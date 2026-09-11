import { bounded, pick, random } from './utils.js?v=0.5.0';
import { unlockReason, skillLevel, battleSkill } from './growth.js?v=0.5.0';

const alive=u=>u.hp>0;
export const negativeStatus=id=>['bleeding','poison','armor_break','stun','weaken'].includes(id);
const has=(u,id)=>u.statuses.find(s=>s.id===id);
const friends=(b,u)=>(u.side==='team'?b.team:b.enemy).filter(alive);
const foes=(b,u)=>(u.side==='team'?b.enemy:b.team).filter(alive);
const lowest=units=>[...units].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
export const BOSS_KINDS=['tiger','chief','raider'];
export function initializeGrowthBattle(state,b,data){
  b.rules=2;
  for(const u of b.team){
    u.skills=u.skills.filter(id=>!unlockReason(state,data.by.skills[id],b.guest));
    u.training={levels:Object.fromEntries(u.skills.map(id=>[id,b.guest?1:skillLevel(state,id)])),bond:u.skills.find(id=>data.by.skills[id].training?.tier==='bond')||null};
  }
  if(b.context.type==='dungeon')for(const u of b.enemy){
    const kind=({tiger_king:'tiger',bandit_chief:'chief',road_raider:'raider'})[u.model];
    if(kind)u.boss={kind,readyAt:6000,pendingAt:0,phase:0};
  }
}
function status(b,target,id,value,ms,api){
  if(!target||!alive(target))return;
  if(id==='stun'&&target.boss){
    if((target.resistUntil||0)>b.elapsed){api.log(b,`${target.name}【抗控】尚在稳住阵脚，本次眩晕未生效。`);return;}
    target.resistUntil=b.elapsed+ms+4000;
  }
  api.addStatus(target,{id,value,turns:ms/2000},b.elapsed);
  api.log(b,`${target.name}获得【${api.statusName(id)} · ${ms/1000}秒】${['guard','weaken'].includes(id)?` · ${Math.round(value*100)}%`:''}。`);
}
function heal(b,u,target,rate,name,api){
  if(!target)return;const n=Math.min(target.maxHp-target.hp,Math.round(target.maxHp*rate));
  target.hp+=n;api.log(b,`${u.name}施展【${name}】，照应${target.name}，回复 ${n} 点气血。`);
}
function rage(b,units,n,name,api){
  for(const u of units){const gain=Math.min(100-u.rage,n);u.rage+=gain;if(gain)api.log(b,`${u.name}【${name}】怒气 +${gain}。`);}
}
function strike(state,u,target,effect,name,api,{pierce=false}={}){
  const b=state.battle;if(!target||!alive(target))return;
  const critical=random(state)<.05,defense=target.defense*(has(target,'armor_break')?.7:1)*(pierce?.5:1)*(effect.kind==='strategy'?.65:1);
  const weakened=has(u,'weaken')?.value||0;
  const attack=(effect.kind==='strategy'?u.strategy:u.attack)*(has(u,'rage')?1.2:1)*(1-weakened)*(u.boss?.phase===1&&u.boss.kind==='tiger'?1.2:1);
  const raw=api.damage(attack,defense,effect.rate,.9+random(state)*.2,critical);
  const loss=Math.max(1,Math.round(raw*(1-(has(target,'guard')?.value||0))));
  target.hp=Math.max(0,target.hp-loss);target.rage=bounded(target.rage+15,0,100);
  api.log(b,`${u.name}${name?'施展【'+name+'】':effect.kind==='strategy'?'【谋攻】':'进击'}，${critical?'【暴击】':''}${target.name}损失 ${loss} 点气血${has(target,'guard')?'（护阵减伤）':''}。`);
  if(effect.status&&alive(target))status(b,target,effect.status.id,effect.status.value,effect.status.turns*2000,api);
  if(!alive(target))api.log(b,`${target.name}已无力再战。`);
}
function targetOf(state,u,targets){
  const forced=targets.find(t=>has(t,'taunt'));if(forced)return forced;
  // Formation gives the first two positions the majority of ordinary attacks.
  return random(state)<.8?targets[0]:pick(state,targets.slice(0,2));
}
function bondTrigger(state,u,target,data,api){
  const b=state.battle,id=u.training?.bond;if(!id||(u.attacks+1)%3!==0)return;
  const skill=data.by.skills[id],level=u.training.levels[id],boost=1+.08*(level-1),party=friends(b,u),enemies=foes(b,u);
  if(!enemies.length)return;target=alive(target)?target:enemies[0];
  api.log(b,`【人骑羁绊】${u.name} · ${skill.name}（${level}级），第三次进击触发。`);
  const give=n=>rage(b,party,Math.round(n*boost),skill.name,api);
  switch(u.id){
    case 'songjiang':give(3);break;
    case 'wuyong':case 'ruanxiaoqi':status(b,target,'weaken',.15*boost,4000,api);break;
    case 'wusong':status(b,target,'bleeding',1,Math.round(4000*boost),api);break;
    case 'linchong':status(b,target,'stun',1,Math.round(1000*boost),api);break;
    case 'luzhishen':status(b,lowest(party),'guard',.20*boost,4000,api);break;
    case 'gongsunsheng':{
      const ally=party.find(v=>v.statuses.some(s=>negativeStatus(s.id)));
      if(ally){const i=ally.statuses.findIndex(s=>negativeStatus(s.id)),[removed]=ally.statuses.splice(i,1);api.log(b,`${ally.name}【解困】清除${api.statusName(removed.id)}。`);}break;
    }
    case 'yanqing':strike(state,u,lowest(enemies),{kind:'damage',rate:.4*boost},skill.name,api);break;
    case 'huarong':status(b,target,'armor_break',1,Math.round(4000*boost),api);break;
    case 'liutang':rage(b,[u],Math.round(8*boost),skill.name,api);break;
    case 'shiqian':{const n=Math.min(target.rage,Math.round(8*boost));target.rage-=n;rage(b,[u],n,skill.name,api);break;}
    case 'baisheng':heal(b,u,lowest(party),.04*boost,skill.name,api);break;
    case 'chaijin':status(b,party[0],'guard',.25*boost,4000,api);break;
    case 'yangzhi':give(2);break;
  }
}
export function growthSkillReason(b,u,skill){
  const profile=skill.training?.profile,party=b.team.filter(alive);
  if(profile==='protect')return has(u,'taunt')?'护众尚在持续':'';
  if(profile==='purify')return party.some(v=>v.hp<v.maxHp||v.statuses.some(s=>negativeStatus(s.id)))?'':'同伴无需解困或恢复';
  return null;
}
export function growthHit(state,u,rawSkill,data,api){
  const b=state.battle,skill=battleSkill(u,rawSkill),strategist=u.side==='team'&&data.by.heroes[u.id]?.type==='strategist',effect=skill?.effect||(strategist?{kind:'strategy',rate:.6}:{kind:'damage',rate:1}),profile=skill?.training?.profile;
  const party=friends(b,u),enemies=foes(b,u);if(!enemies.length||!party.length)return;
  if(skill)u.rage-=skill.cost;else u.rage=bounded(u.rage+10,0,100);
  const boost=1+.08*((u.training?.levels[skill?.id]||1)-1),target=targetOf(state,u,enemies);
  if(profile==='protect'){
    status(b,u,'taunt',1,4000,api);for(const ally of party)status(b,ally,'guard',(ally===u?.4:.2)*boost,4000,api);
  }else if(['rally','purify','shelter'].includes(profile)){
    for(const ally of party){
      if(profile==='purify'){ally.statuses=ally.statuses.filter(s=>!negativeStatus(s.id));api.log(b,`${ally.name}【云开见月】负面状态已清除。`);}
      heal(b,u,ally,effect.rate,skill.name,api);
      if(profile==='shelter')status(b,ally,'guard',.2*boost,4000,api);
    }
    if(profile==='rally')rage(b,party,Math.round(6*boost),skill.name,api);
  }else if(effect.kind==='heal'){
    const ally=lowest(party);heal(b,u,ally,effect.rate,skill.name,api);
    if(profile==='triage')status(b,ally,'guard',.2*boost,4000,api);
  }else if(profile==='combo'){
    const combo=!!has(target,'bleeding');strike(state,u,target,effect,skill.name,api);
    if(combo&&alive(target))strike(state,u,target,{kind:'damage',rate:1.2*boost},'醉步追击 · 流血衔接',api);
  }else if(['control','bloodline','discipline'].includes(profile)){
    for(const enemy of enemies.slice(0,2)){
      strike(state,u,enemy,effect,skill.name,api);
      if(profile==='control')status(b,enemy,'stun',1,1500,api);
      if(profile==='bloodline')status(b,enemy,'bleeding',1,4000,api);
    }
    if(profile==='discipline')for(const ally of party)status(b,ally,'guard',.15*boost,4000,api);
  }else if(profile==='weaken'){
    strike(state,u,target,effect,skill.name,api);for(const enemy of enemies)status(b,enemy,'weaken',.2*boost,6000,api);
    rage(b,party.filter(v=>v!==u),Math.round(10*boost),skill.name,api);
  }else if(profile==='interrupt'){
    const enemy=enemies.find(v=>v.boss?.pendingAt)||enemies[enemies.length-1];
    if(enemy.boss?.pendingAt){enemy.boss.pendingAt=0;enemy.boss.readyAt=b.elapsed+10000;api.log(b,`${u.name}【截脉打断】${enemy.name}本次蓄势被截住。`);}
    strike(state,u,enemy,effect,skill.name,api);
  }else if(profile==='pierce')strike(state,u,lowest(enemies),effect,skill.name,api,{pierce:true});
  else if(profile==='steal'||profile==='wave'){
    const enemy=enemies[enemies.length-1];strike(state,u,enemy,effect,skill.name,api);
    if(profile==='steal'){const n=Math.min(enemy.rage,Math.round(20*boost));enemy.rage-=n;rage(b,[u],n,'夺势',api);api.log(b,`${enemy.name}【夺势】怒气 -${n}。`);}
    else status(b,enemy,'stun',1,1000,api);
  }else strike(state,u,target,effect,skill?.name,api);
  if(!skill&&u.side==='team')bondTrigger(state,u,target,data,api);
}
export function growthTimes(b){return b.enemy.filter(u=>alive(u)&&u.boss).map(u=>u.boss.pendingAt||u.boss.readyAt);}
export function advanceBosses(state,api){
  const b=state.battle;
  for(const u of b.enemy.filter(u=>alive(u)&&u.boss)){
    const boss=u.boss;
    if(boss.kind==='tiger'&&!boss.phase&&u.hp<=u.maxHp*.5){boss.phase=1;api.log(b,`${u.name}【困兽之怒】气血过半损失，攻击提升 20%；可用削弱与护阵应对。`);}
    if(boss.pendingAt===b.elapsed){
      boss.pendingAt=0;boss.readyAt=b.elapsed+10000;
      if(has(u,'stun')){api.log(b,`${u.name}【蓄势中断】眩晕令本次绝招落空。`);continue;}
      const party=friends(b,u),enemies=foes(b,u);if(!enemies.length)continue;
      if(boss.kind==='tiger')for(const target of enemies)strike(state,u,target,{kind:'damage',rate:1.25},'虎啸扑阵',api);
      if(boss.kind==='chief')for(const ally of party)status(b,ally,'guard',.3,5000,api);
      if(boss.kind==='raider'){const target=enemies[enemies.length-1];strike(state,u,target,{kind:'damage',rate:1.8},'绕后截粮',api);status(b,target,'weaken',.2,4000,api);}
    }else if(!boss.pendingAt&&boss.readyAt===b.elapsed){
      boss.pendingAt=b.elapsed+2000;
      api.log(b,`${u.name}【首领蓄势 · 2秒】${({tiger:'即将虎啸扑阵，伤及全队',chief:'即将结阵，使敌方全体减伤 30%',raider:'即将绕后截粮，重击后位'})[boss.kind]}；可用截脉/眩晕打断，或护阵承受。`);
    }
  }
}
