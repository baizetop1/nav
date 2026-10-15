import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {startBattle,advanceBattle,castSkill,addStatus} from '../public/game/js/battle.js';
const root=new URL('../public/game/data/',import.meta.url);
export const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
export const seeds=[1,31415,87654321];
export function fixture(ids,seed=31415,{dungeon=true,enemies=['bandit_chief','bandit','tiger_king']}={}){
 const s=newGame(data,1792022400000,seed);s.team=ids;
 for(const h of data.heroes){s.heroes[h.id].status='owned';s.heroes[h.id].level=25;}
 for(const skill of data.skills)if(skill.training?.flag)s.progress.flags[skill.training.flag]=true;
 startBattle(s,data,{enemies,context:dungeon?{type:'dungeon',id:'yezhulin'}:{type:'event',id:'road_bandits'}});
 for(const u of [...s.battle.team,...s.battle.enemy]){u.hp=u.maxHp=100000;u.attack=100;u.defense=80;u.strategy=100;u.nextAttackAt=10000;}
 for(const u of s.battle.team){u.rage=100;u.hp=70000;}
 addStatus(s.battle.team.at(-1),{id:'poison',value:20,turns:2},0);
 addStatus(s.battle.enemy[0],{id:'bleeding',value:1,turns:2},0);
 return s;
}
export function advance(s,ms){while(ms>0&&!s.battle.outcome){const dt=Math.min(ms,1000);advanceBattle(s,data,dt);ms-=dt;}return s;}
export function withoutLog(state){const copy=structuredClone(state);if(copy.battle)delete copy.battle.log;return copy;}
export const digest=state=>createHash('sha256').update(JSON.stringify(withoutLog(state))).digest('hex');
export function* cases(){for(const h of data.heroes)for(const skill of h.skills.map(id=>data.by.skills[id]).filter(s=>s.type!=='passive'))for(const seed of seeds)yield {key:h.id+'/'+skill.id+'/'+seed,hero:h,skill,seed};}
export function exercise(row){const s=fixture([row.hero.id,row.hero.id==='baisheng'?'wusong':'baisheng'],row.seed);const from=s.battle.log.length;castSkill(s,data,row.hero.id,row.skill.id);const castLogs=s.battle.log.slice(from);advance(s,12000);return {state:s,castLogs};}
