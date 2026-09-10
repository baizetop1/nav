import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ActivityLog} from '../public/game/js/activity.js';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
const state=newGame(data,Date.now(),4321),before=JSON.stringify(state),log=new ActivityLog();
assert.equal(log.observe(state,{available:false}).length,0);
const first=structuredClone(log.observe(state));
assert.deepEqual(log.observe(structuredClone(state)),first,'Re-rendering never duplicates journal entries');
assert.equal(JSON.stringify(state),before,'Observing never mutates game state');
const staged=structuredClone(state);
staged.battle={log:['【0秒】交战开始','【1秒】普通攻击']};
const initial=log.observe(staged).length;
assert.equal(log.observe(structuredClone(staged)).length,initial);
staged.battle.log=['【1秒】普通攻击','【2秒】施展技能'];
assert.equal(log.observe(staged).length,initial+1,'Rolling battle logs only append the new tail');
staged.battle=null;log.observe(staged);
assert.ok(log.entries.some(e=>e.text==='【2秒】施展技能'),'Finished battle details survive view changes this session');
staged.scheme={log:['一计初成']};log.observe(staged);assert.equal(log.entries.at(-1).kind,'scheme');
log.observe(staged,{feedback:'操作已完成'});const count=log.entries.length;log.observe(staged,{feedback:'操作已完成'});assert.equal(log.entries.length,count);
for(let i=0;i<250;i++){staged.journal.push({at:staged.clock+i,text:'记事 '+i});log.observe(staged);}
assert.equal(log.entries.length,200);assert.equal(new Set(log.entries.map(e=>e.id)).size,200);assert.equal(log.entries.at(-1).text,'记事 249');
assert.ok(!JSON.stringify(log.entries).includes('Token'));
const malicious=[{id:1,at:state.clock,kind:'journey',text:'<img src=x onerror=alert(1)>'}];
for(const view of ['welcome','map','heroes','bag','recruit','quests','chronicle','save']){
  const html=render({state,data,view,entered:view!=='welcome',activity:malicious});
  for(const id of ['main','game-navigation','activity-panel','activity-log','activity-caption'])assert.equal(html.split(`id="${id}"`).length-1,1,`${view}: one stable ${id}`);
  assert.ok(html.includes('viewport-shell'));assert.ok(html.includes('data-log-latest'));assert.ok(!html.includes('class="combat-log"'));assert.ok(!html.includes('<img src=x'));
  if(view!=='welcome')assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
}
assert.equal(JSON.stringify(state),before);
log.reset();assert.deepEqual(log.entries,[]);assert.equal(log.observe(state).length,state.journal.length,'Explicit slot load/import starts a separate timeline');
assert.equal(data.config.version,2,'No save migration for a layout change');
console.log('Shuihu viewport: stable regions, escaped log, deduplication, rolling history, session battle retention, 200-entry bound, slot reset and no save mutation passed.');
