import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {attributes,ownHero} from '../public/game/js/hero.js';
import {qualityOf,promotionQuote} from '../public/game/js/quality.js';
import {parseSave,validateSave} from '../public/game/js/save.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {rosterSelection} from '../public/game/js/roster-ui.js';
import {awardMountContracts} from '../public/game/js/growth.js';
import {startBattle,advanceBattle} from '../public/game/js/battle.js';
import {gains} from '../public/game/js/rewards-ui.js';
const dir=new URL('../public/game/data/',import.meta.url),data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',dir),'utf8'))])));
const act=(s,type,extra={})=>{const next=dispatch(data,s,{type,...extra},s.clock);validateSave(next,data);return next;};
let s=newGame(data,1789041600000,812738);s.camp=freshCamp();s.camp.buildings.hall=4;s.camp.mode='solo';s.player.silver=50000;s.inventory.spirit_essence=100;s.inventory.immortal_seal=20;s.inventory.martial_pages=100;
assert.equal(data.heroes.length,108);assert.equal(data.heroes.filter(h=>h.group==='tiangang').length,36);assert.equal(data.heroes.filter(h=>h.group==='disha').length,72);
assert.equal(data.heroes.at(-1).name,'段景住');assert.equal(data.heroes[1].name,'卢俊义');assert.equal(new Set(data.heroes.map(h=>h.name)).size,108);assert.ok(!data.by.heroes.chaogai);
assert.equal(rosterSelection(s,data,{query:'张青'}).all[0].id,'zhangqing_gardener');assert.equal(rosterSelection(s,data,{query:'张清'}).all[0].id,'zhangqing');
assert.equal(rosterSelection(s,data,{group:'tiangang'}).all.length,36);assert.equal(rosterSelection(s,data,{quality:'1'}).all.length,0);
const pages=Array.from({length:9},(_,page)=>rosterSelection(s,data,{page}).visible.map(h=>h.id)).flat();assert.equal(new Set(pages).size,108);
assert.equal(rosterSelection(s,data,{query:'no match',page:100}).page,0);
ownHero(s,'guansheng',data);s.heroes.guansheng.level=30;s.heroes.guansheng.exp=7;s.team=['guansheng'];s.equipment[0].hero='guansheng';s.growth={version:1,skills:{guansheng_active:2},mounts:{guansheng:{rank:3,intimacy:80,riding:true}}};
const base=attributes(s,'guansheng',data),before=structuredClone(s);s=act(s,'heroPromote',{id:'guansheng'});
assert.deepEqual(before.heroes.guansheng,{status:'owned',level:30,exp:7});assert.equal(s.heroes.guansheng.quality,1);assert.equal(s.inventory.spirit_essence,94);assert.equal(s.player.silver,before.player.silver-1200);
for(const k of Object.keys(base))assert.equal(attributes(s,'guansheng',data)[k],Math.round(base[k]*(k==='speed'?1.05:1.2)));
assert.deepEqual(s.growth,before.growth);assert.deepEqual(s.equipment,before.equipment);assert.equal(s.heroes.guansheng.exp,7);assert.ok(gains(before,s,data).some(r=>r.name.includes('升至灵品')));
const spirit=structuredClone(s);s=act(s,'heroPromote',{id:'guansheng'});assert.equal(s.heroes.guansheng.quality,2);assert.equal(s.inventory.spirit_essence,76);assert.equal(s.inventory.immortal_seal,14);
for(const k of Object.keys(base))assert.equal(attributes(s,'guansheng',data)[k],Math.round(base[k]*(k==='speed'?1.1:1.5)));
assert.throws(()=>act(s,'heroPromote',{id:'guansheng'}),/仙品/);assert.equal(qualityOf(s.heroes.baisheng),0);
assert.equal(attributes(s,'guansheng',data,30,false).attack,attributes(before,'guansheng',data,30,false).attack,'Guest stats never borrow permanent promotion');
for(const mutate of [x=>x.heroes.guansheng.level=14,x=>x.camp.buildings.hall=1,x=>x.inventory.spirit_essence=0,x=>x.heroes.guansheng.status='unknown']){const x=structuredClone(before);mutate(x);const snapshot=JSON.stringify(x);assert.throws(()=>act(x,'heroPromote',{id:'guansheng'}));assert.equal(JSON.stringify(x),snapshot);}
const busy=structuredClone(spirit);startBattle(busy,data,{enemies:['bandit'],context:{type:'event',id:'road_bandits'}});assert.throws(()=>act(busy,'heroPromote',{id:'guansheng'}));
assert.deepEqual(importSave(exportSave(s,{id:1,name:'108 将'},data),data).state,s);
for(const value of [-1,3,'仙',1.2,null]){const bad=structuredClone(s);bad.heroes.guansheng.quality=value;assert.throws(()=>parseSave(JSON.stringify(bad),data));}
const legacy=newGame(data,s.clock,239);delete legacy.rosterVersion;for(const h of data.heroes.filter(h=>h.introducedIn===3))delete legacy.heroes[h.id];legacy.heroes.wusong={status:'owned',level:20,exp:19};legacy.team=['wusong'];
const migrated=parseSave(JSON.stringify(legacy),data);assert.equal(migrated.rosterVersion,3);assert.equal(Object.keys(migrated.heroes).length,108);assert.deepEqual(migrated.heroes.wusong,legacy.heroes.wusong);assert.equal(migrated.heroes.lujunyi.status,'unknown');assert.deepEqual(parseSave(JSON.stringify(migrated),data),migrated);
const broken=structuredClone(legacy);delete broken.heroes.baisheng;assert.throws(()=>parseSave(JSON.stringify(broken),data));
const damaged=structuredClone(migrated);delete damaged.heroes.guansheng;assert.throws(()=>parseSave(JSON.stringify(damaged),data));assert.deepEqual(gameSnapshot(s,data),s);
const cachedRuntime=structuredClone(s);delete cachedRuntime.rosterVersion;
const normalized=parseSave(JSON.stringify(cachedRuntime),data);assert.equal(normalized.rosterVersion,3);assert.equal(normalized.heroes.guansheng.quality,2);
// Every new hero's contract is independently earnable, with all other contracts held.
for(const h of data.heroes){const x={rng:1,inventory:Object.fromEntries(data.heroes.filter(v=>v.id!==h.id).map(v=>[v.mount.contract,1]))};awardMountContracts(x,data,h.mount.dungeon);assert.equal(x.inventory[h.mount.contract],1,h.name+' contract');}
// Real trial engine settlement, then reject duplicate reward collection and enforce daily limits.
for(const id of ['spirit_trial','immortal_trial']){
 let x=structuredClone(s);x.team=['guansheng','wusong','songjiang'];x.battleSkillMode='auto';for(const hero of x.team){x.heroes[hero]={status:'owned',level:30,exp:0,quality:1};for(const skill of data.by.heroes[hero].skills){const flag=data.by.skills[skill].training.flag;if(flag)x.progress.flags[flag]=true;}}
 x.player.stamina=100;const material=id==='spirit_trial'?'spirit_essence':'immortal_seal',n=x.inventory[material]||0;
 x=act(x,'dungeon',{id});while(!x.battle.outcome)advanceBattle(x,data,1000);assert.equal(x.battle.outcome,'victory',id+' attainable with spirit party');
 x=act(x,'finishBattle');assert.equal(x.inventory[material],n+(id==='spirit_trial'?2:1));assert.throws(()=>act(x,'finishBattle'));
 x.daily.dungeons[id]=3;assert.throws(()=>act(x,'dungeon',{id}),/次数/);
 const loss=act(s,'dungeon',{id});const retreated=act(act(loss,'battleRetreat'),'finishBattle');assert.equal(retreated.inventory[material],s.inventory[material]);
}
console.log('108 roster: canonical seats, search/pages, earned promotion, preserved growth, damage multipliers, atomic costs, v1/v2 migration, invalid quality rejection, 108 independent contracts and actual trial rewards passed.');
