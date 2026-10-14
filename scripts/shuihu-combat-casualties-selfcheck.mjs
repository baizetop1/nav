import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collections,prepareData} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {staminaCap} from '../public/game/js/logistics.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {losses} from '../public/game/js/fieldcraft-ui.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {squadQuote,reservedTroops} from '../public/game/js/squads.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {hasCombatCasualties,casualtyProgressPreserved} from '../public/game/js/casualty-save.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const at=Date.parse('2026-10-14T12:00:00+08:00');
const act=(s,type,extra={},now=s.clock)=>gameSnapshot(dispatch(d,s,{type,...extra},now),d);
const roundtrip=s=>importSave(exportSave(s,{id:1,name:'接敌兵损'},d),d).state;
function fixture({seed=9,level=30,deployment=100,tactic='balanced',team=['linchong','luzhishen','songjiang']}={}){
 const s=newGame(d,at,seed);s.camp=freshCamp();Object.assign(s.camp,{buildings:{hall:4,barracks:5,clinic:3,farm:3,lumber:3,market:3},food:50000,wood:10000,troops:1000,mode:'army',deployment,tactic});s.player.silver=50000;s.player.stamina=140;s.team=team;s.battleSkillMode='auto';for(const id of team)s.heroes[id]={status:'owned',level,exp:0};s.player.stamina=Math.min(s.player.stamina,staminaCap(s));return s;
}
function resolved(s){for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);assert.ok(s.battle.outcome,'real simulation must end');return s;}
const total=s=>s.camp.troops+s.camp.wounded+(s.camp.fallen||0)+reservedTroops(s);
const ledger=[];
// All losses below come from actual entry and real timed combat, including clean victories.
for(const tactic of ['guard','balanced','assault'])for(const seed of [1,9,27,81]){
 let s=fixture({seed,tactic}),raw=JSON.stringify(s);const preview=prepareSortie(s,d,{type:'campRaid',id:'woods'});assert.equal(preview.reason,'');assert.equal(JSON.stringify(s),raw);
 s=act(s,'campRaid',{id:'woods'});assert.equal(s.battle.expedition.casualtyRules,2);assert.equal(s.battle.team.reduce((n,u)=>n+u.corps.troops,0),100);
 s=resolved(roundtrip(s));assert.equal(s.battle.outcome,'victory');assert.ok(s.battle.team.every(u=>u.hp===u.maxHp),'clean victory fixture');const q=losses(s.battle);assert.ok(q.loss>0,'troops must take contact losses even when heroes are unharmed');
 s=act(roundtrip(s),'finishBattle');assert.equal(s.camp.casualtyRules,2);assert.equal(s.lastBattle.wounded,q.wounded);assert.equal(s.lastBattle.fallen,q.fallen);assert.equal(s.camp.troops,1000-q.loss);assert.equal(total(s),1000);assert.deepEqual(roundtrip(s),s);
 const rawDone=JSON.stringify(s);assert.throws(()=>act(s,'finishBattle'));assert.equal(JSON.stringify(s),rawDone);
 ledger.push({tactic,seed,returned:q.returned,wounded:q.wounded,fallen:q.fallen});
 if(tactic==='balanced')assert.ok(q.fallen>=1,'100-man contact creates an immediate visible casualty');
}
for(const seed of [1,9,27,81]){const rows=ledger.filter(r=>r.seed===seed);assert.ok(rows[0].wounded+rows[0].fallen<rows[1].wounded+rows[1].fallen);assert.ok(rows[1].wounded+rows[1].fallen<rows[2].wounded+rows[2].fallen);}
// A prolonged encounter produces more losses; a genuinely underprepared party suffers a real defeat.
let long=resolved(act(fixture({team:['baisheng'],level:1}),'campRaid',{id:'fort'})),longQ=losses(long.battle);assert.ok(long.battle.elapsed>15000);assert.ok(longQ.loss>ledger.find(r=>r.tactic==='balanced').wounded+ledger.find(r=>r.tactic==='balanced').fallen);long=act(long,'finishBattle');assert.equal(total(long),1000);
let weak=act(fixture({team:['baisheng'],level:1}),'realmOpen');weak=resolved(act(weak,'challengeStart',{id:'mortal',tier:1}));assert.equal(weak.battle.outcome,'defeat');const defeated=losses(weak.battle);assert.ok(defeated.loss>=50&&defeated.fallen>=20);weak=act(weak,'finishBattle');assert.equal(total(weak),1000);assert.equal(weak.heroes.baisheng.status,'owned','heroes do not die permanently');
// Withdrawing before contact saves troops; withdrawing during real fighting pays its actual forecast.
let immediate=act(fixture(),'campRaid',{id:'fort'});immediate=act(act(immediate,'battleRetreat'),'finishBattle');assert.equal(immediate.lastBattle.fallen,0);assert.equal(immediate.lastBattle.wounded,0);assert.equal(total(immediate),1000);
let retreat=act(fixture({team:['baisheng'],level:1}),'campRaid',{id:'fort'});for(let i=0;i<5;i++)advanceBattle(retreat,d,1000);assert.equal(retreat.battle.outcome,null);const retreatQ=losses(retreat.battle,{outcome:'retreat'});assert.ok(retreatQ.loss>0);retreat=act(act(retreat,'battleRetreat'),'finishBattle');assert.equal(retreat.lastBattle.fallen,retreatQ.fallen);assert.equal(retreat.lastBattle.wounded,retreatQ.wounded);assert.equal(total(retreat),1000);
// Treatment returns only the wounded. Filling fatalities costs precisely the missing food and silver.
let healed=long;const dead=healed.camp.fallen;while(healed.camp.wounded)healed=act(healed,'campHeal');assert.equal(healed.camp.troops,1000-dead);assert.equal(healed.camp.fallen,dead);const silver=healed.player.silver,food=healed.camp.food;healed=act(healed,'campRecruit',{amount:100});assert.equal(healed.camp.troops,1000);assert.equal(healed.camp.fallen,dead);assert.equal(healed.player.silver,silver-dead*3);assert.equal(healed.camp.food,food-dead*2);
// Previous active battles keep their recorded rule 1 and their exact carry instead of being rebalanced mid-fight.
let legacy=act(fixture(),'campRaid',{id:'woods'});legacy.battle.expedition.casualtyRules=1;legacy=resolved(roundtrip(legacy));const oldQ=losses(legacy.battle);legacy=act(legacy,'finishBattle');assert.equal(legacy.lastBattle.fallen,oldQ.fallen);assert.equal(legacy.lastBattle.wounded,oldQ.wounded);assert.equal(legacy.camp.casualtyRules,undefined);assert.equal(act(legacy,'campRaid',{id:'woods'}).battle.expedition.casualtyRules,2);
// Hero-only dungeons and safe offline production never kill or drain troops at the camp.
let solo=fixture();solo.camp.casualtyCarry=8000;solo=act(resolved(act(solo,'rotationStart',{kind:'daily',id:'silver',tier:1})),'finishBattle');assert.equal(solo.camp.troops,1000);assert.equal(solo.camp.wounded,0);assert.equal(solo.camp.fallen||0,0);assert.equal(solo.camp.casualtyCarry,8000);const stocks={troops:solo.camp.troops,wounded:solo.camp.wounded,fallen:solo.camp.fallen||0};solo=act(solo,'refresh',{},solo.clock+8*3600000);assert.deepEqual({troops:solo.camp.troops,wounded:solo.camp.wounded,fallen:solo.camp.fallen||0},stocks);
// Only an explicitly sent military squad risks its own reserved men, never the unassigned main force.
let squad=act(fixture({team:['songjiang']}),'realmOpen');squad.heroes.linchong={status:'owned',level:30,exp:0};squad.camp.casualtyCarry=9000;const squadAction={id:'escort',team:['linchong'],troops:100},before=JSON.stringify(squad),sq=squadQuote(squad,d,squadAction);assert.equal(sq.reason,'');assert.equal(JSON.stringify(squad),before);assert.ok(sq.mission.wounded+sq.mission.fallen>0);squad=act(squad,'squadSend',squadAction);assert.equal(squad.camp.troops,900);assert.equal(squad.camp.casualtyCarry,sq.nextCarry);assert.equal(total(squad),1000);assert.throws(()=>act(squad,'squadRecall'));assert.throws(()=>act(squad,'squadCollect'));const fixedMission=structuredClone(squad.realm.squad);squad=act(resolved(act(squad,'campRaid',{id:'woods'})),'finishBattle');assert.deepEqual(squad.realm.squad,fixedMission,'main combat cannot replace a squad outcome');const mainStock={troops:squad.camp.troops,wounded:squad.camp.wounded,fallen:squad.camp.fallen||0,carry:squad.camp.casualtyCarry};squad=act(squad,'refresh',{},sq.mission.readyAt);assert.equal(squad.camp.troops,mainStock.troops);assert.equal(squad.camp.fallen||0,mainStock.fallen);squad=act(squad,'squadCollect');assert.equal(squad.camp.fallen,mainStock.fallen+sq.mission.fallen);assert.equal(squad.camp.wounded,mainStock.wounded+sq.mission.wounded);assert.equal(squad.camp.troops,mainStock.troops+sq.mission.troops-sq.mission.wounded-sq.mission.fallen);assert.equal(squad.camp.casualtyCarry,mainStock.carry);assert.equal(total(squad),1000);const collected=JSON.stringify(squad);assert.throws(()=>act(squad,'squadCollect'));assert.equal(JSON.stringify(squad),collected);
assert.ok(hasCombatCasualties(healed));assert.equal(casualtyProgressPreserved(healed,{...healed,camp:{...healed.camp,fallen:0}}),false);const erased=structuredClone(healed);delete erased.camp.casualtyRules;assert.equal(casualtyProgressPreserved(healed,erased),false);const live=act(healed,'campRaid',{id:'woods'}),lostPermanent=structuredClone(live),downgraded=structuredClone(live);delete lostPermanent.camp.casualtyRules;downgraded.battle.expedition.casualtyRules=1;assert.equal(casualtyProgressPreserved(live,lostPermanent),false);assert.equal(casualtyProgressPreserved(live,downgraded),false);
console.table(ledger);console.log('Combat casualties PASS: 12 real clean wins, tactics/attrition, prolonged fight, natural defeat, pre-contact and mid-contact retreat, exact heal/recruit ledger, old active rule 1, no-troop/offline safety, squad carry/own losses, serialization and cloud preservation.');
