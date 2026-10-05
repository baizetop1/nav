import fs from 'node:fs';
import assert from 'node:assert/strict';
import {audit,data as d} from './shuihu-progression-audit.mjs';
import {dispatch} from '../public/game/js/core.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {mentorshipQuote} from '../public/game/js/mentorship.js';
import {rotationCalendar} from '../public/game/js/rotations.js';
import {buildingQuote} from '../public/game/js/camp.js';
export function sustainedAudit(seed=81){
 let s=audit(seed,true).state,days=0,fights=0,losses=0,rests=0;const checkpoints=[],log=[];
 const act=(type,a={})=>{s=dispatch(d,s,{type,...a},s.clock);};
 const wait=()=>{s=dispatch(d,s,{type:'refresh'},s.clock+86400000);days++;};
 const energy=n=>{if(s.player.stamina<n){const ms=(n-s.player.stamina)*d.config.balance.regenMs;s=dispatch(d,s,{type:'refresh'},s.clock+ms);rests+=ms/60000;}};
 const work=id=>{energy(5);act('campWork',{id});};
 const fight=(type,a)=>{energy(10);act(type,a);act('battleSkillMode',{mode:'auto'});for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);const won=s.battle.outcome==='victory';fights++;if(!won)losses++;log.push({day:days,type,id:a.id,tier:a.tier,outcome:s.battle.outcome,seconds:s.battle.elapsed/1000,levels:s.team.map(id=>s.heroes[id].level)});act('finishBattle');return won;};
 act('campFormation',{mode:'solo',tactic:'balanced',deployment:100});
 for(const id of s.team){for(const item of ['oak_staff','cloth_armor']){if(s.equipment.some(e=>e.hero===id&&d.by.equipments[e.item].type===d.by.equipments[item].type))continue;while(s.player.silver<d.by.equipments[item].price)work('silver');act('buyEquip',{id:item});act('equip',{id:s.equipment.at(-1).uid,hero:id});}}
 for(const target of [20,30,40]){
  let loops=0;
  while(s.team.some(id=>s.heroes[id].level<target)&&loops++<160){
   wait();const tier=Math.min(3,s.camp.buildings.hall,Math.floor((Math.max(...s.team.map(id=>s.heroes[id].level))-1)/10)+1);
   for(const id of ['silver','grain'])for(let i=0;i<3;i++){if(!fight('rotationStart',{kind:'daily',id,tier}))break;}
   if([0,2,5].includes(rotationCalendar(s.clock).weekday))for(let i=0;i<3;i++)if(!fight('rotationStart',{kind:'daily',id:'manual',tier}))break;
   for(let i=0;i<5;i++){while(s.camp.food<18)work('food');if(!fight('campRaid',{id:'fort'}))break;}
   while(s.inventory.exp_pill&&s.team.some(id=>s.heroes[id].level<target)){const id=[...s.team].sort((a,b)=>s.heroes[a].level-s.heroes[b].level)[0];act('use',{id:'exp_pill',hero:id});}
   const sorted=[...s.team].sort((a,b)=>s.heroes[b].level-s.heroes[a].level);
   for(let i=0;i<3;i++){const q=mentorshipQuote(s,d,sorted[0],sorted.at(-1));if(q.reason)break;act('heroMentor',{mentor:q.mentor,student:q.student,expected:q.signature});}
   assert.deepEqual(gameSnapshot(s,d),s);
  }
  checkpoints.push({target,additionalDays:days,fights,losses,restMinutes:rests,levels:s.team.map(id=>({id,level:s.heroes[id].level})),silver:s.player.silver,food:s.camp.food,wood:s.camp.wood});
  assert.ok(s.team.every(id=>s.heroes[id].level>=target),'bounded progression to '+target);
 }
 const q=buildingQuote(s.camp,'clinic');while(s.camp.wood<q.wood||s.player.silver<q.silver)work('balanced');act('campBuild',{id:'clinic'});
 act('campFormation',{mode:'army',tactic:'balanced',deployment:100});while(s.camp.food<200||s.player.silver<500)work('balanced');act('campRecruit',{amount:100});
 const before={silver:s.player.silver,food:s.camp.food,troops:s.camp.troops};let wounded=0,fallen=0;
 for(let i=0;i<10;i++){energy(10);while(s.camp.food<100)work('food');act('campRaid',{id:'fort'});act('battleRetreat');act('finishBattle');wounded+=s.lastBattle.wounded;fallen+=s.lastBattle.fallen||0;while(s.camp.wounded){if(s.camp.food<10)work('food');act('campHeal');}while(s.camp.troops<100){while(s.player.silver<50||s.camp.food<20)work('balanced');act('campRecruit',{amount:10});}}
 assert.deepEqual(gameSnapshot(s,d),s);
 return {seed,checkpoints,recovery:{attempts:10,wounded,fallen,before,after:{silver:s.player.silver,food:s.camp.food,troops:s.camp.troops}},log};
}
if(process.argv[1]?.endsWith('shuihu-sustained-audit.mjs')){const rows=[1,7,81].map(sustainedAudit);fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../artifacts/sustained-audit.json',import.meta.url),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(({log,...r})=>r),null,2));}
