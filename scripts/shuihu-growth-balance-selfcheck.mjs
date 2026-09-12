import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {startBattle,advanceBattle} from '../public/game/js/battle.js';
import {validateSave} from '../public/game/js/save.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
const teams={护阵:['luzhishen','wusong','baisheng'],枪弓:['linchong','huarong','songjiang'],谋略:['wuyong','gongsunsheng','ruanxiaoqi'],奇袭:['yanqing','shiqian','liutang'],护送:['yangzhi','chaijin','songjiang']};
const newcomers=data.heroes.filter(h=>h.introducedIn===3);for(let i=0;i<newcomers.length;i+=3)teams['新将'+(i/3+1)]=newcomers.slice(i,i+3).map(h=>h.id);
assert.equal(new Set(Object.values(teams).flat()).size,data.heroes.length);
const results=[];
for(const d of data.dungeons.filter(d=>d.kind!=='scheme'))for(const [name,ids] of Object.entries(teams)){
 let victories=0,totalTime=0;
 for(let seed=1;seed<=8;seed++){
  const s=newGame(data,1789041600000,seed);s.team=ids;s.battleSkillMode='auto';s.growth={version:1,skills:{},mounts:{}};
  const level=Math.max(15,d.level);
  for(const id of ids){s.heroes[id].status='owned';s.heroes[id].level=level;s.growth.mounts[id]={rank:3,intimacy:80,riding:true};}
  for(const id of ids)for(const skillId of data.by.heroes[id].skills){const t=data.by.skills[skillId].training;if(t.flag)s.progress.flags[t.flag]=true;}
  startBattle(s,data,{enemies:d.enemy,scale:d.scale,context:{type:'dungeon',id:d.id}});
  const items=JSON.stringify(s.inventory);while(!s.battle.outcome)advanceBattle(s,data,1000);
  assert.equal(JSON.stringify(s.inventory),items,'Auto battle never consumes medicines');validateSave(s,data);
  if(s.battle.outcome==='victory')victories++;totalTime+=s.battle.elapsed;
 }
 results.push({dungeon:d.id,team:name,wins:victories,total:8,seconds:Math.round(totalTime/8000)});
}
console.table(results);
// At matching recommended levels and rank-3 bonds, multiple roles must be viable.
for(const d of data.dungeons.filter(d=>d.kind!=='scheme'))assert.ok(results.filter(r=>r.dungeon===d.id&&r.wins>=5).length>=3,d.name+' must allow at least three viable formations');
for(const name of ['护阵','枪弓','谋略','奇袭','护送'])assert.ok(results.some(r=>r.team===name&&r.wins>=5),name+' must have a useful matchup');
console.log('Shuihu balance: Seeded battles, all 108 heroes across 37 formations and eight combat dungeons, no automatic items, bounded fight clocks and save validation passed.');
