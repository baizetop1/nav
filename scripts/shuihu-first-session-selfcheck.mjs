import {batchQuote} from '../public/game/js/batch.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {firstSessionGoal,firstBattleHint} from '../public/game/js/first-session.js';
import {storyObjective} from '../public/game/js/story-guide.js';
import {meets} from '../public/game/js/map.js';
import {afterBattleNext} from '../public/game/js/opening-ui.js';
import {debriefPanel} from '../public/game/js/sortie-ui.js';
import {guidance,guidePanel} from '../public/game/js/onboarding.js';
import {explorationHome} from '../public/game/js/exploration-goals-ui.js';
import {explorationMaterialSource} from '../public/game/js/exploration-goals.js';
import {acquisitionSources} from '../public/game/js/source-catalog.js';
export const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
export function auditFirstSession(seed=81){
 let s=newGame(d,Date.parse('2026-10-11T04:00:00Z'),seed),actions=0,seconds=0,medicine=0;const milestones=[],fights=[],commands=[],snapshots={};
 const mark=name=>{milestones.push({name,actions,battleSeconds:+seconds.toFixed(2),stamina:s.player.stamina,silver:s.player.silver,team:s.team.map(id=>({id,level:s.heroes[id].level})),wood:s.camp.wood,ore:s.inventory.magnetite_sand||0});snapshots[name]=structuredClone(s);};
 const act=(type,a={})=>{if(type==='batchApply')a={...a,expected:batchQuote(s,d,a).signature};s=dispatch(d,s,{type,...a},s.clock);if(type!=='battleTick'){actions++;commands.push({type,...a});assert.deepEqual(gameSnapshot(s,d),s);}};
 const fight=()=>{act('battleSkillMode',{mode:'auto'});for(let i=0;i<181&&!s.battle.outcome;i++){const hint=firstBattleHint(s,d);if(hint?.action){if(hint.id==='tiger-medicine'&&!snapshots.medicine)snapshots.medicine=structuredClone(s);if(hint.id==='mine-focus'&&!snapshots.focus)snapshots.focus=structuredClone(s);if(hint.action.command.type==='battleItem')medicine++;act(hint.action.command.type,hint.action.command);}act('battleTick',{delta:1000});}const b=s.battle;assert.equal(b.outcome,'victory',JSON.stringify({seed,context:b.context,team:b.team.map(u=>u.hp),enemy:b.enemy.map(u=>u.hp)}));seconds+=b.elapsed/1000;fights.push({id:b.context.id,route:b.context.route||'',seconds:+(b.elapsed/1000).toFixed(2)});act('finishBattle');};
 const story=()=>{const g=storyObjective(s,d);assert.equal(g.story==='wusong_story'||g.action?.id==='tracks'||g.action?.id==='follow'||g.map!==s.location,true);if(g.map!==s.location){act('travel',{id:g.map});return;}if(g.action){act(g.action.type,g.action);return;}const m=d.by.stories[g.story],p=s.progress.stories[m.id],c=m.steps[p?.step||m.start].choices.find(c=>meets(s,c.condition));act('story',{id:m.id,choice:c.id});if(s.battle)fight();};
 act('campFound');mark('start');
 for(let n=0;n<100;n++){
  const before=JSON.stringify(s),g=firstSessionGoal(s,d);assert.equal(JSON.stringify(s),before,'guidance must not alter progress');
  if(g){
   const a=g.command;
   if(g.id==='story'){story();if(s.progress.flags.tiger_complete&&!snapshots.tiger)mark('tiger');continue;}
   if(a.type==='ui_gearModel'){const e=s.equipment.find(e=>e.item===a.id&&!e.hero);assert.ok(e);act('equip',{id:e.uid,hero:a.id==='guard_pike'?'duqian':s.team[0]});if(a.id==='guard_pike'){mark('equipped');break;}continue;}
   if(a.type==='ui_batchPreview'){if(!snapshots.training)snapshots.training=structuredClone(s);act('batchApply',{kind:a.kind,id:a.id,count:a.count});continue;}
   if(a.type==='ui_materialBuy'){snapshots.material=structuredClone(s);const wanted=a.id==='wood'?3:2,count=wanted-(s.inventory[a.id]||0);for(let i=0;i<count;i++)act('buy',{id:a.id});continue;}
   if(a.type==='ui_regionalRecipe'){snapshots.recipe=structuredClone(s);act('regionalCraft',{id:a.id});mark('crafted');continue;}
   if(a.type==='ui_section')throw Error('unexpected blocked page '+JSON.stringify(g));
   if(a.type!=='ui_regionOpen'){act(a.type,a);continue;}
  }
  const has=k=>s.exploration?.flags.includes(k),go=node=>{if(!s.exploration)act('regionOpen',{region:'mine'});if(s.exploration.position!==node)act('regionMove',{id:node});};
  if(!s.exploration)mark('ready');
  if(!has('won_chamber')){go('chamber');act('regionBattle',{id:'chamber'});fight();mark('firstExploration');}
  else if(!has('rescued')){go('chamber');act('regionDo',{id:'rescue'});}
  else if(!has('surveyed')){go('vein');act('regionDo',{id:'survey'});}
  else if(!has('met')){go('furnace');act('regionDo',{id:'meet'});}
  else if(!has('repair_supplies')){go('furnace');act('regionDo',{id:'repair'});}
  else if(!has('commission')){go('furnace');act('regionDo',{id:'commission'});}
  else if(!has('won_vault')){go('vault');act('regionBattle',{id:'vault'});fight();}
  else if(!has('invited')){go('furnace');act('regionDo',{id:'invite'});mark('invited');}
  else if(!has('return_met')){go('furnace');act('regionDo',{id:'return'});}
  else if(!has('cart_checked')){go('rail');act('regionDo',{id:'checkcart'});}
  else if(!has('won_orecart')||(s.inventory.magnetite_sand||0)<6&&has('return_paid')){go('vault');act('regionBattle',{id:'vault',approach:'orecart'});fight();}
  else if(!has('return_paid')){go('furnace');act('regionDo',{id:'thanks'});mark('returned');}
  else throw Error('stalled '+JSON.stringify(g));
 }
 assert.ok(snapshots.equipped,'route must finish crafting and equipping');assert.equal(s.heroes.tanglong.status,'owned');assert.equal(s.recruit.total,0);assert.equal(s.player.stamina>=0,true);assert.equal(s.clock,s.startedAt,'no injected offline time or regeneration');assert.equal(s.stats.regional_craft_mine,1);assert.equal(firstSessionGoal(s,d),null);assert.deepEqual(importSave(exportSave(s,{id:1,name:'首次出行'},d),d).state,s);
 return {seed,actions,battleSeconds:+seconds.toFixed(2),medicine,milestones,fights,commands,snapshots,state:s};
}
export function verifyFirstSession(){
 const runs=[1,7,81].map(auditFirstSession);for(const r of runs)console.log('First session',JSON.stringify({seed:r.seed,actions:r.actions,battleSeconds:r.battleSeconds,medicine:r.medicine,stamina:r.state.player.stamina,silver:r.state.player.silver,fights:r.fights}));
 const r=runs[2],s=structuredClone(r.snapshots.ready),original=JSON.stringify(s);s.development={version:1,skills:{},corps:{},presets:[],goal:{kind:'invite',id:'andaoquan'}};assert.match(explorationHome(s,d,x=>x,(label)=>label),/邀请安道全/);assert.doesNotMatch(explorationHome(s,d,x=>x,label=>label),/初次出行/);
 const outside=JSON.parse(original);outside.idleDispatch={mission:{hero:'duqian'}};assert.equal(firstSessionGoal(outside,d).command.type,'ui_idleOpen');outside.idleDispatch=null;outside.realm={squad:{team:['duqian']}};assert.equal(firstSessionGoal(outside,d).command.id,'expeditions');
 const old=JSON.parse(original);old.camp.buildings.hall=3;assert.equal(firstSessionGoal(old,d),null);const later=JSON.parse(original);later.progress.flags.volume_complete=true;assert.equal(firstSessionGoal(later,d),null);
 const crafted=structuredClone(r.state);crafted.equipment=crafted.equipment.filter(e=>e.item!=='guard_pike');assert.equal(firstSessionGoal(crafted,d),null,'sold/dismantled first weapon must not restart guidance');
 const dry=structuredClone(r.snapshots.medicine);dry.inventory.jinchuangyao=0;assert.equal(firstBattleHint(dry,d),null,'do not offer unavailable medicine');const recovery=dispatch(d,r.snapshots.focus,{type:'battleOrder',kind:'stance',value:'guard'},r.snapshots.focus.clock);assert.equal(firstBattleHint(recovery,d).action.command.kind,'focus','focus stays usable during stance cooldown');
 const source=explorationMaterialSource(r.snapshots.returned,'magnetite_sand');assert.deepEqual(source.command,{type:'ui_sources',id:'magnetite_sand'});const repeatSource=acquisitionSources(r.snapshots.returned,d,'magnetite_sand').find(row=>row.key==='route:minechief:orecart');assert.equal(repeatSource.mode,'必得');assert.equal(repeatSource.reason,'');assert.equal(repeatSource.command.route,'orecart');assert.match(repeatSource.detail,/寻常胜利 1/);
 const missing=structuredClone(r.snapshots.returned);missing.camp.wood=0;missing.player.stamina=0;assert.equal(firstSessionGoal(missing,d).command.id,'supplies');
 let tiger=dispatch(d,r.snapshots.start,{type:'travel',id:'inn'},r.state.clock);tiger=dispatch(d,tiger,{type:'story',id:'wusong_story',choice:'introduce'},tiger.clock);tiger=dispatch(d,tiger,{type:'travel',id:'drywood'},tiger.clock);tiger=dispatch(d,tiger,{type:'mapAction',id:'tracks'},tiger.clock);tiger=dispatch(d,tiger,{type:'travel',id:'tracks'},tiger.clock);tiger=dispatch(d,tiger,{type:'mapAction',id:'follow'},tiger.clock);tiger=dispatch(d,tiger,{type:'travel',id:'deepforest'},tiger.clock);tiger=dispatch(d,tiger,{type:'story',id:'wusong_story',choice:'battle'},tiger.clock);tiger=dispatch(d,tiger,{type:'battleSkillMode',mode:'auto'},tiger.clock);
 let found=false;for(let n=0;n<30&&!tiger.battle.outcome;n++){tiger=dispatch(d,tiger,{type:'battleTick',delta:1000},tiger.clock);const g=guidance(tiger,d,'battle');if(g?.id==='tiger-medicine'){found=true;assert.match(guidePanel(g,true,x=>x),/用金创药/);assert.equal(g.action.command.type,'battleItem');assert.equal(guidance(tiger,d,'battle','',true).action.command.type,'ui_battlePause','paused hint must resume before using medicine');}}
 assert.ok(found);assert.equal(tiger.battle.outcome,'defeat');assert.match(afterBattleNext(tiger,tiger.battle,d,null).text,/临时助阵/);assert.equal(afterBattleNext(tiger,tiger.battle,d,null).command.type,'ui_storyResume');tiger=dispatch(d,tiger,{type:'finishBattle'},tiger.clock);assert.doesNotMatch(debriefPanel(tiger.lastBattle,d,x=>x),/可调整前两位/);assert.match(debriefPanel(tiger.lastBattle,d,x=>x),/寨中人物等级与装备不影响/);
 console.log('First session PASS: fresh saves, actual costs/combat, no extra resources/recruiting/offline wait, first invitation and crafted weapon, read-only guidance, existing targets, old progression, repeat suppression, supply source and guest battle recovery.');return runs;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const runs=verifyFirstSession();fs.mkdirSync('artifacts/first-session',{recursive:true});fs.writeFileSync('artifacts/first-session/audit.json',JSON.stringify(runs.map(({snapshots,state,commands,...r})=>r),null,2));for(const [name,s]of Object.entries(runs[2].snapshots))fs.writeFileSync('artifacts/first-session/'+name+'.json',JSON.stringify(s));}
