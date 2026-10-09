import assert from 'node:assert/strict';
import {fixture,act,win,walk,d} from './shuihu-campaign-fixtures.mjs';
import {dispatch} from '../public/game/js/core.js';
import {IDLE_ROUTES,IDLE_CYCLE,IDLE_CAP,idleRates} from '../public/game/js/idle-data.js';
import {GATHERING_REGIONS,REGIONAL_RECIPES} from '../public/game/js/gathering-data.js';
import {regionalQuote} from '../public/game/js/gathering.js';
import {gatheringSuggestions} from '../public/game/js/gathering-ui.js';
import {gatheringPreserved} from '../public/game/js/gathering-save.js';
import {RECIPES} from '../public/game/js/provisions.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
export {d};export const samples=[];
export function clear(s,region,tier=1){if(IDLE_ROUTES[region].kind==='special')return win(act(s,'specialStart',{id:region,tier}));s=act(s,'journeyStart',{region,tier,goal:'camp'});s=walk(s);return act(s,'journeyReturn');}
export function advance(s,time){const next=dispatch(d,s,{type:'refresh'},s.clock+time);assert.deepEqual(gameSnapshot(next,d),next);return next;}
assert.equal(new Set(Object.values(GATHERING_REGIONS).map(r=>r.item)).size,6);
for(const [region,m]of Object.entries(GATHERING_REGIONS)){
 let s=fixture(791,40);s.battleSkillMode='auto';assert.ok(regionalQuote(s,d,region).reason);s=clear(s,region);assert.deepEqual(s.gathering.regions[region],{runs:1,best:1});
 const old=structuredClone(s);delete old.gathering;assert.deepEqual(gameSnapshot(old,d),old);
 s=act(old,'idleSend',{region,hero:'tanglong'});assert.deepEqual(s.gathering.regions[region],{runs:1,best:1});
 s=advance(s,IDLE_CYCLE);assert.equal(s.idleDispatch.bank[m.item],1);const first=structuredClone(s);
 s=clear(s,region);assert.equal(s.gathering.regions[region].runs,2);assert.equal(idleRates(region,'tanglong',s)[m.item],1);
 s=clear(s,region);assert.equal(s.gathering.regions[region].runs,3);assert.equal(idleRates(region,'tanglong',s)[m.item],2);assert.deepEqual(s.idleDispatch.bank,first.idleDispatch.bank,'discovery must not retroactively add stored batches');
 s=advance(s,IDLE_CYCLE);assert.equal(s.idleDispatch.bank[m.item],3);
 const base=Object.keys(IDLE_ROUTES[region].items)[0],rate=idleRates(region,'tanglong',s)[base];s=clear(s,region,2);assert.equal(s.gathering.regions[region].best,2);assert.equal(idleRates(region,'tanglong',s)[base],rate+1);
 const discovered=structuredClone(s.gathering);s=advance(s,IDLE_CAP);assert.deepEqual(s.gathering,discovered,'idle production does not discover sites');assert.equal(s.idleDispatch.bank[m.item],32);
 const bank={...s.idleDispatch.bank},before={...s.inventory};s=act(s,'idleCollect');for(const [id,n]of Object.entries(bank))assert.equal(s.inventory[id]-(before[id]||0),n);assert.deepEqual(s.idleDispatch.bank,{});assert.throws(()=>act(s,'idleCollect'));
 s=importSave(exportSave(s,{id:1,name:'采集'},d),d).state;assert.deepEqual(s.gathering,discovered);assert.ok(gatheringPreserved(first,s));assert.equal(gatheringPreserved(s,first),false);
 const progress=structuredClone(s.gathering);if(IDLE_ROUTES[region].kind==='special'){s=act(s,'specialStart',{id:region,tier:1});s=act(s,'battleRetreat');s=act(s,'finishBattle');}else{s=act(s,'journeyStart',{region,tier:1,goal:'camp'});s=act(s,'journeyReturn');}assert.deepEqual(s.gathering,progress,'retreat does not progress exploration');
 const r=REGIONAL_RECIPES[region];s.player.silver=10000;for(const [id,n]of Object.entries(r.items))if(id!==m.item)s.inventory[id]=n*r.limit;
 const q=regionalQuote(s,d,region);assert.equal(q.reason,'');const inventory={...s.inventory},coins=s.player.silver,gear=s.equipment.length;
 for(let i=0;i<r.limit;i++)s=act(s,'regionalCraft',{id:region});
 assert.equal(s.player.silver,coins-r.silver*r.limit);for(const [id,n]of Object.entries(r.items))assert.equal(inventory[id]-s.inventory[id],n*r.limit);
 if(r.kind==='equipment'){assert.equal(s.equipment.length-gear,r.limit);assert.ok(s.equipment.slice(-r.limit).every(e=>e.item===r.output));}else assert.equal(s.inventory[r.output]-(inventory[r.output]||0),r.count*r.limit);
 assert.match(regionalQuote(s,d,region).reason,/次数/);const saved=JSON.stringify(s);assert.throws(()=>act(s,'regionalCraft',{id:region}),/次数/);assert.equal(JSON.stringify(s),saved);
 const reset=advance(s,24*3600000);for(const [id,n]of Object.entries(r.items))reset.inventory[id]=n;assert.equal(regionalQuote(reset,d,region).reason,'','daily budget resets');
 const noMaterials=structuredClone(reset);noMaterials.inventory[m.item]=0;assert.throws(()=>act(noMaterials,'regionalCraft',{id:region}),/还缺/);
 const full=structuredClone(reset);if(r.kind==='item')full.inventory[r.output]=10000000;else full.equipment=Array.from({length:200},(_,i)=>({uid:'eq_'+(full.nextEquipment++),item:r.output,hero:null,plus:0}));assert.throws(()=>act(full,'regionalCraft',{id:region}),/库存|装备/);
 if(r.kind==='item'){
  let shared=structuredClone(reset);shared.daily.counters['craft_'+r.output]=r.limit-1;shared=act(shared,'regionalCraft',{id:region});if(!shared.expansion?.recipes.includes(r.output))shared=act(shared,'provisionUnlock',{id:r.output});for(const [id,n]of Object.entries(RECIPES[r.output].items))shared.inventory[id]=n;assert.throws(()=>act(shared,'provisionCraft',{id:r.output}),/次数/);
 }
 samples.push([first,s]);
}
let s=structuredClone(samples[0][1]);for(const [id,n]of Object.entries({iron:20,cloth:20,scrap_iron:20,martial_pages:10}))s.inventory[id]=n;
const tips=gatheringSuggestions(s,d,'mine');assert.equal(tips.heroes.length,2);assert.ok(tips.heroes.every(v=>v.hero!=='tanglong'));const suggestion=tips.heroes[0];s=act(s,'corpsTrain',{id:suggestion.hero});assert.equal(s.development.corps[suggestion.hero],2);
for(const mutate of [x=>delete x.gathering,x=>x.gathering.regions.mine.runs=4,x=>x.gathering.regions.mine.best=3,x=>x.gathering.regions.fake={runs:1,best:1},x=>x.idleDispatch.bank.magical_token=1]){const bad=structuredClone(samples[0][1]);mutate(bad);assert.throws(()=>gameSnapshot(bad,d));}
console.log('Gathering PASS: six unique sources, real special/journey clears, discoveries at three clears and tier two, no retroactive yield, idle cap/claim, retreat, old saves, exact costs, bounded/shared crafting budgets, storage limits, save roundtrip and reachable hero improvements.');
