import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {startBattle,advanceBattle,castSkill} from '../public/game/js/battle.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {lineupAdvice,lineupPanel} from '../public/game/js/lineup-ui.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {sortieDialog} from '../public/game/js/sortie-ui.js';
const begin=(ids,terrain='land',enemies=['road_raider'])=>{const s=fixture();s.team=ids;s.battleSkillMode='manual';for(const id of ids)Object.assign(s.heroes[id],{status:'owned',level:30,exp:0});startBattle(s,d,{enemies,context:{type:'dungeon',id:'yezhulin',terrain}});for(const u of [...s.battle.team,...s.battle.enemy])u.nextAttackAt=100000;return s;};
const clone=s=>structuredClone(s),legacy=s=>{const v=clone(s);v.battle.roles={version:1,counts:{},cooldowns:{}};return v;};
function hitCompare(id,prepare,expect){const s=begin([id]);prepare(s);s.battle.team[0].nextAttackAt=1000;const old=legacy(s);advanceBattle(s,d,1000);advanceBattle(old,d,1000);const a=s.battle.metrics.heroes[id].damage,b=old.battle.metrics.heroes[id].damage;assert.equal(a>b,expect,id+' damage trigger');assert.equal(!!s.battle.roles.counts[id],expect);gameSnapshot(s,d);return s;}
for(const state of ['weaken','armor_break','stun'])hitCompare('wuyong',s=>s.battle.enemy[0].statuses=[{id:state,value:.2,expiresAt:4000}],true);
hitCompare('wuyong',()=>{},false);hitCompare('wuyong',s=>s.battle.enemy[0].statuses=[{id:'weaken',value:.2,expiresAt:1000}],false);
hitCompare('huarong',()=>{},true);hitCompare('huarong',s=>s.battle.enemy[0].hp=Math.floor(s.battle.enemy[0].maxHp*.74),false);
hitCompare('wusong',()=>{},true);
let s=begin(['wusong'],'land',['road_raider','soldier']);s.battle.team[0].nextAttackAt=1000;advanceBattle(s,d,1000);assert.equal(s.battle.roles.counts.wusong,undefined);s.battle.enemy[1].hp=0;s.battle.team[0].nextAttackAt=2000;advanceBattle(s,d,1000);assert.equal(s.battle.roles.counts.wusong,1);
// Skill damage is deliberately excluded from all three normal-attack bonuses.
for(const id of ['huarong','wusong','wuyong']){s=begin([id]);s.battle.enemy[0].statuses=[{id:'weaken',value:.2,expiresAt:4000}];s.battle.team[0].rage=100;castSkill(s,d,id,id+'_active');assert.equal(s.battle.roles.counts[id],undefined);}
// Healing rage is capped, requires effective recovery, and retains its cooldown over reload.
s=begin(['songjiang','linchong']);s.battle.team[0].rage=100;s.battle.team[1].hp=100;s.battle.team[1].rage=95;castSkill(s,d,'songjiang','songjiang_active');assert.equal(s.battle.team[1].rage,100);assert.equal(s.battle.roles.counts.songjiang,1);assert.equal(s.battle.roles.cooldowns.songjiang,6000);
const loaded=importSave(exportSave(s,{id:1,name:'振心'},d),d).state;advanceBattle(s,d,1000);advanceBattle(loaded,d,1000);assert.deepEqual(loaded,s);
for(const fullRage of [true,false]){s=begin(['songjiang','linchong']);s.battle.team[0].rage=100;if(fullRage){s.battle.team[1].hp=100;s.battle.team[1].rage=100;}if(fullRage)castSkill(s,d,'songjiang','songjiang_active');else assert.throws(()=>castSkill(s,d,'songjiang','songjiang_active'),/无需恢复/);assert.equal(s.battle.roles.counts.songjiang,undefined);}

// The five-second skill cooldown does not bypass the six-second role cooldown.
s=begin(['songjiang','linchong']);s.battle.enemy[0].boss.readyAt=100000;
for(const time of [0,5000,10000]){while(s.battle.elapsed<time)advanceBattle(s,d,1000);s.battle.team[0].rage=100;s.battle.team[1].rage=0;s.battle.team[1].hp=100;castSkill(s,d,'songjiang','songjiang_active');assert.equal(s.battle.roles.counts.songjiang,time===10000?2:1);}

// Emergency protection does not reduce the triggering strike; only subsequent direct hits.
s=begin(['luzhishen']);let u=s.battle.team[0],enemy=s.battle.enemy[0];u.defense=0;u.hp=Math.floor(u.maxHp*.4)+1;enemy.attack=100;enemy.nextAttackAt=1000;const plain=legacy(s);advanceBattle(s,d,1000);advanceBattle(plain,d,1000);assert.equal(s.battle.team[0].hp,plain.battle.team[0].hp);assert.equal(s.battle.roles.counts.luzhishen,1);assert.equal(s.battle.team[0].statuses.find(x=>x.id==='guard').value,.18);s.battle.enemy[0].nextAttackAt=2000;plain.battle.enemy[0].nextAttackAt=2000;advanceBattle(s,d,1000);advanceBattle(plain,d,1000);assert.ok(s.battle.team[0].hp>plain.battle.team[0].hp);assert.equal(s.battle.roles.counts.luzhishen,1);
const resume=importSave(exportSave(s,{id:1,name:'危阵'},d),d).state;for(let i=0;i<8;i++){advanceBattle(s,d,1000);advanceBattle(resume,d,1000);}assert.deepEqual(s,resume);assert.equal(s.battle.roles.counts.luzhishen,1);
s=begin(['luzhishen']);s.battle.team[0].hp=1;s.battle.enemy[0].nextAttackAt=1000;advanceBattle(s,d,1000);assert.equal(s.battle.team[0].hp,0);assert.equal(s.battle.roles.counts.luzhishen,undefined);
s=begin(['luzhishen']);s.battle.team[0].hp=100;s.battle.team[0].statuses=[{id:'poison',value:1,expiresAt:4000,nextTickAt:2000}];advanceBattle(s,d,1000);advanceBattle(s,d,1000);assert.equal(s.battle.roles.counts.luzhishen,undefined);
// Water protection merges with stronger first-position protection, and never grants it on land.
s=begin(['linchong','ruanxiaoqi','wuyong'],'water');assert.equal(s.battle.team[0].statuses[0].value,.12);assert.equal(s.battle.team[1].statuses[0].value,.10);assert.equal(s.battle.team[2].statuses[0].value,.10);assert.equal(s.battle.roles.counts.ruanxiaoqi,1);assert.deepEqual(importSave(exportSave(s,{id:1,name:'水阵'},d),d).state,s);assert.equal(begin(['ruanxiaoqi']).battle.roles.counts.ruanxiaoqi,undefined);
const retired=fixture();retired.team=['ruanxiaoqi','linchong'];retired.realm.trek={hp:{ruanxiaoqi:0,linchong:10000}};startBattle(retired,d,{enemies:['bandit'],context:{type:'realm',kind:'trek',id:'journey_water',terrain:'water'}});assert.equal(retired.battle.roles.counts.ruanxiaoqi,undefined);
const guest=fixture();startBattle(guest,d,{enemies:['bandit'],guest:{id:'ruanxiaoqi',level:8},context:{type:'story',id:'wusong_story',terrain:'water'}});assert.equal(guest.battle.roles,undefined);
// Old battle rules stay old after load, and invalid old-version new-role counts are rejected.
s=begin(['huarong']);s=legacy(s);const before=importSave(exportSave(s,{id:1,name:'旧战'},d),d).state;before.battle.team[0].nextAttackAt=1000;advanceBattle(before,d,1000);assert.equal(before.battle.roles.counts.huarong,undefined);
for(const modify of [x=>x.battle.roles.counts.huarong=1,x=>x.battle.roles.version=4,x=>x.battle.roles.cooldowns.songjiang=5000]){const bad=clone(s);modify(bad);assert.throws(()=>gameSnapshot(bad,d));}
// Forecasts are pure, reflect quoted teams, and never recommend locked skills as available.
s=begin(['wuyong','linchong','ruanxiaoqi']);for(const u of s.battle.team)u.skills=[];const raw=JSON.stringify(s);assert.match(lineupAdvice(s.battle,d).join(' '),/林冲在首位才有开场护阵.*陆地.*吴用需同伴/);assert.equal(JSON.stringify(s),raw);
s=fixture();for(const id of ['huarong','wusong'])Object.assign(s.heroes[id],{status:'owned',level:30,exp:0});const original=JSON.stringify(s),action={type:'campRaid',id:'woods'},q=prepareSortie(s,d,action,{team:['huarong','wusong'],mode:'solo',tactic:'guard',deployment:20});assert.equal(q.reason,'');assert.match(lineupPanel(q.battle,d,x=>x),/先手与收尾/);assert.doesNotMatch(lineupPanel(q.battle,d,x=>x),/时迁/);assert.equal(JSON.stringify(s),original);const html=sortieDialog(s,d,action,{team:['huarong','wusong'],mode:'solo',tactic:'guard',deployment:20},q,x=>x,()=>'<button>测试</button>');assert.match(html,/data-dialog-tab="lineup"/);assert.match(html,/先声夺阵/);
// A real completed fight keeps the expanded role version and counters in its report.
s=begin(['huarong']);s.battle.team[0].nextAttackAt=1000;for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');s=act(s,'finishBattle');assert.equal(s.lastBattle.roleReport.version,3);assert.ok(s.lastBattle.roleReport.counts.huarong>0);assert.deepEqual(importSave(exportSave(s,{id:1,name:'战报'},d),d).state,s);
console.log('Lineup PASS: six actual hero mechanics, condition failures, damage boundaries, no lethal rescue, cap/cooldown/reload, old/guest isolation, preview purity and completed report.');
