import fs from 'node:fs';
import assert from 'node:assert/strict';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {mentorshipQuote} from '../public/game/js/mentorship.js';
import {RECIPES} from '../public/game/js/provisions.js';
import {gameSnapshot} from '../public/game/js/portable.js';
export const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
export function audit(seed=81,mid=false){
 let s=newGame(data,Date.parse('2026-10-04T04:00:00Z'),seed),battles=0,seconds=0,rest=0;const steps=[];
 const act=(type,a={})=>{s=dispatch(data,s,{type,...a},s.clock);assert.deepEqual(gameSnapshot(s,data),s);};
 const note=name=>steps.push({name,silver:s.player.silver,stamina:s.player.stamina,food:s.camp.food,wood:s.camp.wood,level:s.heroes.baisheng.level,team:s.team.length,battles,seconds,rest});
 const fight=()=>{act('battleSkillMode',{mode:'auto'});for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,data,1000);assert.equal(s.battle.outcome,'victory');seconds+=s.battle.elapsed/1000;battles++;act('finishBattle');};
 const pills=()=>{while(s.inventory.exp_pill)act('use',{id:'exp_pill',hero:'baisheng'});};
 act('campFound');for(const id of ['lumber','farm','barracks'])act('campBuild',{id});act('campClaim',{id:'foundation'});for(const e of s.equipment)act('equip',{id:e.uid,hero:'baisheng'});pills();act('campRecruit',{amount:10});act('campRaid',{id:'woods'});fight();act('campClaim',{id:'first_win'});pills();act('campBuild',{id:'hall'});note('首次出征并升聚义厅二级');
 act('campWork',{id:'balanced'});act('rotationStart',{kind:'daily',id:'silver',tier:1});fight();act('campInvite',{id:'duqian'});note('固定迎贤：杜迁入队');
 for(let i=0;i<2;i++){act('rotationStart',{kind:'daily',id:'silver',tier:1});fight();}act('campWork',{id:'balanced'});act('campInvite',{id:'shiqian'});note('三人队伍，无招募抽取');
 for(let i=0;i<6;i++){if(s.player.stamina<8){const ms=(8-s.player.stamina)*data.config.balance.regenMs;rest+=ms/60000;s=dispatch(data,s,{type:'refresh'},s.clock+ms);}if(s.camp.food<13)act('campWork',{id:'food'});act('campRaid',{id:'woods'});fight();pills();}note('七次山林出征后');
 if(mid){
  act('team',{ids:['duqian','shiqian','baisheng']});act('campBuild',{id:'hall'});act('campBuild',{id:'market'});act('campBuild',{id:'market'});
  const material=(id,n)=>{while((s.inventory[id]||0)<n){const r=RECIPES[id];if(r){if(!s.expansion?.recipes.includes(id))act('provisionUnlock',{id});for(const [k,v]of Object.entries(r.items))material(k,v);act('provisionCraft',{id});}else act('buy',{id});}};
  for(let day=1;day<=3;day++){
   rest+=1440;s=dispatch(data,s,{type:'refresh'},s.clock+86400000);
   for(let i=0;i<3;i++){act('rotationStart',{kind:'daily',id:'silver',tier:1});fight();}
   if(day===1){const recipe=data.by.equipments.bastion_spear.recipe;for(const [id,n]of Object.entries(recipe.items))material(id,n);act('craftEquip',{id:'bastion_spear'});act('equip',{id:s.equipment.at(-1).uid,hero:'duqian'});note('第二日：确定加工首件拒马枪');}
   for(let i=0;i<3;i++){const student=['duqian','shiqian'].find(id=>s.heroes[id].level<10);if(!student)break;const q=mentorshipQuote(s,data,'baisheng',student);assert.equal(q.reason,'');act('heroMentor',{mentor:'baisheng',student,expected:q.signature});}
  }
  assert.ok(s.team.every(id=>s.heroes[id].level>=10));note('第四日：全队十级、已有战法兵器');
 }
 return {seed,steps,state:s};
}
if(process.argv[1]?.endsWith('shuihu-progression-audit.mjs')){const rows=[1,7,81].map(seed=>{const x=audit(seed,true);return {seed,steps:x.steps};});fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../artifacts/progression-audit.json',import.meta.url),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));}
