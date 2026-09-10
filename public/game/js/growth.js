import { count, journal, requireRule } from './utils.js?v=0.4.1';

export const SKILL_CAP=5, MOUNT_CAP=5;
export const GROWTH_PROFILES=['legacy','rally','weaken','combo','control','protect','purify','interrupt','pierce','bloodline','steal','triage','wave','shelter','discipline'];
export function skillLevel(state,id){return state.growth?.skills[id]||1;}
export function unlockReason(state,skill,guest=false){
  const t=skill?.training;if(!t)return '';
  if(guest)return t.tier==='base'?'':'剧情助阵仅使用基础招式';
  const hero=state.heroes[t.hero];
  if(hero?.status!=='owned')return '人物须正式入寨';
  if(hero.level<t.level)return `人物须达 ${t.level} 级`;
  if(t.flag&&!state.progress.flags[t.flag])return t.label;
  if(t.tier==='bond'){
    const m=state.growth?.mounts[t.hero];
    if(!m)return '先通关对应副本取得坐骑契，再到郓城马厩领骑';
    if(m.rank<3||m.intimacy<80)return '坐骑须达 3 阶、亲密 80';
    if(!m.riding)return '骑乘后羁绊生效';
  }
  return '';
}
export function trainedSkill(skill,level=1){
  if(!skill?.training||level===1)return skill;
  const rate=skill.effect.rate*(1+.08*(level-1));
  return {...skill,effect:{...skill.effect,rate}};
}
// A battle uses its own level snapshot; upgrades cannot retroactively alter a fight.
export function battleSkill(unit,skill){return trainedSkill(skill,unit?.training?.levels?.[skill?.id]||1);}
export function skillUpgradeQuote(state,skill){
  const level=skillLevel(state,skill?.id),t=skill?.training;
  const cost={silver:150*level,items:{[t?.hero+'_manual']:level,exp_pill:level}};
  let reason=!t?'此招式不可养成':unlockReason(state,skill);
  if(!reason&&level>=SKILL_CAP)reason='已达 5 级上限';
  if(!reason&&state.heroes[t.hero].level<Math.max(t.level,level*5))reason=`升级须人物达到 ${Math.max(t.level,level*5)} 级`;
  return {level,cost,reason:reason||costReason(state,cost)};
}
export function costReason(state,cost){
  if(state.player.silver<(cost.silver||0))return '碎银不足';
  if(Object.entries(cost.items||{}).some(([id,n])=>(state.inventory[id]||0)<n))return '升级材料不足';
  return '';
}
function spend(state,cost){requireRule(!costReason(state,cost),costReason(state,cost));state.player.silver-=cost.silver||0;for(const [id,n] of Object.entries(cost.items||{}))state.inventory[id]-=n;}
const owned=(state,id,data)=>requireRule(data.by.heroes[id]&&state.heroes[id]?.status==='owned','请选择已正式入寨的人物。');
export function mountQuote(state,id,type,data){
  const m=state.growth?.mounts[id];let reason='',cost={silver:0,items:{}};
  if(state.heroes[id]?.status!=='owned')reason='人物须正式入寨';
  else if(type==='mountAdopt'){
    const model=data?.by.heroes[id]?.mount,dungeon=data?.by.dungeons[model?.dungeon];
    if(!model?.contract||!dungeon)reason='坐骑来源配置未就绪';
    else{
      cost={silver:0,items:{[model.contract]:1}};
      if(m)reason='已有专属坐骑';
      else if(!(state.inventory[model.contract]>0))reason=`先通关「${dungeon.name}」，结算后获得「${data.by.items[model.contract].name}」`;
      else if(state.location!=='stable')reason='已持坐骑契，请到江湖 → 城中去处 → 郓城马厩领骑';
    }
  }else if(!m)reason='请先领骑';
  else if(type==='mountFeed'){cost.items.mount_feed=1;if(m.intimacy>=100)reason='亲密已满';}
  else if(type==='mountRank'){
    cost={silver:300*m.rank,items:{mount_token:2*m.rank,iron:3*m.rank}};
    if(m.rank>=MOUNT_CAP)reason='坐骑已达 5 阶';
    else if(m.intimacy<m.rank*20)reason=`升阶须亲密达到 ${m.rank*20}`;
  }else if(type!=='mountRide')reason='无效的坐骑操作';
  return {cost,reason:reason||costReason(state,cost)};
}
// Only called by the once-only dungeon victory settlement, never by drills,
// quest claims, story guests or save loading. A contract may await its hero.
export function awardMountContracts(state,data,dungeonId){
  const found=[];
  for(const h of data.heroes){const m=h.mount;
    if(m.dungeon!==dungeonId||state.growth?.mounts[h.id]||(state.inventory[m.contract]||0)>0)continue;
    state.inventory[m.contract]=1;found.push(data.by.items[m.contract].name);
  }
  return found;
}
export function growthAction(state,data,action){
  const {type,id}=action;
  requireRule(!state.battle&&!state.scheme&&!state.event,'先结束当前战局或际遇，再作养成安排。');
  state.growth??={version:1,skills:{},mounts:{}};
  if(type==='skillUpgrade'){
    const skill=data.by.skills[id],quote=skillUpgradeQuote(state,skill);requireRule(!quote.reason,quote.reason);
    spend(state,quote.cost);state.growth.skills[id]=quote.level+1;
    journal(state,`【招式精进】${data.by.heroes[skill.training.hero].name}的「${skill.name}」升至 ${quote.level+1} 级；消耗碎银 ${quote.cost.silver}、专属招式书 ${quote.level}、经验丹 ${quote.level}。`);
  }else if(type==='skillBook'){
    owned(state,id,data);spend(state,{items:{martial_pages:2}});state.inventory[id+'_manual']=(state.inventory[id+'_manual']||0)+1;
    journal(state,`【抄录招式】武学残页 -2，${data.by.heroes[id].name}专属招式书 +1。`);
  }else if(type==='martialDrill'){
    requireRule(Object.values(state.heroes).some(h=>h.status==='owned'),'先邀请一位好汉入寨。');
    requireRule(['yuncheng','stable','training'].includes(state.location),'切磋请到郓城、马厩或演武场。');
    requireRule((state.daily.counters.martialDrill||0)<3,'今日已切磋三次，明日再来。');
    requireRule(state.player.stamina>=10,'切磋需要 10 点体力。');state.player.stamina-=10;count(state,'martialDrill');
    for(const [item,n] of Object.entries({martial_pages:2,mount_feed:1,...(state.daily.counters.martialDrill===3?{mount_token:1}:{})}))state.inventory[item]=(state.inventory[item]||0)+n;
    journal(state,`【切磋研习】武学残页 +2、草料 +1${state.daily.counters.martialDrill===3?'、驯骑凭记 +1':''}。今日 ${state.daily.counters.martialDrill}/3 次。`);
  }else{
    owned(state,id,data);const quote=mountQuote(state,id,type,data);requireRule(!quote.reason,quote.reason);spend(state,quote.cost);
    if(type==='mountAdopt')state.growth.mounts[id]={rank:1,intimacy:0,riding:true};
    else if(type==='mountFeed')state.growth.mounts[id].intimacy=Math.min(100,state.growth.mounts[id].intimacy+10);
    else if(type==='mountRank')state.growth.mounts[id].rank++;
    else if(type==='mountRide')state.growth.mounts[id].riding=!state.growth.mounts[id].riding;
    const m=state.growth.mounts[id];journal(state,`【人骑同行】${data.by.heroes[id].name} · ${data.by.heroes[id].mount.name}：${m.rank} 阶，亲密 ${m.intimacy}/100，${m.riding?'骑乘中':'已下马'}。`);
  }
}

// Optional growth fields preserve v2 saves without giving out unearned materials.
export function validateGrowth(state,data,check){
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const g=state.growth;if(g===undefined)return;
  check(object(g)&&g.version===1&&object(g.skills)&&object(g.mounts),'养成版本或格式');
  check(Object.keys(g.skills).length<=data.heroes.length*4&&Object.keys(g.mounts).length<=data.heroes.length,'养成字典大小');
  for(const [id,n] of Object.entries(g.skills)){
    const t=data.by.skills[id]?.training;check(t&&integer(n,2,5)&&state.heroes[t.hero]?.status==='owned','招式等级或归属');
    check(state.heroes[t.hero].level>=Math.max(t.level,(n-1)*5)&&(!t.flag||state.progress.flags[t.flag]),'招式升级前置');
  }
  for(const [id,m] of Object.entries(g.mounts))check(data.by.heroes[id]&&state.heroes[id]?.status==='owned'&&object(m)&&integer(m.rank,1,5)&&integer(m.intimacy,0,100)&&typeof m.riding==='boolean'&&m.intimacy>=(m.rank-1)*20,'坐骑养成');
  for(const id of Object.keys(g.skills))if(data.by.skills[id].training.tier==='bond'){const m=g.mounts[data.by.skills[id].training.hero];check(m&&m.rank>=3&&m.intimacy>=80,'羁绊升级须保留坐骑养成条件');}
}
