// A playable route: only dispatch commands and elapsed time change the save.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {audit,data as d} from './shuihu-progression-audit.mjs';
import {battleStep} from './shuihu-battle-test-helpers.mjs';
import {dispatch} from '../public/game/js/core.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {storyObjective} from '../public/game/js/story-guide.js';
import {meets} from '../public/game/js/map.js';
import {buildingQuote} from '../public/game/js/camp.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {strengthenQuote} from '../public/game/js/item.js';
import {chapterBattlePlan} from '../public/game/js/volume-three.js';
export function twelveAudit(seed=81){
 const opening=audit(seed,true);let s=opening.state,training=opening.steps.at(-1).battles,storyFights=0,losses=0,restMinutes=opening.steps.at(-1).rest,medicine=0,fallen=0,wounded=0;const checkpoints=[],decisions=[],retries={},start=s.startedAt;
 const act=(type,a={})=>{s=dispatch(d,s,{type,...a},s.clock);};
 const rest=n=>{if(s.player.stamina<n){const ms=(n-s.player.stamina)*d.config.balance.regenMs;restMinutes+=ms/60000;s=dispatch(d,s,{type:'refresh'},s.clock+ms);}};
 const work=id=>{rest(5);act('campWork',{id});};
 const funds=(silver=0,food=0,wood=0)=>{let tries=0;while(s.player.silver<silver||s.camp.food<food||s.camp.wood<wood){if(tries++>300)throw Error('resource loop');work(s.camp.wood<wood?'wood':s.camp.food<food?'food':'silver');}};
 const build=(id,target)=>{while(s.camp.buildings[id]<target){if(id!=='hall'&&s.camp.buildings.hall<target)build('hall',target);const q=buildingQuote(s.camp,id);funds(q.silver,0,q.wood);act('campBuild',{id});}};
 const battle=()=>{act('battleSkillMode',{mode:'auto'});for(let i=0;i<180&&!s.battle.outcome;i++){s=battleStep(d,s,1000);}const won=s.battle.outcome==='victory';if(!won)losses++;if(s.battle.context.type==='story')storyFights++;else training++;const info={id:s.battle.context.id,won,seconds:s.battle.elapsed/1000};medicine+=s.battle.metrics?.medicineUses||0;act('finishBattle');fallen+=s.lastBattle?.fallen||0;wounded+=s.lastBattle?.wounded||0;return info;};
 const pills=()=>{while(s.inventory.exp_pill){const id=[...s.team].sort((a,b)=>s.heroes[a].level-s.heroes[b].level)[0];if(s.heroes[id].level>=40)break;act('use',{id:'exp_pill',hero:id});}};
 let equipped=false;
 const outfit=()=>{if(equipped)return;for(const id of s.team)for(const item of ['monk_staff','chain_armor','guard_helmet','sturdy_belt','swift_boots','medic_pouch']){funds(d.by.equipments[item].price*2);act('buyEquip',{id:item});act('equip',{id:s.equipment.at(-1).uid,hero:id});}equipped=true;};
 const troops=()=>{build('barracks',3);build('clinic',2);funds(1500,1000);while(s.camp.wounded){funds(0,20);act('campHeal');}while(s.camp.troops<300){funds(500,200);act('campRecruit',{amount:100});}act('campFormation',{mode:'army',tactic:'guard',deployment:300});};
 const train=target=>{build('hall',3);let loops=0;while(s.team.some(id=>s.heroes[id].level<target)){if(loops++>300)throw Error('training loop');act('campFormation',{mode:'solo',tactic:'balanced',deployment:100});funds(0,18);rest(8);act('campRaid',{id:'fort'});const f=battle();if(!f.won)throw Error('cannot train fort');pills();}};
 const cost=c=>{if(!c)return;funds(c.silver||0);for(const [id,n]of Object.entries(c.items||{}))while((s.inventory[id]||0)<n){if(!d.by.items[id].price)throw Error('unobtainable cost '+id);funds(d.by.items[id].price);act('buy',{id});}funds(c.silver||0);};
 const strengthen=()=>{for(const uid of s.equipment.filter(e=>e.hero).map(e=>e.uid)){while(s.equipment.find(e=>e.uid===uid).plus<5){cost(strengthenQuote(s,d,s.equipment.find(e=>e.uid===uid)).cost);act('strengthen',{id:uid});}}};
 act('campFormation',{mode:'solo',tactic:'balanced',deployment:100});
 for(const id of s.team)for(const item of ['oak_staff','cloth_armor'])if(!s.equipment.some(e=>e.hero===id&&d.by.equipments[e.item].type===d.by.equipments[item].type)){funds(d.by.equipments[item].price*2);act('buyEquip',{id:item});act('equip',{id:s.equipment.at(-1).uid,hero:id});}
 try{
 for(let steps=0;steps<1000&&!s.progress.flags.volume_twelve_complete;steps++){
  for(const c of d.chapters)if(s.progress.flags[c.completeFlag]&&!checkpoints.some(x=>x.volume===c.number)){const p={volume:c.number,days:+((s.clock-start)/86400000).toFixed(2),training,storyFights,losses,levels:s.team.map(id=>s.heroes[id].level),silver:s.player.silver,food:s.camp.food,wood:s.camp.wood};checkpoints.push(p);console.log('Volume',JSON.stringify(p));assert.deepEqual(gameSnapshot(s,d),s);}
  let g=storyObjective(s,d);if(g.chapter>=5){outfit();if(g.chapter>=8)strengthen();troops();}for(const id of ['v6_scout','v6_cut','v7_cut']){const m=d.by.stories[id];if(!s.progress.stories[id]?.status?.includes('completed')&&meets(s,m.condition)&&g.chapter===Number(id[1])){g={...g,story:id,map:m.steps[s.progress.stories[id]?.step||m.start].map,action:null};break;}}decisions.push({step:steps,chapter:g.chapter,title:g.title,story:g.story,map:g.map});
  if(g.map&&g.map!==s.location){act('travel',{id:g.map});continue;}
  if(g.action){if(g.action.type==='dungeon'){if((s.daily.dungeons[g.action.id]||0)>=3){s=dispatch(d,s,{type:'refresh'},s.clock+86400000);restMinutes+=1440;}rest(d.by.dungeons[g.action.id].cost);}act(g.action.type,g.action);if(s.battle)battle();if(s.scheme){for(const id of ['original','original','original','wait','finish'])if(!s.scheme.outcome)act('scheme',{id});act('finishScheme');training++;}pills();continue;}
  if(g.title==='智取生辰纲'){act('startScheme');for(const id of ['original','original','original','wait','finish']){if(!s.scheme.outcome)act('scheme',{id});}if(!s.scheme.outcome)throw Error('scheme');act('finishScheme');continue;}
  if(g.story){const m=d.by.stories[g.story],p=s.progress.stories[g.story],step=m.steps[p?.step||m.start];const choices=step.choices.filter(c=>meets(s,c.condition));if(!choices.length){if(!p){act('story',{id:m.id});continue;}throw Error('no choice '+m.id);}const choice=choices[0];cost(choice.cost);const q=chapterBattlePlan(s,m.id);if(q.model){build('hall',q.model.hall||1);train(q.model.level);cost({items:{jinchuangyao:5}});funds(0,chapterBattlePlan(s,m.id).food);rest(q.model.stamina);}act('story',{id:m.id,choice:choice.id});if(s.battle){const result=battle();if(!result.won){retries[m.id]=(retries[m.id]||0)+1;if(retries[m.id]>=5)throw Error('five defeats '+JSON.stringify(result));train(Math.min(40,Math.max(...s.team.map(id=>s.heroes[id].level))+3));}}continue;}
  if(g.view==='trials'){if((s.daily.dungeons.jingyanggang||0)>=3){s=dispatch(d,s,{type:'refresh'},s.clock+86400000);restMinutes+=1440;}rest(10);act('dungeon',{id:'jingyanggang'});const q=battle();if(!q.won)train(Math.min(40,Math.max(...s.team.map(id=>s.heroes[id].level))+3));pills();continue;}
  if(g.view==='heroes'){const n=+(g.title.match(/(\d+) 级/)||g.detail.match(/(\d+) 级/)||[])[1];train(n||15);continue;}
  if(g.view==='camp'&&g.section==='buildings'){const n=+(g.title.match(/(\d+) 级/)||g.detail.match(/(\d+) 级/)||[])[1];build('hall',n||3);if(g.detail.includes('农田'))build('farm',n||1);if(g.detail.includes('伐木'))build('lumber',n||1);if(g.detail.includes('医馆'))build('clinic',n||1);if(g.detail.includes('兵营'))build('barracks',n||1);if(g.detail.includes('集市'))build('market',n||1);continue;}
  if(g.title==='补足出征体力'){rest(30);continue;}
  if(g.title==='备足出征粮草'){funds(0,100);continue;}
  const hero=d.heroes.find(h=>g.title==='结识'+h.name&&h.meetMap===s.location);if(hero){act('meet',{id:hero.id});continue;}
  throw Error('unhandled objective '+JSON.stringify(g));
 }
 assert.ok(s.progress.flags.volume_twelve_complete,'route must finish');checkpoints.push({volume:12,days:+((s.clock-start)/86400000).toFixed(2),training,storyFights,losses,levels:s.team.map(id=>s.heroes[id].level),silver:s.player.silver,food:s.camp.food,wood:s.camp.wood});assert.deepEqual(gameSnapshot(s,d),s);
 }catch(e){fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/twelve-audit-blocked.json',JSON.stringify({error:e.message,decisions:decisions.slice(-10),state:s},null,2));throw e;}
 return {seed,checkpoints,restMinutes,medicine,fallen,wounded,decisions};
}
if(process.argv[1]?.endsWith('shuihu-twelve-volume-audit.mjs')){const result=twelveAudit(+(process.argv[2]||81));fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/twelve-volume-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.checkpoints));}
