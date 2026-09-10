import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {parseSave,validateSave,SaveStore,SAVE_KEY,BACKUP_KEY} from '../public/game/js/save.js';
import {exits,dungeonEntry,meets} from '../public/game/js/map.js';
import {strengthenQuote} from '../public/game/js/item.js';
import {battleStep} from './shuihu-battle-test-helpers.mjs';
const root=new URL('../public/game/data/',import.meta.url);
const raw=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))]));
const data=prepareData(raw),v1=JSON.parse(readFileSync(new URL('./fixtures/shuihu-v1-save.json',import.meta.url),'utf8'));
const migrated=parseSave(JSON.stringify(v1),data,v1.clock);
assert.equal(migrated.version,2);assert.equal(v1.version,1);
for(const key of ['team','inventory','equipment','progress','recruit','player','rng','clock','daily'])assert.deepEqual(migrated[key],v1[key],key+' preserved');
for(const id of Object.keys(v1.heroes))assert.deepEqual(migrated.heroes[id],v1.heroes[id]);
for(const id of ['chaijin','yangzhi'])assert.deepEqual(migrated.heroes[id],{status:'unknown',level:1,exp:0});
assert.deepEqual(parseSave(JSON.stringify(migrated),data),migrated,'Migration idempotent');
for(const mutate of [s=>delete s.heroes.linchong,s=>s.heroes.fake=s.heroes.linchong,s=>s.version=3,s=>s.equipment[0].plus=11]){const bad=structuredClone(v1);mutate(bad);assert.throws(()=>parseSave(JSON.stringify(bad),data));}
const memory=new Map([[SAVE_KEY,JSON.stringify(v1)]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
const store=new SaveStore(storage,data);const loaded=store.load();assert.equal(loaded.status,'ok');store.write(loaded.state);assert.equal(memory.get(BACKUP_KEY),JSON.stringify(v1));
assert.deepEqual(store.backup(),migrated);
// New-game heroes have no access to the second volume before completing the first.
const fresh=newGame(data,v1.clock,123);fresh.location='ferry';assert.equal(exits(fresh,data).some(e=>e.target==='dongjing'),false);
const explored=structuredClone(fresh);explored.progress.visited=data.maps.filter(m=>m.chapter==='volume_one').map(m=>m.id);
assert.equal(meets(explored,data.by.quests.daily_explore.condition),false,'Do not assign unreachable second-volume exploration');
explored.progress.flags.volume_complete=true;assert.equal(meets(explored,data.by.quests.daily_explore.condition),true);
assert.throws(()=>dispatch(data,fresh,{type:'story',id:'linchong_story',choice:'greet'},v1.clock));
let state=structuredClone(migrated);
// Preserve old ownership in migration tests, but explicitly exercise guest-only story combat here.
state.heroes.linchong.status='known';state.team=['baisheng','wuyong'];state.equipment[0].hero=null;
const act=(type,extra={})=>{state=dispatch(data,state,{type,...extra},state.clock);validateSave(state,data);state=parseSave(JSON.stringify(state),data,state.clock);return state;};
function travel(target){
  const queue=[[state.location]],seen=new Set();let route;
  while(queue.length){const p=queue.shift(),at=p[p.length-1];if(at===target){route=p;break;}if(seen.has(at))continue;seen.add(at);for(const e of exits({...state,location:at},data))queue.push([...p,e.target]);}
  assert.ok(route,'No route to '+target+' from '+state.location);for(const id of route.slice(1))act('move',{id});
}
const choose=(id,choice)=>act('story',{id,choice});
function win(){
  const guest=state.battle.team[0].id,before=state.heroes[guest].status;
  for(let i=0;i<400&&!state.battle.outcome;i++){state=battleStep(data,state);validateSave(state,data);state=parseSave(JSON.stringify(state),data,state.clock);}
  assert.equal(state.battle.outcome,'victory',state.battle.log.slice(-12).join('\n'));act('finishBattle');assert.equal(state.heroes[guest].status,before,'Guest must not auto-recruit');
}
travel('ferry');travel('dongjing_lane');choose('linchong_story','greet');assert.equal(state.progress.flags.lin_tolerant,true);
travel('xiangguosi');choose('luzhishen_story','follow');choose('luzhishen_story','promise');
travel('boar_forest');assert.throws(()=>choose('luzhishen_story','fight'));choose('linchong_story','watch');
assert.throws(()=>choose('linchong_story','escort'));choose('luzhishen_story','fight');
assert.equal(state.battle.team[0].id,'luzhishen');const retreatTokens=state.inventory.luzhishen_token||0;
act('battleRetreat');act('finishBattle');assert.equal(state.progress.stories.luzhishen_story.step,'rescue');assert.equal(state.inventory.luzhishen_token||0,retreatTokens);
choose('luzhishen_story','fight');win();choose('luzhishen_story','finish');assert.equal(state.inventory.luzhishen_token,retreatTokens+2);
assert.throws(()=>choose('luzhishen_story','finish'));choose('linchong_story','escort');
travel('cangzhou_inn');const branch=structuredClone(state);choose('linchong_story','warn');assert.equal(state.progress.flags.lin_warned,true);
const alternate=dispatch(data,branch,{type:'story',id:'linchong_story',choice:'duty'},branch.clock);assert.equal(alternate.progress.stories.linchong_story.step,'depot');assert.equal(alternate.inventory.iron,branch.inventory.iron+2);
travel('feed_depot');choose('linchong_story','shelter');assert.equal(exits(state,data).some(e=>e.target==='mountain_temple'),false);
act('mapAction',{id:'snow_tracks'});travel('mountain_temple');choose('linchong_story','hear');choose('linchong_story','fight');
assert.equal(state.battle.team[0].id,'linchong');win();const tokens=state.inventory.linchong_token;
choose('linchong_story','letter');assert.equal(state.inventory.linchong_token,tokens+2);assert.throws(()=>choose('linchong_story','letter'));
travel('chaijin_manor');choose('chaijin_story','introduce');assert.equal(state.location,'chaijin_guesthouse');
const missing=structuredClone(state);delete missing.inventory.refuge_letter;assert.throws(()=>dispatch(data,missing,{type:'story',id:'chaijin_story',choice:'deliver'},state.clock),/条件/);
choose('chaijin_story','deliver');assert.equal(state.inventory.refuge_letter,0);choose('chaijin_story','finish');assert.equal(state.heroes.chaijin.status,'known');
travel('ferry');choose('linchong_story','finish');assert.equal(state.progress.flags.lin_departure,true);assert.equal(state.progress.flags.volume_two_complete,undefined);
travel('qingzhou_road');choose('yangzhi_story','introduce');choose('yangzhi_story','fight');assert.equal(state.battle.team[0].id,'yangzhi');win();choose('yangzhi_story','finish');
assert.equal(state.progress.flags.volume_two_complete,true);assert.equal(state.heroes.yangzhi.status,'known');
const endingCount=state.journal.filter(e=>e.text.startsWith('【逼上梁山】')).length;assert.equal(endingCount,1);const rewards=structuredClone(state.inventory);act('wait');assert.deepEqual(state.inventory,rewards);
assert.equal(state.journal.filter(e=>e.text.startsWith('【逼上梁山】')).length,1);
const completed=structuredClone(state);
for(const id of ['chaijin','yangzhi']){travel('recruit');const count=state.inventory[id+'_token'];state.inventory[id+'_token']=10;act('craftOrder',{id});assert.equal(state.inventory[id+'_token'],0);state.recruit.fate[id]=4;act('recruit',{id});assert.equal(state.heroes[id].status,'owned');assert.equal(state.recruit.fate[id],0);assert.ok(count>=1);}
// Both old and new entrances use the same counter. Old v1 access stays available.
for(const [id,map] of [['yezhulin','boar_forest'],['shanshenmiao','mountain_temple']]){
  state=structuredClone(completed);state.team=['baisheng','wuyong'];state.heroes.baisheng.level=40;
  travel(map);assert.equal(dungeonEntry(state,data.by.dungeons[id]),true);act('dungeon',{id});act('battleRetreat');act('finishBattle');
  travel('expeditions');assert.equal(state.daily.dungeons[id],1);act('dungeon',{id});act('battleRetreat');act('finishBattle');assert.equal(state.daily.dungeons[id],2);
}
// Advanced forging is gated; failed attempts consume resources, never levels or equipment.
state=structuredClone(completed);travel('forge');const equip=state.equipment[0];assert.equal(equip.plus,5);assert.throws(()=>act('strengthen',{id:equip.uid}),/上限/);
act('mapAction',{id:'forge_new_method'});state.inventory.iron=1000;state.inventory.strength_charm=100;state.player.silver=100000;
let failed=false,won=false;
for(let seed=1;seed<10000&&(!failed||!won);seed+=97){const trial=structuredClone(state);trial.rng=seed*123456>>>0||1;const next=dispatch(data,trial,{type:'strengthen',id:equip.uid},trial.clock),q=strengthenQuote(trial,data,equip);assert.equal(next.player.silver,trial.player.silver-q.cost.silver);assert.equal(next.inventory.strength_charm,trial.inventory.strength_charm-1);assert.equal(next.equipment.length,trial.equipment.length);if(next.equipment[0].plus===5)failed=true;else if(next.equipment[0].plus===6)won=true;else assert.fail('Unexpected enhancement');validateSave(next,data);}
assert.ok(failed&&won,'Both outcomes exercised');state.equipment[0].plus=10;assert.throws(()=>act('strengthen',{id:equip.uid}),/上限/);
assert.equal(state.equipment[0].plus,10);assert.equal(state.inventory.strength_charm,100);
assert.throws(()=>{const broken=structuredClone(raw);broken.stories.find(s=>s.id==='chaijin_story').steps.letter.choices[0].cost.items.fake=1;prepareData(broken);},/引用不存在/);
console.log('Shuihu 0.2: v1 migration/backups, gated exploration, four complete story arcs, guest combat/retry, choices/costs, single rewards, recruit, shared dungeon limits and +10 forging passed.');
