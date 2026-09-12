import { battleOrder } from './commands.js?v=0.12.0';
import { accrueFrontier, frontierAction, enterPost, finishPost } from './frontier.js?v=0.12.0';
import { developmentAction, recordLedger } from './development.js?v=0.12.0';
import { enterRotation, finishRotation } from './rotations.js?v=0.12.0';
import { promoteHero } from './quality.js?v=0.12.0';
import { routeTo, claimLocalBenefit } from './world-map.js?v=0.12.0';
import { clone, bounded, count, dayKey, journal, pick, random, requireRule } from './utils.js?v=0.12.0';
import { exits, meets, heroRank, dungeonEntry } from './map.js?v=0.12.0';
import { gainExp, knowHero, ownHero, recruit, syncAvailability } from './hero.js?v=0.12.0';
import { gainItem, grant, itemAction, newEquipment, pay } from './item.js?v=0.12.0';
import { startBattle, advanceBattle, castSkill, useBattleItem, retreatBattle, setBattleSkillMode } from './battle.js?v=0.12.0';
import { effects, storyAction, visit } from './story.js?v=0.12.0';
import { growthAction, awardMountContracts } from './growth.js?v=0.12.0';

import { searchEquipment } from './camp-development.js?v=0.12.0';
import { campAction, settleCampBattle, attachTroops } from './camp.js?v=0.12.0';

export function newGame(data, now=Date.now(), seed=(now>>>0)||1) {
  const initial=data.config.initial;
  const state={version:data.config.version,rosterVersion:3,revision:0,clock:now,lastRegen:now,rng:seed,worldMinute:600,location:'yuncheng',startedAt:now,
    player:{name:'白泽寨主',title:'初入江湖',silver:initial.silver,merit:0,prestige:0,stamina:100,liangshanLevel:0},
    heroes:Object.fromEntries(data.heroes.map(h=>[h.id,{status:'unknown',level:1,exp:0}])),team:[],inventory:{...initial.items},equipment:[],nextEquipment:1,
    progress:{flags:{},stories:{},visited:['yuncheng'],actions:{},claims:[],clears:{}},stats:{},
    daily:{date:'',ids:[],claimed:[],bonus:false,counters:{},dungeons:{},events:[]},recruit:{total:0,pity:{three:0,four:0,five:0},fate:{}},
    battle:null,battleSkillMode:'manual',scheme:null,event:null,journal:[],message:'江湖路远，且从郓城开始。',formationPending:false};
  for(const id of initial.equipment)newEquipment(state,id);
  refresh(state,data,now);journal(state,'初入郓城。建寨之事，要从识人、用人开始。');return state;
}
export function refresh(state,data,now) {
  now=Math.max(state.clock,now);state.clock=now;accrueFrontier(state,data);
  const intervals=Math.floor((now-state.lastRegen)/data.config.balance.regenMs);
  if(state.player.stamina>=100)state.lastRegen=now;
  else if(intervals>0){state.player.stamina=Math.min(100,state.player.stamina+intervals);state.lastRegen=state.player.stamina===100?now:state.lastRegen+intervals*data.config.balance.regenMs;}
  const day=dayKey(now);
  if(day>state.daily.date) {
    state.daily={date:day,ids:[],claimed:[],bonus:false,counters:{},dungeons:{},events:[]};
    const pool=data.quests.filter(q=>q.type==='daily'&&meets(state,q.condition));
    while(state.daily.ids.length<3&&pool.length){const q=pick(state,pool);state.daily.ids.push(q.id);pool.splice(pool.indexOf(q),1);}
  }
}
function stamina(state,n) {requireRule(state.player.stamina>=n,`体力不足，需要 ${n} 点。每十分钟恢复一点，也可饮村酒。`);state.player.stamina-=n;}
export function questReady(state,q) {return q.type==='daily'?(state.daily.counters[q.goal.stat]||0)>=q.goal.amount:meets(state,q.condition);}
export function isBusy(state) {return !!(state.battle||state.scheme||state.event);}
function beginDungeon(state,data,id) {
  const d=data.by.dungeons[id];requireRule(dungeonEntry(state,d),'此处尚不能开启这次历练。');
  requireRule(state.team.length>0,'先在好汉页面安排出阵人手。');
  requireRule(Math.max(...state.team.map(id=>state.heroes[id].level))>=d.level,`队伍中至少一名好汉须达到 ${d.level} 级。`);
  requireRule((state.daily.dungeons[id]||0)<d.limit,'今日此处的历练次数已用完。');
  stamina(state,d.cost);state.daily.dungeons[id]=(state.daily.dungeons[id]||0)+1;
  if(d.kind==='scheme')beginScheme(state,data,{type:'dungeon',id});
  else {
    const c=state.camp,n=c?.mode==='army'?Math.min(c.troops,c.deployment):0;
    if(c?.mode==='army'){requireRule(n>0,'请先募兵，或在寨子改为英雄独行。');requireRule(c.food>=Math.ceil(n/2),'带兵粮草不足。');c.food-=Math.ceil(n/2);}
    startBattle(state,data,{enemies:d.enemy,scale:d.scale,context:{type:'dungeon',id}});if(c)attachTroops(state,n);
  }
}
function rewardDungeon(state,data,id) {
  const reward=data.by.rewards[data.by.dungeons[id].reward];grant(state,{...reward,items:{}},data);
  for(const [id,n] of Object.entries(reward.guaranteed))gainItem(state,id,n,data);
  const mounts=awardMountContracts(state,data,id);
  const drops=[];for(const drop of reward.items)if(random(state)<drop.rate){gainItem(state,drop.id,drop.count,data);drops.push(data.by.items[drop.id].name);}
  searchEquipment(state,data,Math.min(3,1+Math.floor(data.by.dungeons[id].level/15)));
  count(state,'clears');count(state,'clear_'+id);state.progress.clears[id]=(state.progress.clears[id]||0)+1;
  journal(state,`【${data.by.dungeons[id].name}】历练完成。碎银 +${reward.silver}、威望 +${reward.prestige}、功勋 +${reward.merit}；带回${Object.keys(reward.guaranteed).map(i=>data.by.items[i].name).join('、')}${drops.length?'，另得'+drops.join('、'):''}。`);
  if(mounts.length)journal(state,`【副本寻骑】获得 ${mounts.join('、')}。对应人物入寨后，到郓城马厩凭契领骑；不另收碎银。`);
}
function finishBattle(state,data) {
  const b=state.battle;requireRule(b&&b.outcome,'还未分出胜负。');
  settleCampBattle(state,data,b);
  if(b.outcome==='victory') {
    count(state,'battleWin');
    if(b.enemy.some(e=>e.model==='bandit'||e.model==='bandit_chief'))count(state,'bandits');
    if(state.formationPending&&!b.guest){count(state,'formationBattle');state.formationPending=false;}
    if(b.context.type==='story'){state.progress.stories[b.context.id].step=b.context.next;const story=data.by.stories[b.context.id];journal(state,'此战得胜，请在'+data.by.maps[story.steps[b.context.next].map].name+'续记【'+story.title+'】。');}
    else if(b.context.type==='dungeon')rewardDungeon(state,data,b.context.id);
    else if(b.context.type==='frontier')finishPost(state,b);
    else if(b.context.type==='rotation'){const reward=finishRotation(state,b);if(reward)grant(state,reward,data);}
    else if(b.context.type!=='camp'){grant(state,{silver:90,prestige:3,exp:100,items:{scrap_iron:1}},data);journal(state,'交战得胜，行旅得以安行。获得碎银与历练经验。');}
  } else {count(state,'battleLoss');journal(state,'此战收兵。好汉不会永久失去；再战前可调整队伍、药物与装备。');}
  state.battle=null;
}
function beginScheme(state,data,context) {
  state.scheme={id:'huangni_scheme',turn:0,values:{...data.schemes[0].initial},context,log:['日头渐毒，军汉肩上的担子越发沉重。杨志还在察看四周。'],outcome:null};
}
function schemeChoice(state,data,id) {
  const scene=state.scheme;requireRule(scene&&!scene.outcome,'当前没有进行中的计策。');
  const model=data.by.schemes[scene.id];
  if(id==='retreat'){scene.outcome='failure';scene.log.push('你示意众人散开，此次安排暂且作罢。');return;}
  if(id!=='finish') {
    const choice=model.choices.find(c=>c.id===id);requireRule(choice,'无效的计策选择。');
    for(const [key,n] of Object.entries(choice.change))scene.values[key]=bounded(scene.values[key]+n,0,100);
    scene.turn++;scene.log.push(choice.text);
  }
  const v=scene.values,s=model.success;
  if(v.alert>=s.maxAlert||v.exposure>=s.maxExposure){scene.outcome='failure';scene.log.push('杨志察觉异样，喝令军汉护住财货。吴用示意先退，此计尚需重新斟酌。');}
  else if(id==='finish'||scene.turn>=model.maxTurns){scene.outcome=v.fatigue>=s.fatigue&&v.trust>=s.trust?'success':'failure';scene.log.push(scene.outcome==='success'?'军汉们终于卸下戒心。白胜的酒已饮下，智取生辰纲之计成了。':'军汉仍不肯饮酒，时机尚未成熟，众人只得暂退。');}
}
function finishScheme(state,data) {
  const scene=state.scheme;requireRule(scene&&scene.outcome,'计策尚未收尾。');
  if(scene.outcome==='success') {
    if(scene.context.type==='dungeon')rewardDungeon(state,data,scene.context.id);
    else {requireRule(!state.progress.flags.huangni_complete,'这份首次奖励已领取。');state.progress.flags.huangni_complete=true;
      grant(state,{merit:50,prestige:40,items:{wuyong_token:1,gongsunsheng_token:1,recruit_order:2,exp_pill:4}},data);
      journal(state,'【智取生辰纲】计策已成。吴用与公孙胜各留下一枚信物，功勋 +50。通往梁山脚下的路已打开。');}
  } else {count(state,'schemeLoss');journal(state,'这次计策未成。暑热与疲劳可以等，疑心一生却难消。可重新安排，不会失去人物相识。');}
  state.scheme=null;
}
function completeVolume(state,data) {
  for(const chapter of data.chapters){
    if(state.progress.flags[chapter.completeFlag]||!meets(state,chapter.condition)||!chapter.requirements.every(r=>meets(state,r.condition)))continue;
    state.progress.flags[chapter.completeFlag]=true;state.player.liangshanLevel=Math.max(state.player.liangshanLevel,chapter.baseLevel);
    effects(state,chapter.effects,data);journal(state,chapter.ending);
  }
  state.player.title=state.progress.flags.volume_complete?'梁山寨主':state.player.prestige>=100?'一方豪杰':state.player.prestige>=40?'小有名气':'初入江湖';
}
// All commands are transactional: rejection discards the clone, including RNG/costs.
export function dispatch(data,current,action,now=Date.now()) {
  const state=clone(current);refresh(state,data,now);
  requireRule(action&&typeof action.type==='string','无效操作。');
  if(isBusy(state))requireRule(['battleOrder','battleTick','battleSkill','battleSkillMode','battleItem','battleRetreat','finishBattle','scheme','finishScheme','eventChoice','refresh'].includes(action.type),'先结束当前交战、计策或际遇，再作其他安排。');
  const {type,id}=action;
  if(type==='refresh')return state;
  if(type==='frontierAttack'){const p=enterPost(state,id);startBattle(state,data,{enemies:p.model.enemy,scale:p.model.scale,context:{type:'frontier',id,kind:p.kind,terrain:p.model.terrain}});attachTroops(state,p.troops);}
  else if(type.startsWith('frontier'))frontierAction(state,data,action);
  else if(['corpsTrain','presetSave','presetLoad','goalSet','goalClear','scrapSmelt'].includes(type))developmentAction(state,data,action);
  else if(type==='rotationStart'){const p=enterRotation(state,action.kind,id,action.tier);startBattle(state,data,{enemies:p.route.enemies,scale:p.scale,context:{type:'rotation',kind:action.kind,id,tier:p.tier,period:p.period}});attachTroops(state,p.troops);}
  else if(type==='heroPromote')promoteHero(state,data,action.id);
  else if(type.startsWith('camp'))campAction(state,data,action);
  else if(type==='travel'){const path=routeTo(state,data,id);requireRule(path&&path.length,'此路尚未开放，或已经身在此处。');for(const target of path){requireRule(exits(state,data).some(l=>l.target===target),'途中道路条件发生变化，请重新查看路线。');visit(state,target,data);}journal(state,'【行路】抵达'+data.by.maps[id].name+'。');}
  else if(type==='localBenefit')claimLocalBenefit(state,data);
  else if(type==='move'){requireRule(exits(state,data).some(link=>link.target===id),'此路尚未开放。');visit(state,id,data);}
  else if(type==='wait'){state.worldMinute=(state.worldMinute+360)%1440;journal(state,'你等了半日，天色已变。等候不额外恢复体力，体力按真实时间恢复。');}
  else if(type==='mapAction'){
    const a=data.by.maps[state.location].actions.find(a=>a.id===id);requireRule(a&&meets(state,a.condition),'此处没有这件事。');
    requireRule(!a.once||!state.progress.actions[id],'这件事已经办过。');effects(state,a.effects,data);state.progress.actions[id]=true;
    if(state.location==='tavern')count(state,'news');journal(state,a.text);
  }
  else if(type==='meet'){
    const h=data.by.heroes[id];requireRule(h&&h.meetMap===state.location&&meets(state,h.meetCondition),'尚未在此与这位人物相逢。');
    knowHero(state,id,'heard',data);knowHero(state,id,'known',data);journal(state,`${h.name}与你叙过姓名。${h.dialogue}`);
  }
  else if(type==='guide'){requireRule(state.location==='tavern'&&state.heroes.baisheng.status==='known'&&!state.progress.flags.guide,'先在酒肆与白胜相识。');state.progress.flags.guide=true;ownHero(state,'baisheng',data);journal(state,'白胜应下为你引路，正式加入队伍。这是乡人相助；武松等核心好汉仍需相识与招贤。');}
  else if(type==='story')storyAction(state,data,id,action.choice);
  else if(type==='startScheme'){requireRule(state.location==='ridge'&&state.progress.flags.seven_stars&&!state.progress.flags.huangni_complete,'先完成七星聚义，再到冈上安排；首次剧情不会重复发奖。');beginScheme(state,data,{type:'story',id:'huangni'});}
  else if(type==='scheme')schemeChoice(state,data,id);
  else if(type==='finishScheme')finishScheme(state,data);
  else if(type==='dungeon')beginDungeon(state,data,id);
  else if(type==='battleTick')advanceBattle(state,data,action.delta);
  else if(type==='battleOrder')battleOrder(state,action);
  else if(type==='battleSkill')castSkill(state,data,action.hero,id);
  else if(type==='battleSkillMode')setBattleSkillMode(state,action.mode);
  else if(type==='battleItem')useBattleItem(state,data,id);
  else if(type==='battleRetreat')retreatBattle(state);
  else if(type==='finishBattle')finishBattle(state,data);
  else if(type==='recruit'){delete state.recruit.lastBatch;recruit(state,data,id);}
  else if(type==='recruitTen'){
    requireRule(!id,'十连仅限普通招贤。');
    requireRule((state.inventory.recruit_order||0)>=10,'十连需要 10 张普通招贤令。');
    const results=[];
    for(let i=0;i<10;i++){recruit(state,data);results.push({...state.recruit.lastResult});syncAvailability(state,data);completeVolume(state,data);}
    state.commandVersion=1;state.recruit.lastBatch=results;
  }
  else if(type==='team'){
    requireRule(Array.isArray(action.ids)&&action.ids.length<=3&&new Set(action.ids).size===action.ids.length&&action.ids.every(id=>state.heroes[id]?.status==='owned'),'只可安排最多三名不重复的入寨好汉。');
    requireRule(action.ids.length>0||!Object.values(state.heroes).some(h=>h.status==='owned'),'至少留一名好汉出阵。');
    if(JSON.stringify(state.team)!==JSON.stringify(action.ids))state.formationPending=true;state.team=[...action.ids];journal(state,'阵容已定：前两位迎敌，第三位居后照应。');
  }
  else if(type==='quest'){
    const q=data.by.quests[id];requireRule(q,'没有这份差事。');const claims=q.type==='daily'?state.daily.claimed:state.progress.claims;
    requireRule(q.type!=='daily'||state.daily.ids.includes(id),'今天未派发这份差事。');requireRule(!claims.includes(id)&&questReady(state,q),'尚未办妥，或已经领取酬劳。');claims.push(id);grant(state,q.reward,data);journal(state,`【${q.name}】已办妥，酬劳收进行囊。`);
  }
  else if(type==='dailyBonus'){requireRule(!state.daily.bonus&&state.daily.ids.length===3&&state.daily.claimed.length===3,'先领齐今日三份差事的酬劳。');state.daily.bonus=true;grant(state,{silver:300,merit:20,items:{recruit_shard:1,mount_token:1}},data);journal(state,'【今日差事已毕】碎银 +300、功勋 +20、招贤令碎片 +1、驯骑凭记 +1。');}
  else if(type==='search'){
    requireRule((state.daily.counters.search||0)<12,'今日已寻访十二回，歇一歇，明日再访。');
    const pool=data.events.filter(e=>e.maps.includes(state.location)&&meets(state,e.condition)&&!state.daily.events.includes(e.id));requireRule(pool.length,'此处今日暂无新的际遇，可换一处走走。');
    stamina(state,2);count(state,'search');const event=pick(state,pool);state.event={id:event.id};journal(state,event.text);
  }
  else if(type==='eventChoice'){
    requireRule(state.event,'当前没有待处理的际遇。');const event=data.by.events[state.event.id],choice=event.options.find(c=>c.id===id);requireRule(choice,'无效选择。');
    pay(state,choice.cost);effects(state,choice.effects,data);if(choice.battle)startBattle(state,data,{enemies:choice.battle,context:{type:'event',id:event.id}});
    state.daily.events.push(event.id);count(state,'event');if(state.location==='tavern')count(state,'news');state.event=null;journal(state,choice.text);
  }
  else if(['skillUpgrade','skillBook','martialDrill','mountAdopt','mountFeed','mountRank','mountRide'].includes(type))growthAction(state,data,action);
  else if(['buy','use','craftOrder','exchange','craftEquip','buyEquip','equip','equipLock','strengthen','dismantle'].includes(type))itemAction(state,data,action);
  else throw new Error('尚未支持这个操作。');
  syncAvailability(state,data);completeVolume(state,data);recordLedger(current,state);state.revision++;return state;
}
