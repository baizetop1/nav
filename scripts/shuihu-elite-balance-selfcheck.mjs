import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';import {newGame,dispatch} from '../public/game/js/core.js';import {freshCamp} from '../public/game/js/camp.js';import {advanceBattle} from '../public/game/js/battle.js';import {ELITES} from '../public/game/js/elites.js';import {gameSnapshot} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const teams={护阵:['linchong','luzhishen','songjiang'],谋攻:['wuyong','gongsunsheng','huarong'],水军:['lijun','zhangshun','ruanxiaoqi'],突击:['guansheng','lujunyi','yangzhi']},results=[];
for(const [id,m] of Object.entries(ELITES))for(const kind of ['normal','hard'])for(const [name,ids] of Object.entries(teams)){
 let wins=0,totalTime=0;for(let seed=1;seed<=5;seed++){
 let s=newGame(d,new Date(2026,8,14,12).getTime(),seed);s.camp=freshCamp();s.camp.buildings={hall:5,farm:3,lumber:3,barracks:5,clinic:3,market:3};s.camp.mode='army';s.camp.troops=60;s.camp.deployment=60;s.camp.food=10000;s.team=ids;s.battleSkillMode='auto';s.growth={version:1,skills:{},mounts:{}};const level=Math.min(40,m.level+(kind==='hard'?5:0));for(const hero of ids){s.heroes[hero]={status:'owned',level,exp:0,quality:level>=30?2:1};s.growth.mounts[hero]={rank:3,intimacy:80,riding:true};for(const skill of d.by.heroes[hero].skills){const flag=d.by.skills[skill].training.flag;if(flag)s.progress.flags[flag]=true;}}
 s=dispatch(d,s,{type:'eliteStart',id,kind},s.clock);assert.deepEqual(gameSnapshot(s,d),s);const items=JSON.stringify(s.inventory);for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.ok(s.battle.outcome);assert.equal(JSON.stringify(s.inventory),items);try{assert.deepEqual(gameSnapshot(s,d),s);}catch(e){console.log({id,kind,name,seed,outcome:s.battle.outcome,elapsed:s.battle.elapsed,objective:s.battle.depth.objective});throw e;}if(s.battle.outcome==='victory')wins++;totalTime+=s.battle.elapsed;
 }
 results.push({stage:id,kind,team:name,wins,total:5,seconds:Math.round(totalTime/5000)});
}
console.table(results);
for(const id of Object.keys(ELITES))for(const kind of ['normal','hard'])assert.ok(results.filter(r=>r.stage===id&&r.kind===kind&&r.wins>=3).length>=2,id+' '+kind+' needs two viable formations');
assert.ok(results.filter(r=>r.stage==='tide').every(r=>r.seconds>=10),'Tide should actually reach its first objective');
assert.ok(results.some(r=>r.wins<5),'Elite scenarios should expose a formation tradeoff');
console.log('Elite balance PASS: 120 real battles, three objectives, two difficulties, four formations, no automatic medicines, valid in-progress saves and multiple viable teams per mode.');
