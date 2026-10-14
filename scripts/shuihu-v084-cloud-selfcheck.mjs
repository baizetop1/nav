// Actual Worker + original schema in memory only; no production D1 or network calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {skillUpgradeQuote} from '../public/game/js/growth.js';
import {promotionQuote} from '../public/game/js/quality.js';
import {hasHeroAptitudes} from '../public/game/js/gameplay-rules.js';
import {hasCombatCasualties} from '../public/game/js/casualty-save.js';
import {squadQuote} from '../public/game/js/squads.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))])));
const now=Date.parse('2026-10-14T04:00:00Z'),act=(s,type,extra={})=>{const next=dispatch(d,s,{type,...extra},s.clock);assert.deepEqual(gameSnapshot(next,d),next);return next;};
// Prepared currency and inventories isolate accounting, not the normal opening flow.
function fixture(){const s=newGame(d,now,9);s.camp=freshCamp();Object.assign(s.camp,{buildings:{hall:4,barracks:5,clinic:3,farm:3,lumber:3,market:3},food:50000,wood:10000,troops:1000,mode:'army',deployment:100,tactic:'balanced'});s.player.silver=50000;s.player.stamina=100;s.team=['linchong','luzhishen','songjiang'];s.battleSkillMode='auto';s.growth={version:1,skills:{},mounts:{}};for(const id of [...s.team,'chaijin','tanglong','wangjin'])s.heroes[id]={status:'owned',level:30,exp:0};s.heroes.baisheng={status:'owned',level:1,exp:0};s.inventory.tanglong_manual=2;s.inventory.exp_pill=10;return s;}
function resolve(s){for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.ok(s.battle.outcome,'timed combat naturally finishes');assert.deepEqual(gameSnapshot(s,d),s);return s;}
const portable=s=>{const after=importSave(exportSave(s,{id:1,name:'资质与战争兵损'},d),d).state;assert.deepEqual(after,s);return after;};
const base=fixture(),skillCost=skillUpgradeQuote(base,d.by.skills.tanglong_active);assert.equal(skillCost.cost.silver,120);
const trained=act(base,'skillUpgrade',{id:'tanglong_active'});assert.equal(trained.player.silver,base.player.silver-120);assert.equal(trained.inventory.tanglong_manual,base.inventory.tanglong_manual-1);assert.equal(trained.inventory.exp_pill,base.inventory.exp_pill-1);assert.ok(hasHeroAptitudes(trained));assert.equal(hasHeroAptitudes(base),false);
const supplied=structuredClone(trained),promotion=promotionQuote(supplied,'chaijin');assert.equal(promotion.cost.silver,1080);assert.equal(promotion.core.required,3);for(const [id,n]of Object.entries(promotion.cost.items))supplied.inventory[id]=n;
const promoted=act(supplied,'heroPromote',{id:'chaijin'});assert.equal(promoted.player.silver,supplied.player.silver-1080);assert.equal(promoted.heroes.chaijin.quality,1);for(const id of Object.keys(promotion.cost.items))assert.equal(promoted.inventory[id],0);assert.ok(hasHeroAptitudes(promoted));
const started=act(promoted,'campRaid',{id:'woods'});assert.equal(started.battle.expedition.troops,100);assert.equal(started.battle.expedition.casualtyRules,2);
const live=structuredClone(started);advanceBattle(live,d,100);assert.equal(live.battle.outcome,null);assert.ok(live.battle.elapsed>0);
const victorious=resolve(structuredClone(live));assert.equal(victorious.battle.outcome,'victory');const won=act(victorious,'finishBattle');assert.equal(won.camp.casualtyRules,2);assert.ok(won.camp.fallen>=1);assert.ok(won.camp.wounded>0);assert.equal(won.camp.troops+won.camp.wounded+won.camp.fallen,1000);
const weakTeam=act(won,'team',{ids:['baisheng']}),weakStart=act(weakTeam,'campRaid',{id:'fort'}),underFire=structuredClone(weakStart);for(let i=0;i<5;i++)advanceBattle(underFire,d,1000);
assert.equal(underFire.battle.outcome,null);assert.ok(underFire.battle.metrics.heroes.baisheng.taken>0,'damage must come from actual enemies');assert.ok(underFire.battle.team[0].hp<underFire.battle.team[0].maxHp);
const retreated=act(underFire,'battleRetreat'),settled=act(retreated,'finishBattle');assert.equal(settled.lastBattle.outcome,'retreat');assert.ok(settled.lastBattle.fallen>0);assert.ok(settled.lastBattle.wounded>0);assert.equal(settled.camp.fallen,won.camp.fallen+settled.lastBattle.fallen);assert.equal(settled.camp.wounded,won.camp.wounded+settled.lastBattle.wounded);assert.equal(settled.camp.troops+settled.camp.wounded+settled.camp.fallen,1000);
const solo=act(act(settled,'team',{ids:['linchong','luzhishen','songjiang']}),'campFormation',{mode:'solo',tactic:'balanced',deployment:100,arm:'infantry'}),soloStart=act(solo,'rotationStart',{kind:'daily',id:'silver',tier:1});assert.equal(soloStart.battle.expedition?.troops||0,0);assert.equal(soloStart.battle.expedition?.casualtyRules,undefined);const soloDone=act(resolve(structuredClone(soloStart)),'finishBattle');for(const key of ['troops','wounded','fallen','casualtyCarry','casualtyRules'])assert.equal(soloDone.camp[key],settled.camp[key],'solo must preserve '+key);
// A previous-version army can send a hero-only second squad before any new formal battle.
// Its simulated outcome uses aptitude, so the real dispatch must record that use as well.
const squadReady=act(act(base,'realmOpen'),'team',{ids:['baisheng']}),squadCommand={id:'escort',team:['linchong'],troops:0};
assert.equal(hasHeroAptitudes(squadReady),false);assert.equal(hasCombatCasualties(squadReady),false);
const rawSquadReady=JSON.stringify(squadReady),squadPreview=squadQuote(squadReady,d,squadCommand);assert.equal(squadPreview.reason,'');assert.equal(JSON.stringify(squadReady),rawSquadReady,'squad preview is read-only');assert.equal(hasHeroAptitudes(squadReady),false);
const zeroSquad=act(squadReady,'squadSend',squadCommand);assert.ok(hasHeroAptitudes(zeroSquad),'real zero-troop dispatch retains the aptitude capability marker');assert.equal(hasCombatCasualties(zeroSquad),false);assert.equal(zeroSquad.realm.squad.troops,0);assert.equal(zeroSquad.realm.squad.outcome,'victory');assert.equal(zeroSquad.camp.troops,squadReady.camp.troops);assert.equal(zeroSquad.camp.wounded,squadReady.camp.wounded);assert.equal(zeroSquad.camp.fallen||0,squadReady.camp.fallen||0);
const returnedClock=dispatch(d,zeroSquad,{type:'refresh'},zeroSquad.realm.squad.readyAt),zeroSquadDone=act(returnedClock,'squadCollect');assert.ok(hasHeroAptitudes(zeroSquadDone));assert.equal(zeroSquadDone.realm.squad,null);assert.equal(zeroSquadDone.camp.troops,squadReady.camp.troops);assert.equal(hasCombatCasualties(zeroSquadDone),false);
const externalSquad=act(squadReady,'squadSend',{id:'escort',team:['wangjin'],troops:0});assert.equal(hasHeroAptitudes(externalSquad),false,'external-only squads do not claim the aptitude feature');
assert.throws(()=>act(squadReady,'squadSend',{...squadCommand,team:['baisheng']}));assert.equal(JSON.stringify(squadReady),rawSquadReady,'rejected dispatch leaves the aptitude marker and all resources unchanged');
for(const s of [base,trained,supplied,promoted,started,live,victorious,won,weakTeam,weakStart,underFire,retreated,settled,solo,soloStart,soloDone,squadReady,zeroSquad,zeroSquadDone,externalSquad])portable(s);
const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'v084-local-test-pepper-at-least-thirty-two-characters',ADMIN_KEY:admin};
 const req=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await req('/v1/game-version','GET',admin)).json();assert.equal(caps.heroAptitudes,1);assert.equal(caps.casualtyRules,1,'keep the old capability for existing clients');assert.equal(caps.combatCasualties,2);
 const key=(await(await req('/v1/admin/slots/1/key','POST',admin,{})).json()).key;let rev=1,uploads=0,rejections=0,rollbacks=0;
 const stored=id=>({slot:db.prepare('SELECT * FROM slots WHERE id=?').get(id),history:db.prepare('SELECT * FROM history WHERE slot=? ORDER BY revision').all(id)});
 const download=async()=>{const res=await req('/v1/slots/1','GET',key);assert.equal(res.status,200);return (await res.json()).state;};
 const upload=async(s,status=200)=>{const before=stored(1),res=await req('/v1/slots/1','PUT',key,{name:'资质与战争兵损',state:s},rev),body=await res.text();assert.equal(res.status,status,body);if(status===200){rev++;uploads++;assert.deepEqual(await download(),gameSnapshot(s,d));return rev;}rejections++;assert.deepEqual(stored(1),before,'rejected PUT must not change raw/name/revision/history');};
 const rollback=async(old,expected)=>{const res=await req('/v1/slots/1/rollback','POST',key,{revision:old},rev);assert.equal(res.status,200,await res.text());rev++;rollbacks++;assert.deepEqual(await download(),gameSnapshot(expected,d));};
 const baseRevision=await upload(base);await upload(squadReady);
 // The actual new CloudClient accepts the isolated zero-troop squad and the Worker returns it intact.
 const squadCalls=[],squadClient=new CloudClient('https://test.invalid',d,async(url,options)=>{squadCalls.push(options.method);db.exec('DELETE FROM rate_limits');return worker.fetch(new Request(url,options),env);});squadClient.setKey(1,key);await squadClient.upload(1,rev,zeroSquad,'零兵分队资质');rev++;uploads++;assert.deepEqual(squadCalls,['GET','PUT']);assert.deepEqual(await download(),gameSnapshot(zeroSquad,d));
 const erasedSquadAptitude=structuredClone(zeroSquad);delete erasedSquadAptitude.progress.flags.hero_aptitude_v1;await upload(erasedSquadAptitude,409);await upload(zeroSquadDone);await rollback(baseRevision,base);await upload(trained);
 const droppedAptitude=structuredClone(trained);delete droppedAptitude.progress.flags.hero_aptitude_v1;await upload(droppedAptitude,409);
 // Explicit history rollback may remove a marker; an ordinary upload cannot.
 await rollback(baseRevision,base);assert.equal(hasHeroAptitudes(await download()),false);await upload(trained);await upload(supplied);const promotedRevision=await upload(promoted);await upload(started);await upload(live);
 const oldActive=structuredClone(live);oldActive.battle.expedition.casualtyRules=1;await upload(oldActive,409);
 const erasedActive=structuredClone(live);delete erasedActive.battle.expedition.casualtyRules;delete erasedActive.battle.expedition.casualtyCarry;await upload(erasedActive,409);
 await upload(victorious);await upload(won);
 const droppedCamp=structuredClone(won);delete droppedCamp.camp.casualtyRules;await upload(droppedCamp,409);
 const lowerDeaths=structuredClone(won);lowerDeaths.camp.fallen--;await upload(lowerDeaths,409);
 await rollback(promotedRevision,promoted);assert.equal(hasCombatCasualties(await download()),false);await upload(won);await upload(weakTeam);await upload(weakStart);await upload(underFire);
 const downgraded=structuredClone(underFire);downgraded.battle.expedition.casualtyRules=1;await upload(downgraded,409);
 const dropFlag=structuredClone(underFire);delete dropFlag.progress.flags.hero_aptitude_v1;await upload(dropFlag,409);
 await upload(retreated);
 // A client may finish locally and start a solo resource fight before its next upload.
 // The completed-battle counter distinguishes that legitimate transition from rule loss.
 await upload(soloStart);await upload(soloDone);
 const fewerFallen=structuredClone(soloDone);fewerFallen.camp.fallen--;await upload(fewerFallen,409);
 const missingCarry=structuredClone(soloDone);delete missingCarry.camp.casualtyCarry;await upload(missingCarry,409);
 // Invalid values on an empty slot are validation errors, distinct from stale progress.
 const malformedKey=(await(await req('/v1/admin/slots/3/key','POST',admin,{})).json()).key;
 const rejectFresh=async(s)=>{const before=stored(3),res=await req('/v1/slots/3','PUT',malformedKey,{name:'非法值',state:s},1);assert.equal(res.status,400,await res.text());assert.deepEqual(stored(3),before);};
 for(const mutate of [s=>s.progress.flags.hero_aptitude_v1=1,s=>s.camp.casualtyRules=1,s=>s.camp.casualtyRules=3,s=>s.camp.casualtyCarry=10000,s=>s.camp.fallen=-1]){const malformed=structuredClone(soloDone);mutate(malformed);await rejectFresh(malformed);}
 const malformedLive=structuredClone(underFire);malformedLive.battle.expedition.casualtyRules=3;await rejectFresh(malformedLive);
 // Simulate an actual pre-0.84 saved rule-1 fight without any new markers.
 let legacy=fixture();legacy.team=['wangjin'];legacy.heroes.wangjin.level=1;legacy=act(legacy,'campRaid',{id:'fort'});legacy.battle.expedition.casualtyRules=1;assert.equal(hasHeroAptitudes(legacy),false);assert.equal(hasCombatCasualties(legacy),false);portable(legacy);
 const legacyKey=(await(await req('/v1/admin/slots/2/key','POST',admin,{})).json()).key,res=await req('/v1/slots/2','PUT',legacyKey,{name:'旧规则1战局',state:legacy},1);assert.equal(res.status,200,await res.text());assert.deepEqual((await(await req('/v1/slots/2','GET',legacyKey)).json()).state,gameSnapshot(legacy,d));
 let puts=0;for(const [feature,state,message]of [['heroAptitudes',trained,/资质/],['heroAptitudes',zeroSquad,/资质/],['combatCasualties',underFire,/战争兵损/]]){
  const oldCaps={...caps};delete oldCaps[feature];const calls=[],client=new CloudClient('https://test.invalid',d,async(_,o)=>{calls.push(o.method);if(o.method==='PUT')puts++;return Response.json(oldCaps);});await assert.rejects(()=>client.upload(1,1,state,'旧服务'),message);assert.deepEqual(calls,['GET']);
 }assert.equal(puts,0,'missing capability cannot send even one PUT');
 const legacyCaps={...caps};delete legacyCaps.heroAptitudes;delete legacyCaps.combatCasualties;assert.equal(legacyCaps.casualtyRules,1);const oldCalls=[],oldClient=new CloudClient('https://test.invalid',d,async(_,o)=>{oldCalls.push(o.method);return Response.json(legacyCaps);});await oldClient.upload(2,1,legacy,'旧规则兼容');assert.deepEqual(oldCalls,['GET','PUT']);
 // A normal new client can also carry the final combined state through the actual Worker.
 const clientCalls=[],client=new CloudClient('https://test.invalid',d,async(url,options)=>{clientCalls.push(options.method);db.exec('DELETE FROM rate_limits');return worker.fetch(new Request(url,options),env);});client.setKey(1,key);await client.upload(1,rev,soloDone,'客户端正式接续');rev++;assert.deepEqual(clientCalls,['GET','PUT']);assert.deepEqual(await download(),gameSnapshot(soloDone,d));
 assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),['cooperative_attempts','cooperative_claims','history','rate_limits','slots','verified_scores'],'original schema is sufficient');
 console.log('v0.84 cloud PASS: actual Worker/original in-memory SQLite; '+uploads+' upload/download stages, '+rejections+' atomic 409 protections, 6 malformed 400 cases, '+rollbacks+' explicit history rollbacks; real 120-silver skill/1080-silver promotion, army100 victory/contact damage/retreat casualties, legitimate completed-to-solo transition, portable/file preservation, skill/zero-troop-squad missing-aptitude and war missing-capability zero-PUT guards, actual zero-troop squad client roundtrip/marker protection, old rule1 capability1 compatibility and real new CloudClient.');
 console.log('Real casualty ledger: clean win '+won.lastBattle.fallen+' fallen/'+won.lastBattle.wounded+' wounded; after-fire retreat '+settled.lastBattle.fallen+' fallen/'+settled.lastBattle.wounded+' wounded; cumulative '+settled.camp.fallen+' fallen/'+settled.camp.wounded+' wounded; natural taken '+underFire.battle.metrics.heroes.baisheng.taken+'.');
}finally{db.close();}
