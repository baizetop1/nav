import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareData, collections } from '../public/game/js/data.js';
import { dispatch, newGame, refresh } from '../public/game/js/core.js';
import { attributes, recruit, rollOrdinary } from '../public/game/js/hero.js';
import { damage, addStatus, startBattle, advanceBattle, useBattleItem, retreatBattle } from '../public/game/js/battle.js';
import { battleStep } from './shuihu-battle-test-helpers.mjs';
import { meets, exits } from '../public/game/js/map.js';
import { SaveStore, SaveConflict, SAVE_KEY, BACKUP_KEY, parseSave, validateSave } from '../public/game/js/save.js';
import { random } from '../public/game/js/utils.js';
import vm from 'node:vm';
const root=new URL('../public/game/',import.meta.url);
const raw=Object.fromEntries(['config',...collections].map(name=>[name,JSON.parse(readFileSync(new URL('data/'+name+'.json',root),'utf8'))]));
const schema=JSON.parse(readFileSync(new URL('data/schema.json',root),'utf8'));
// Validate the JSON Schema keywords used by our data contract, without a runtime dependency.
function checkSchema(value, rule, at='$') {
  if(rule.anyOf){assert.ok(rule.anyOf.some(option=>{try{checkSchema(value,option,at);return true;}catch{return false;}}),at+' anyOf');return;}
  if(Object.hasOwn(rule,'const'))assert.deepEqual(value,rule.const,at+' const');
  if(rule.type){
    const matches=rule.type==='array'?Array.isArray(value):rule.type==='null'?value===null:rule.type==='integer'?Number.isInteger(value):rule.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===rule.type;
    assert.ok(matches,at+' must be '+rule.type);
  }
  if(rule.pattern)assert.match(value,new RegExp(rule.pattern),at);
  if(rule.type==='object'){
    for(const key of rule.required||[])assert.ok(Object.hasOwn(value,key),at+'.'+key+' required');
    for(const [key,entry] of Object.entries(value)){
      if(rule.properties?.[key])checkSchema(entry,rule.properties[key],at+'.'+key);
      else if(rule.additionalProperties===false)assert.fail(at+'.'+key+' unexpected');
      else if(rule.additionalProperties&&typeof rule.additionalProperties==='object')checkSchema(entry,rule.additionalProperties,at+'.'+key);
    }
  }
  if(rule.type==='array'&&rule.items)value.forEach((entry,index)=>checkSchema(entry,rule.items,at+'['+index+']'));
}
checkSchema(raw,schema);
const badSchemaData=structuredClone(raw);badSchemaData.heroes[0].star='five';assert.throws(()=>checkSchema(badSchemaData,schema));
console.log('Shuihu: JSON Schema structural contract passed.');
const data=prepareData(raw), now=new Date(2026,8,9,10).getTime();
for(const [kind,count] of Object.entries({heroes:108,maps:46,items:464,equipments:20,skills:438,events:24,dungeons:9}))assert.equal(data[kind].length,count);
assert.equal(data.quests.filter(q=>q.type==='daily').length,12);
assert.equal(data.heroes.some(h=>h.id==='chaogai'),false);
const bad=structuredClone(raw);bad.maps[0].links[0].target='missing';assert.throws(()=>prepareData(bad),/引用不存在/);
let state=newGame(data,now,12345);validateSave(state,data);assert.equal(state.team.length,0);assert.equal(state.player.prestige,0);
const act=(type,extra={})=>{state=dispatch(data,state,{type,...extra},state.clock);validateSave(state,data);return state;};
const go=id=>act('move',{id});
assert.equal(exits(state,data).some(l=>l.target==='dongxi'),false);
assert.throws(()=>act('move',{id:'deepforest'}),/尚未开放/);
go('office');act('meet',{id:'songjiang'});go('yuncheng');go('tavern');act('meet',{id:'baisheng'});act('guide');act('meet',{id:'shiqian'});
assert.equal(state.heroes.baisheng.status,'owned');assert.deepEqual(state.team,['baisheng']);assert.equal(state.heroes.shiqian.status,'known');
act('mapAction',{id:'rumor_dongxi'});act('mapAction',{id:'rumor_tiger'});act('quest',{id:'main_arrival'});const claimed=JSON.stringify(state);assert.throws(()=>act('quest',{id:'main_arrival'}));assert.equal(JSON.stringify(state),claimed);
go('yuncheng');go('gate');assert.ok(exits(state,data).some(l=>l.target==='dongxi'));go('road');go('jingyang');go('inn');
act('story',{id:'wusong_story'});act('story',{id:'wusong_story',choice:'introduce'});assert.equal(state.location,'path');assert.equal(state.heroes.wusong.status,'known');assert.equal(state.team.includes('wusong'),false);
go('drywood');act('mapAction',{id:'tracks'});go('path');go('tracks');act('mapAction',{id:'follow'});go('deepforest');act('story',{id:'wusong_story',choice:'battle'});
assert.equal(state.battle.guest,true);assert.equal(state.battle.team[0].id,'wusong');
// Exercise automatic attacks plus manually selected skills/items, serializing each time slice.
for(let i=0;i<400&&state.battle&&!state.battle.outcome;i++){
  state=battleStep(data,state);state=parseSave(JSON.stringify(state),data,now);
}
assert.equal(state.battle.outcome,'victory',state.battle.log.join('\n'));
act('finishBattle');act('story',{id:'wusong_story',choice:'finish'});assert.equal(state.inventory.wusong_token,1);assert.equal(state.heroes.wusong.status,'known');assert.equal(state.progress.flags.tiger_complete,true);
assert.throws(()=>act('story',{id:'wusong_story',choice:'finish'}));assert.equal(state.inventory.wusong_token,1);
go('tracks');go('path');go('jingyang');go('road');go('gate');go('dongxi');go('zhuang');act('story',{id:'seven_stars_story'});act('story',{id:'seven_stars_story',choice:'join'});act('story',{id:'seven_stars_story',choice:'return'});act('story',{id:'seven_stars_story',choice:'pledge'});
assert.equal(state.progress.flags.seven_stars,true);assert.equal(state.heroes.wuyong.status,'known');assert.equal(Object.keys(state.heroes).length,108);
go('huangni');go('ridge');act('startScheme');for(let i=0;i<3&&!state.scheme.outcome;i++)act('scheme',{id:'early'});assert.equal(state.scheme.outcome,'failure');act('finishScheme');assert.equal(state.inventory.wuyong_token||0,0);
act('startScheme');for(const id of ['wait','original','probe','original','wait','finish'])if(!state.scheme.outcome)act('scheme',{id});assert.equal(state.scheme.outcome,'success');act('finishScheme');assert.equal(state.inventory.wuyong_token,1);assert.equal(state.inventory.gongsunsheng_token,1);assert.throws(()=>act('startScheme'));
const storyline=structuredClone(state);
console.log('Shuihu: content references/size, hidden paths, two complete story chains, tiger guest and scheme failure/retry passed.');

// Check base probability separately from pity so the 1% specification is measurable.
const sample=newGame(data,now,987654321), stars={1:0,2:0,3:0,4:0,5:0};
for(let i=0;i<100000;i++){sample.recruit.pity={three:0,four:0,five:0};stars[rollOrdinary(sample,data)]++;}
for(const {star,weight} of data.config.balance.ordinaryRates)assert.ok(Math.abs(stars[star]/100000-weight/100)<.005,JSON.stringify(stars));
for(const [key,threshold,min] of [['three',19,3],['four',49,4],['five',99,5]]){sample.recruit.pity={three:0,four:0,five:0,[key]:threshold};assert.ok(rollOrdinary(sample,data)>=min);}
const invitation=newGame(data,now,777);invitation.heroes.wusong.status='known';invitation.inventory.wusong_order=1;invitation.recruit.fate.wusong=4;
assert.equal(recruit(invitation,data,'wusong'),'wusong');assert.equal(invitation.heroes.wusong.status,'owned');assert.equal(invitation.inventory.wusong_order,0);assert.equal(invitation.recruit.fate.wusong,0);
invitation.inventory.wusong_order=1;invitation.recruit.fate.wusong=4;recruit(invitation,data,'wusong');assert.equal(invitation.inventory.wusong_token,3);assert.equal(Object.values(invitation.heroes).filter(h=>h.status==='owned').length,1);
const blocked=newGame(data,now,1);blocked.inventory.wusong_order=1;assert.throws(()=>recruit(blocked,data,'wusong'));assert.equal(blocked.inventory.wusong_order,1);
console.log('Shuihu: 100000 ordinary invitations',stars,'and all pity/duplicate/unknown gates passed.');

assert.equal(damage(100,60,1,1,false),70);assert.equal(damage(100,60,1,1,true),105);assert.equal(damage(1,500,1),1);
const combat=newGame(data,now,505);combat.heroes.wusong.status='owned';combat.heroes.wusong.level=20;combat.team=['wusong'];
startBattle(combat,data,{enemies:['bandit_chief'],context:{type:'event',id:'road_bandits'}});
const hp=combat.battle.team[0].hp;advanceBattle(combat,data,1000);advanceBattle(combat,data,1000);assert.ok(combat.battle.team[0].hp<hp,'Enemies attack without a player command');assert.ok(combat.battle.team[0].rage>=20);
addStatus(combat.battle.team[0],{id:'poison',turns:2,value:35},combat.battle.elapsed);addStatus(combat.battle.team[0],{id:'poison',turns:2,value:35},combat.battle.elapsed);assert.equal(combat.battle.team[0].statuses.length,2);
useBattleItem(combat,data,'jiedudan');assert.equal(combat.battle.team[0].statuses.some(s=>s.id==='poison'),false);
addStatus(combat.battle.team[0],{id:'stun',turns:1,value:0},combat.battle.elapsed);advanceBattle(combat,data,1000);advanceBattle(combat,data,1000);assert.ok(combat.battle.log.some(t=>t.includes('无法行动')));assert.equal(combat.battle.team[0].statuses.some(s=>s.id==='stun'),false);
retreatBattle(combat);assert.equal(combat.battle.outcome,'retreat');assert.throws(()=>useBattleItem(combat,data,'jinchuangyao'));
state=structuredClone(storyline);state.location='forge';act('equip',{id:state.equipment[0].uid,hero:'baisheng'});const beforeAtk=attributes(state,'baisheng',data).attack;act('strengthen',{id:state.equipment[0].uid});assert.ok(attributes(state,'baisheng',data).attack>beforeAtk);assert.throws(()=>act('dismantle',{id:state.equipment[0].uid}));act('equip',{id:state.equipment[0].uid,hero:null});act('dismantle',{id:state.equipment[0].uid});
state.inventory.wusong_token=10;act('craftOrder',{id:'wusong'});assert.equal(state.inventory.wusong_token,0);assert.equal(state.inventory.wusong_order,1);assert.throws(()=>act('craftOrder',{id:'wusong'}));
console.log('Shuihu: damage, automatic attacks, poison stacking, timed stun, medicine, retreat, equipment and token costs passed.');

const daily=newGame(data,now,31415), ids=[...daily.daily.ids];refresh(daily,data,now+60000);assert.deepEqual(daily.daily.ids,ids);
daily.player.stamina=50;daily.lastRegen=now;refresh(daily,data,now+600000);assert.equal(daily.player.stamina,51);refresh(daily,data,now+600000*200);assert.equal(daily.player.stamina,100);
daily.daily.dungeons.jingyanggang=3;daily.progress.flags.tiger_complete=true;const tomorrow=daily.clock+86400000;refresh(daily,data,tomorrow);assert.equal(daily.daily.dungeons.jingyanggang,undefined);assert.equal(daily.progress.flags.tiger_complete,true);const date=daily.daily.date;refresh(daily,data,now);assert.equal(daily.daily.date,date,'Clock rollback must not reset day');
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,v)=>memory.set(key,v)};
const store=new SaveStore(storage,data);assert.equal(store.load().status,'empty');const fresh=newGame(data,now,12);store.write(fresh);const tab=new SaveStore(storage,data);assert.equal(tab.load().status,'ok');store.write(dispatch(data,fresh,{type:'move',id:'office'},now));assert.throws(()=>tab.write(dispatch(data,fresh,{type:'move',id:'tavern'},now)),SaveConflict);assert.equal(store.backup().location,'yuncheng');
assert.deepEqual(parseSave(JSON.stringify(storyline),data),storyline);
for(const mutate of [s=>s.version=99,s=>s.heroes.wusong.level=-1,s=>s.inventory.not_real=1,s=>s.team=['wusong'],s=>s.player.silver=-1,s=>s.progress.stories.wusong_story.step='missing',s=>s.daily.claimed=['main_tiger']]){const broken=structuredClone(storyline);mutate(broken);assert.throws(()=>parseSave(JSON.stringify(broken),data));}
assert.throws(()=>parseSave('{"version":1,"__proto__":{}}',data));assert.throws(()=>parseSave('{',data));
const legacy=structuredClone(fresh);legacy.version=0;assert.equal(parseSave(JSON.stringify(legacy),data).version,2);
const goodBackup=memory.get(BACKUP_KEY);memory.set(SAVE_KEY,'bad json');const corrupt=new SaveStore(storage,data);assert.equal(corrupt.load().status,'invalid');assert.equal(memory.get(SAVE_KEY),'bad json');corrupt.write(fresh,true);assert.equal(memory.get(BACKUP_KEY),goodBackup,'Recovery must not overwrite good backup with corrupt bytes');
const quota=new SaveStore({getItem:()=>null,setItem(){throw new Error('quota');}},data);quota.load();assert.throws(()=>quota.write(fresh),/quota/);
console.log('Shuihu: regeneration, daily rollover, atomic reward guards, save roundtrip/migration/validation, corruption preservation and tab conflicts passed.');

// A seeded multi-day playthrough uses the actual command reducer, including loss/retry.
state=structuredClone(storyline);state.location='recruit';act('campFound');act('campFormation',{mode:'solo',deployment:1,tactic:'balanced'});
for(const h of ['shiqian','liutang','ruanxiaoqi'])assert.ok(heroRankCheck(state.heroes[h].status));
function heroRankCheck(status){return ['known','available','owned'].includes(status);}
let clearCount=0;
for(let day=0;day<14&&!state.progress.flags.volume_complete;day++){
  state=dispatch(data,state,{type:'refresh'},now+86400000*(day+1));
  state.location='recruit';
  while(state.camp.work<3)act('campWork');
  for(const id of ['shiqian','ruanxiaoqi'])if(state.heroes[id].status!=='owned'&&state.player.silver>=data.by.heroes[id].star*120)act('campInvite',{id});
  for(let i=0;i<3;i++){if(state.player.silver>=300)act('buy',{id:'recruit_order'});}
  while(state.inventory.recruit_order>0)act('recruit');
  const owned=data.heroes.filter(h=>state.heroes[h.id].status==='owned').sort((a,b)=>b.star-a.star);
  act('team',{ids:owned.slice(0,3).map(h=>h.id)});
  for(const h of owned.slice(0,3))while(state.inventory.exp_pill>0&&state.heroes[h.id].level<12)act('use',{id:'exp_pill',hero:h.id});
  for(const equip of state.equipment)if(!equip.hero)act('equip',{id:equip.uid,hero:state.team[0]});
  state.location='jingyang';
  for(let run=0;run<3;run++){
    if(state.player.stamina<10)break;
    act('dungeon',{id:'jingyanggang'});
    for(let tick=0;tick<400&&!state.battle.outcome;tick++)state=battleStep(data,state);
    if(state.battle.outcome==='victory')clearCount++;
    act('finishBattle');
    while(state.inventory.exp_pill>0&&state.heroes[state.team[0]].level<20)act('use',{id:'exp_pill',hero:state.team[0]});
  }
}
assert.equal(state.progress.flags.volume_complete,true,`Loop incomplete: clears=${clearCount}, prestige=${state.player.prestige}, owned=${state.team.length}`);assert.equal(state.player.liangshanLevel,1);
console.log('Shuihu: seeded whole-volume progression passed:',{clears:state.stats.clears,heroes:Object.values(state.heroes).filter(h=>h.status==='owned').length,prestige:state.player.prestige});

for(const dungeon of data.dungeons){
  let run=structuredClone(storyline);run.location=dungeon.map;run.team=['wusong','linchong','wuyong'];
  run.progress.flags.quality_trials_unlocked=true;run.progress.flags.chai_refuge=true;run.progress.flags.yang_complete=true;
  for(const id of run.team){run.heroes[id].status='owned';run.heroes[id].level=dungeon.level;}
  run.inventory.jinchuangyao=20;run.player.stamina=100;
  run=dispatch(data,run,{type:'dungeon',id:dungeon.id},now);
  if(run.scheme){for(const id of ['wait','original','probe','original','wait','finish'])if(!run.scheme.outcome)run=dispatch(data,run,{type:'scheme',id},now);assert.equal(run.scheme.outcome,'success');run=dispatch(data,run,{type:'finishScheme'},now);}
  else {
    for(let tick=0;tick<400&&!run.battle.outcome;tick++)run=battleStep(data,run);
    assert.equal(run.battle.outcome,'victory',dungeon.id+' recommended-level team: '+run.battle.log.slice(-10).join('\n'));
    run=dispatch(data,run,{type:'finishBattle'},now);
  }
  assert.equal(run.progress.clears[dungeon.id],1);assert.equal(run.daily.dungeons[dungeon.id],1);validateSave(run,data);
  for(let retry=0;retry<2;retry++){
    run=dispatch(data,run,{type:'dungeon',id:dungeon.id},now);
    run=dispatch(data,run,run.scheme?{type:'scheme',id:'retreat'}:{type:'battleRetreat'},now);
    run=dispatch(data,run,run.scheme?{type:'finishScheme'}:{type:'finishBattle'},now);
  }
  assert.throws(()=>dispatch(data,run,{type:'dungeon',id:dungeon.id},now),/次数已用完/);assert.equal(run.progress.clears[dungeon.id],1);
}
const handlers={};vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{URL,self:{location:{origin:'https://baizeone.top'},addEventListener:(id,fn)=>handlers[id]=fn}});
let handled=false;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://baizeone.top/nav/game/'},respondWith(){handled=true;}});assert.equal(handled,false,'Game must not poison navigation shell cache');
console.log('Shuihu: all seven dungeons, entry/retreat daily limits, loot and navigation-cache isolation passed.');
console.log('All Shuihu MVP checks passed.');
