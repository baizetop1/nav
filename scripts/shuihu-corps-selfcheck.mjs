import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {startBattle,advanceBattle,castSkill} from '../public/game/js/battle.js';
import {freshCamp,attachTroops} from '../public/game/js/camp.js';
import {CORPS,CORPS_PROFILES,corpsQuote,targetQuote} from '../public/game/js/development.js';
import {unitArm,martialFactor} from '../public/game/js/martial.js';
import {attributes} from '../public/game/js/hero.js';
import {EQUIPMENT_SETS} from '../public/game/js/equipment-sets.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {CloudClient} from '../public/game/js/cloud.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const at=Date.parse('2026-09-12T12:00:00+08:00');
function fixture(){const s=newGame(d,at,93472);s.camp=freshCamp();s.camp.buildings={hall:4,farm:3,lumber:3,barracks:4,clinic:2,market:2};s.camp.food=10000;s.camp.troops=40;s.camp.deployment=10;s.player.silver=100000;s.team=['guansheng','huarong','linchong'];for(const h of d.heroes){s.heroes[h.id]={status:'owned',level:30,exp:0,quality:0};for(const id of h.skills){const flag=d.by.skills[id].training?.flag;if(flag)s.progress.flags[flag]=true;}}for(const id of ['iron','cloth','scrap_iron','martial_pages','spirit_essence','immortal_seal'])s.inventory[id]=500;return s;}
const act=(s,type,a={})=>{const n=dispatch(d,s,{type,...a},s.clock);validateSave(n,d);assert.deepEqual(gameSnapshot(n,d),n);return n;};
const begin=s=>act(s,'campRaid',{id:'woods'});
assert.equal(Object.keys(CORPS).length,108);assert.equal(new Set(Object.values(CORPS).map(c=>c.name)).size,108);
for(const h of d.heroes){const c=CORPS[h.id];assert.ok(CORPS_PROFILES[c.profile]);let s=fixture();s.team=[h.id];s=begin(s);assert.equal(s.battle.team[0].corps.id,h.id);assert.equal(s.battle.team[0].corps.troops,10);assert.equal(unitArm(s.battle,s.battle.team[0],d),c.arm);}
let s=begin(fixture());assert.deepEqual(s.battle.team.map(u=>u.corps.troops),[4,3,3]);assert.deepEqual(s.battle.team.map(u=>unitArm(s.battle,u,d)),['cavalry','ranged','infantry']);
assert.ok(martialFactor(s.battle,s.battle.team[0],s.battle.enemy[0],d)>1);assert.ok(martialFactor(s.battle,s.battle.team[1],s.battle.enemy[0],d)<1);
const original=JSON.stringify(s);assert.throws(()=>act(s,'corpsTrain',{id:'guansheng'}),/先结束/);assert.equal(JSON.stringify(s),original);
let few=fixture();few.camp.deployment=1;few=begin(few);assert.deepEqual(few.battle.team.map(u=>u.corps.troops),[1,0,0]);
let solo=fixture();solo.camp.mode='solo';solo=begin(solo);assert.deepEqual(solo.battle.team.map(u=>u.corps.troops),[0,0,0]);
const invalid=structuredClone(s);invalid.battle.team[0].corps.troops++;assert.throws(()=>validateSave(invalid,d),/合计/);
const invalidArm=structuredClone(s);invalidArm.battle.team[0].corps.arm='ranged';assert.throws(()=>validateSave(invalidArm,d),/部队快照/);
// Different global legacy choices cannot override a hero's exclusive corps in new battles.
const a=fixture(),b=fixture();a.camp.arm='infantry';b.camp.arm='cavalry';assert.deepEqual(begin(a).battle.team,begin(b).battle.team);
// Paid, atomic, capped training for every role, with a real combat difference.
let trained=fixture();const cost=corpsQuote(trained,'guansheng').cost;trained=act(trained,'corpsTrain',{id:'guansheng'});assert.equal(trained.player.silver,100000-cost.silver);assert.equal(trained.inventory.scrap_iron,500-cost.items.scrap_iron);trained=act(trained,'corpsTrain',{id:'guansheng'});assert.equal(trained.development.corps.guansheng,3);assert.throws(()=>act(trained,'corpsTrain',{id:'guansheng'}),/精锐/);
const higher=begin(trained);assert.ok(martialFactor(higher.battle,higher.battle.team[0],higher.battle.enemy[0],d)>martialFactor(s.battle,s.battle.team[0],s.battle.enemy[0],d));
let poor=fixture();poor.inventory.scrap_iron=0;const raw=JSON.stringify(poor);assert.throws(()=>act(poor,'corpsTrain',{id:'guansheng'}));assert.equal(JSON.stringify(poor),raw);
let p=act(fixture(),'presetSave',{slot:1});p=act(p,'team',{ids:['wusong']});p=act(p,'campFormation',{mode:'solo',tactic:'guard',deployment:1});p=act(p,'presetSave',{slot:2});p=act(p,'presetLoad',{slot:1});assert.deepEqual(p.team,['guansheng','huarong','linchong']);assert.equal(p.camp.mode,'army');assert.equal(p.camp.deployment,10);p=act(p,'presetLoad',{slot:2});assert.deepEqual(p.team,['wusong']);assert.equal(p.camp.tactic,'guard');assert.throws(()=>act(p,'presetLoad',{slot:3}));
p=act(p,'goalSet',{kind:'corps',id:'wusong'});assert.equal(targetQuote(p,d).cost.items.scrap_iron,5);p=act(p,'goalSet',{kind:'craft',id:'long_spear'});assert.deepEqual(targetQuote(p,d).cost,d.by.equipments.long_spear.recipe);
p=act(p,'scrapSmelt');assert.equal(p.inventory.iron,502);assert.equal(p.inventory.scrap_iron,495);assert.equal(p.development.ledger[0].gained.iron,2);assert.equal(p.development.ledger[0].spent.scrap_iron,5);
const ledger=structuredClone(p.development.ledger);p=act(p,'refresh');assert.deepEqual(p.development.ledger,ledger);assert.deepEqual(importSave(exportSave(p,{id:1,name:'回归'},d),d).state,p);
for(const offset of [1,2,3])p=dispatch(d,p,{type:'goalClear'},at+offset*86400000);assert.equal(p.development.ledger.length,2);assert.equal(p.development.ledger[0].date,'2026-09-14');
// Two/three-piece bonuses only apply when equipped on the same owner, not story guests.
for(const set of EQUIPMENT_SETS){
 const e=fixture(),zero=structuredClone(d);for(const item of Object.values(zero.by.equipments))item.attribute={};e.equipment=[];e.nextEquipment=10;
 const base=attributes(e,'wusong',zero),guest=attributes(e,'wusong',zero,30,false),expected=structuredClone(base);
 e.equipment=set.items.map((item,i)=>({uid:'eq_'+(i+1),item,plus:0,hero:'wusong'}));validateSave(e,d);
 for(const bonus of [set.two,set.three])for(const [k,v] of Object.entries(bonus))expected[k]=Math.round(expected[k]*(1+v));assert.deepEqual(attributes(e,'wusong',zero),expected,'Exact set bonuses independently of item stats');assert.deepEqual(attributes(e,'wusong',zero,30,false),guest);
 e.equipment[1].hero='linchong';e.equipment[2].hero='huarong';assert.deepEqual(attributes(e,'wusong',zero),base,'Pieces across owners do not activate a set');
}
// Actual advanced casts exercise each quality rider and respect the quality snapshot.
for(const role of ['fighter','defender','ranger','strategist','support'])for(const quality of [0,1,2]){
 const h=d.heroes.find(h=>h.type===role),q=fixture();q.team=[h.id];q.heroes[h.id].quality=quality;q.camp.mode='solo';startBattle(q,d,{enemies:['guard','soldier'],scale:10,context:{type:'camp',id:'woods'}});attachTroops(q,0);const u=q.battle.team[0];u.rage=100;u.hp=Math.floor(u.maxHp/2);q.battle.enemy.forEach(e=>e.rage=80);castSkill(q,d,h.id,h.id+'_advanced');validateSave(q,d);assert.equal(q.battle.log.some(l=>l.includes('品变招')),quality>0,role+' quality '+quality);assert.deepEqual(gameSnapshot(q,d),q);
}
// Both old in-flight generations continue and export without acquiring new snapshots.
let old=fixture();startBattle(old,d,{enemies:['guard'],scale:10,context:{type:'camp',id:'woods'}});old.battle.martial=1;delete old.battle.frontierRules;for(const u of old.battle.team)delete u.training.quality;attachTroops(old,10);advanceBattle(old,d,1000);validateSave(old,d);assert.deepEqual(gameSnapshot(old,d),old);assert.ok(old.battle.team.every(u=>!u.corps&&u.training.quality===undefined));
const calls=[],client=new CloudClient('https://save.example.com',d,async(_url,opts)=>{calls.push(opts.method);return Response.json({rotations:1});});await assert.rejects(()=>client.upload(1,1,trained,'练兵'),/0.10.0/);assert.deepEqual(calls,['GET']);
console.log('Corps completion: all 108 distinct units, integer deployment, independent counters, solo/legacy snapshots, paid training, presets, material goals, smelting/ledger, portable roundtrip, all five quality riders and old-backend guard passed.');
