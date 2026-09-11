import { idPattern, requireRule } from './utils.js?v=0.5.0';
import { GROWTH_PROFILES } from './growth.js?v=0.5.0';
export const collections=['heroes','skills','items','equipments','enemies','maps','stories','schemes','dungeons','rewards','events','quests','chapters'];
const numeric=(n,min=0)=>typeof n==='number'&&Number.isFinite(n)&&n>=min;
export function prepareData(raw) {
  const data={...raw,by:{}};
  for(const kind of collections){requireRule(Array.isArray(data[kind]),`缺少 ${kind} 数据。`);data.by[kind]={};
    for(const entry of data[kind]){requireRule(idPattern.test(entry.id)&&!Object.hasOwn(data.by[kind],entry.id),`${kind} 有重复或无效 ID。`);data.by[kind][entry.id]=entry;}}
  const ref=(kind,id)=>requireRule(typeof id==='string'&&Object.hasOwn(data.by[kind],id),`${kind} 引用不存在：${id}`);
  const condition=c=>{if(!c)return;for(const [key,value] of Object.entries(c)){
    if(key==='all'||key==='any'){requireRule(Array.isArray(value),'条件组合必须为数组。');value.forEach(condition);}
    else if(key==='item')ref('items',value);else if(key==='hero')ref('heroes',value);else if(key==='visited')ref('maps',value);
    else requireRule(['flag','notFlag','count','status','time','liangshanLevel','ownedCount','heroLevel','equipmentCount','unvisited','feature','stat','prestige'].includes(key),'未知条件：'+key);
  }};
  const effects=values=>{for(const e of values||[]){
    requireRule(['flag','hero','item','currency'].includes(e.type),'未知效果类型。');
    if(e.type==='hero'){ref('heroes',e.id);requireRule(['heard','known','available'].includes(e.status),'无效相识状态。');}
    if(e.type==='item'){ref('items',e.id);requireRule(Number.isInteger(e.amount)&&e.amount>0,'奖励数量必须为正整数。');}
    if(e.type==='currency')requireRule(['silver','merit','prestige'].includes(e.id)&&numeric(e.amount,-1000),'无效货币奖励。');
  }};
  const reward=r=>{for(const [id,n] of Object.entries(r?.items||{})){ref('items',id);requireRule(Number.isInteger(n)&&n>0,'无效道具奖励。');}};
  const cost=c=>{for(const key of ['silver','merit'])if(c?.[key]!==undefined)requireRule(Number.isInteger(c[key])&&c[key]>=0,'无效消耗。');reward(c);};
  for(const h of data.heroes){requireRule(h.name&&h.title&&Number.isInteger(h.star)&&h.star>=1&&h.star<=5,'好汉字段无效。');ref('maps',h.meetMap);condition(h.meetCondition);h.skills.forEach(id=>ref('skills',id));ref('items',h.obtain.token);for(const key of ['hp','attack','defense','speed','strategy'])requireRule(numeric(h.attribute[key],1)&&numeric(h.growth[key]),'好汉属性无效。');}
  for(const s of data.skills){requireRule(s.name&&numeric(s.cost)&&s.cost<=100&&['active','passive','strategy'].includes(s.type),'技能字段无效。');requireRule(['damage','strategy','heal','attribute'].includes(s.effect.kind)&&numeric(s.effect.rate),'技能效果无效。');if(s.effect.status)requireRule(['bleeding','poison','armor_break','stun','rage'].includes(s.effect.status.id)&&Number.isInteger(s.effect.status.turns)&&s.effect.status.turns>0,'战斗状态无效。');}
  for(const h of data.heroes){
    requireRule(h.skills.length===4&&new Set(h.skills).size===4&&h.mount?.name&&h.mount.description,'人物专属招式或坐骑缺失。');
    ref('dungeons',h.mount.dungeon);ref('items',h.mount.contract);
    requireRule(h.mount.contract===h.id+'_mount_contract'&&data.by.items[h.mount.contract].price===0&&data.by.items[h.mount.contract].type==='special','坐骑必须来自专属副本契，不能在商店购买。');
    const tiers=[];
    for(const id of h.skills){const t=data.by.skills[id].training;requireRule(t&&t.hero===h.id&&['base','advanced','bond'].includes(t.tier)&&Number.isInteger(t.level)&&t.level>=1&&t.level<=40&&typeof t.flag==='string'&&(!t.flag||idPattern.test(t.flag))&&t.label&&GROWTH_PROFILES.includes(t.profile),'人物招式养成配置无效。');tiers.push(t.tier);}
    requireRule(tiers.filter(t=>t==='base').length===2&&tiers.includes('advanced')&&tiers.includes('bond'),'每位人物需基础两招、进阶一招与羁绊一招。');ref('items',h.id+'_manual');
  }
  for(const item of data.items){requireRule(item.name&&item.description&&['consume','material','token','quest','special'].includes(item.type)&&numeric(item.price),'道具字段无效。');if(item.hero)ref('heroes',item.hero);}
  for(const equip of data.equipments){requireRule(['weapon','helmet','armor','belt','shoes','accessory'].includes(equip.type)&&equip.name&&numeric(equip.price),'装备字段无效。');for(const id of Object.keys(equip.recipe.items))ref('items',id);}
  for(const enemy of data.enemies){enemy.skills.forEach(id=>ref('skills',id));for(const key of ['hp','attack','defense','speed','strategy'])requireRule(numeric(enemy.attribute[key],1),'敌人属性无效。');requireRule(enemy.telegraphs.length>0,'敌人缺少预兆。');}
  for(const map of data.maps){requireRule(map.name&&map.description&&map.links.length>0,'地图缺少描述或返回路径。');for(const link of map.links){ref('maps',link.target);condition(link.condition);}for(const a of map.actions){effects(a.effects);condition(a.condition);}map.stories.forEach(id=>ref('stories',id));map.dungeons.forEach(id=>ref('dungeons',id));}
  for(const story of data.stories){ref('maps',story.map);condition(story.condition);requireRule(story.steps[story.start],'剧情起点不存在。');for(const step of Object.values(story.steps)){ref('maps',step.map);condition(step.condition);requireRule(step.text&&step.choices.length,'剧情缺少文本或选项。');requireRule(new Set(step.choices.map(c=>c.id)).size===step.choices.length,'剧情选项 ID 重复。');for(const c of step.choices){effects(c.effects);condition(c.condition);cost(c.cost);if(!c.finish)requireRule(story.steps[c.next],'剧情后续步骤不存在。');if(c.goMap)ref('maps',c.goMap);if(c.battle){requireRule(!c.finish&&c.battle.enemies.length>0,'剧情战必须有敌人及后续步骤。');c.battle.enemies.forEach(id=>ref('enemies',id));if(c.battle.guest){ref('heroes',c.battle.guest.id);requireRule(Number.isInteger(c.battle.guest.level)&&c.battle.guest.level>=1&&c.battle.guest.level<=data.config.balance.heroLevelCap,'剧情助阵等级无效。');}}}}}
  for(const d of data.dungeons){ref('maps',d.map);ref('rewards',d.reward);d.enemy.forEach(id=>ref('enemies',id));condition(d.condition);for(const entry of d.entrances||[]){ref('maps',entry.map);condition(entry.condition);}requireRule(d.level>=1&&d.level<=data.config.balance.heroLevelCap&&d.limit===3&&numeric(d.cost,1),'历练数值无效。');}
  for(const r of data.rewards){reward({items:r.guaranteed});for(const drop of r.items){ref('items',drop.id);requireRule(numeric(drop.rate)&&drop.rate<=1&&drop.count>0,'掉落权重无效。');}}
  for(const event of data.events){event.maps.forEach(id=>ref('maps',id));condition(event.condition);for(const c of event.options){effects(c.effects);(c.battle||[]).forEach(id=>ref('enemies',id));for(const id of Object.keys(c.cost?.items||{}))ref('items',id);}}
  for(const q of data.quests){condition(q.condition);reward(q.reward);requireRule(['daily','main'].includes(q.type)&&q.description,'差事字段无效。');if(q.type==='daily')requireRule(q.goal&&numeric(q.goal.amount,1),'每日差事目标无效。');}
  for(const q of data.quests)if(q.chapter)ref('chapters',q.chapter);
  for(const c of data.chapters){ref('maps',c.entry);condition(c.condition);requireRule(idPattern.test(c.completeFlag)&&c.title&&c.ending&&c.requirements.length>0&&c.baseLevel===1,'章节配置无效。');c.requirements.forEach(r=>{requireRule(r.label,'章节目标缺少说明。');condition(r.condition);});effects(c.effects);}
  for(const arc of data.config.heroArcs||[])ref('heroes',arc.hero);
  requireRule(data.config.version===2&&data.config.balance.ordinaryRates.reduce((s,e)=>s+e.weight,0)===100,'配置版本或招贤权重无效。');
  const forge=data.config.balance.strengthen;requireRule(forge.cap===10&&forge.advancedRate>0&&forge.advancedRate<=1&&numeric(forge.silverPerLevel,1),'强化规则无效。');ref('items',forge.advancedMaterial);
  return data;
}
export async function loadData(base=new URL('../data/',import.meta.url)) {
  const names=['config',...collections];
  const loaded=await Promise.all(names.map(async name=>{const response=await fetch(new URL(name+'.json',base),{cache:'no-cache'});if(!response.ok)throw new Error(`无法读取 ${name}.json（${response.status}）。请联网重试，原存档不会被覆盖。`);return [name,await response.json()];}));
  return prepareData(Object.fromEntries(loaded));
}
