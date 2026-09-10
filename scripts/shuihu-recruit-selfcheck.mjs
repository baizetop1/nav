import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {parseSave,validateSave} from '../public/game/js/save.js';
import {recruitDialog} from '../public/game/js/ui.js';

const root=new URL('../public/game/data/',import.meta.url);
export const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
export function fixture(kind='joined',exclusive=true,full=false){
  const s=newGame(data,Date.now(),12345);s.location='recruit';s.progress.visited.push('recruit');s.inventory.recruit_order=5;
  for(const h of Object.values(s.heroes))h.status=kind==='clue'?'unknown':kind==='duplicate'?'owned':'known';
  if(exclusive){s.heroes.wusong.status=kind==='duplicate'?'owned':'known';s.inventory.wusong_order=5;s.recruit.fate.wusong=4;}
  if(full){s.team=['baisheng','shiqian','wuyong'];for(const id of s.team)s.heroes[id].status='owned';}
  validateSave(s,data);return s;
}
export const draw=(s,id)=>dispatch(data,s,id?{type:'recruit',id}:{type:'recruit'},s.clock);
for(const exclusive of [true,false])for(const kind of ['joined','duplicate','clue']){
  if(exclusive&&kind==='clue')continue;
  const s=fixture(kind,exclusive),before=structuredClone(s),next=draw(s,exclusive?'wusong':undefined),r=next.recruit.lastResult;
  assert.deepEqual(s,before,'Reducer keeps original state intact');
  assert.equal(r.kind,kind);assert.equal(r.target,exclusive?'wusong':null);assert.equal(r.number,s.recruit.total+1);
  assert.equal(next.inventory[exclusive?'wusong_order':'recruit_order'],s.inventory[exclusive?'wusong_order':'recruit_order']-1);
  assert.equal(r.tokens,kind==='joined'?0:kind==='duplicate'?3:2);assert.equal(r.merit,kind==='duplicate'?15:0);
  assert.equal(r.inTeam,kind==='joined');assert.equal(next.player.merit-s.player.merit,r.merit);
  assert.equal((next.inventory[r.hero+'_token']||0)-(s.inventory[r.hero+'_token']||0),r.tokens);
  assert.equal(next.heroes[r.hero].status,kind==='clue'?'heard':'owned');
  assert.equal(next.team.length,kind==='joined'?1:0);
  const html=recruitDialog(r,data);assert.ok(html.includes(data.by.heroes[r.hero].name));
  assert.ok(html.includes(kind==='joined'?'好汉入寨':kind==='duplicate'?'故友来访':'英雄传闻'));
  if(kind==='clue')assert.ok(html.includes('并未入寨'));
  assert.deepEqual(parseSave(JSON.stringify(next),data,next.clock),next);
}
const full=draw(fixture('joined',true,true),'wusong');assert.equal(full.recruit.lastResult.inTeam,false);assert.equal(full.team.length,3);
assert.ok(recruitDialog(full.recruit.lastResult,data).includes('当前队伍已满'));
// Exclusive invitations may answer with someone else. Display the actual hero, never the requested hero as owned.
let miss;
for(let seed=1;seed<1000&&!miss;seed++){
  const s=fixture('clue');s.recruit.fate.wusong=0;s.rng=seed*123456;
  const next=draw(s,'wusong');if(next.recruit.lastResult.hero!=='wusong')miss=next;
}
assert.ok(miss);assert.equal(miss.recruit.lastResult.kind,'clue');assert.equal(miss.recruit.fate.wusong,1);
assert.equal(miss.heroes.wusong.status,'available');assert.ok(recruitDialog(miss.recruit.lastResult,data).includes('此番所邀：武松'));
const legacy=fixture();delete legacy.recruit.lastResult;assert.deepEqual(parseSave(JSON.stringify(legacy),data,legacy.clock),legacy);
// Chapter rewards occurring in the same action must not be labelled as recruitment loot.
const ending=fixture('duplicate');ending.progress.flags={volume_complete:true,lin_departure:true,lu_complete:true,chai_refuge:true,yang_complete:true};
const rewarded=draw(ending,'wusong');assert.equal(rewarded.progress.flags.volume_two_complete,true);
assert.equal(rewarded.player.merit-ending.player.merit,75);assert.equal(rewarded.recruit.lastResult.merit,15);
for(const mutate of [r=>r.hero='invalid',r=>r.target='invalid',r=>r.kind='invalid',r=>r.tokens=99,r=>r.merit=15,r=>r.number=0,r=>r.inTeam='yes']){
  const bad=structuredClone(full);mutate(bad.recruit.lastResult);assert.throws(()=>validateSave(bad,data),/招贤/);
}
const noOrders=structuredClone(full);noOrders.inventory.wusong_order=0;const unchanged=structuredClone(noOrders);
assert.throws(()=>draw(noOrders,'wusong'),/招贤令/);assert.deepEqual(noOrders,unchanged);
const escaped=structuredClone(data);escaped.by.heroes.wusong.name='<img src=x onerror=alert(1)>';
assert.ok(!recruitDialog(full.recruit.lastResult,escaped).includes('<img'));
assert.ok(recruitDialog(full.recruit.lastResult,escaped).includes('&lt;img'));
console.log('Shuihu recruitment: ordinary/exclusive receipts, joined/full party, duplicate rewards, unknown/off-target clues, old saves, validation, escaping and atomic costs passed.');
