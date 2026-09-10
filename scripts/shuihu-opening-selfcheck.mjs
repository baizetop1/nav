import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {render,isFirstArrival,esc} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
const now=Date.now(),initial=newGame(data,now,12345);
const frame=(s=initial,view='map',extra={})=>render({state:s,data,view,...extra});
const command=(type,id)=>`data-command="${esc(JSON.stringify(id?{type,id}:{type}))}"`;
assert.deepEqual(data.config.opening,['宣和年间。','山东郓城。','江湖风云初起。','你没有武艺。','但你有识人之能。','今日起：','你便是白泽寨主。']);
const before=JSON.stringify(initial),welcome=frame(initial,'welcome',{entered:false});
for(const line of data.config.opening)assert.ok(welcome.includes(`<p>${line}</p>`));
for(const absent of ['class="tabs"','class="resources"','招贤','战斗'])assert.ok(!welcome.includes(absent));
assert.ok(welcome.includes('踏入郓城县'));assert.ok(welcome.includes('接续旧卷'));
assert.ok(welcome.includes(command('ui_start')));assert.ok(welcome.includes('data-view="save"'));
const importPage=frame(initial,'save',{entered:false});assert.ok(!importPage.includes('class="tabs"'));assert.ok(importPage.includes('返回卷首'));assert.ok(importPage.includes('id="import-text"'));
const badSave=frame(initial,'save',{entered:false,locked:true,status:'原文保留'});assert.ok(!badSave.includes('返回卷首'));assert.ok(!badSave.includes(command('ui_start')));assert.ok(badSave.includes('原文保留'));
assert.ok(isFirstArrival(initial));const arrival=frame();assert.ok(arrival.includes('arrival-layout'));assert.ok(arrival.includes('class="resource-strip"'));assert.ok(arrival.includes('class="rail"'),'Fixed navigation remains in its own region on first arrival');
for(const id of ['arrival-search','city-paths'])assert.ok(arrival.includes(`data-fold="${id}"`));
assert.ok(!/<details[^>]+open/.test(arrival),'Secondary controls start collapsed');
for(const label of ['酒肆传闻','县衙告示','江湖消息'])assert.ok(arrival.includes(`aria-label="${label}"`));
for(const id of ['office','tavern','gate','forge','stable','recruit'])assert.equal(arrival.split(command('move',id)).length-1,1,`One real exit to ${id}`);
assert.equal(JSON.stringify(initial),before,'Rendering never changes a save');
for(const [id,heading] of [['office','县衙告示'],['tavern','酒肆传闻'],['gate','江湖消息']]){
  const moved=dispatch(data,initial,{type:'move',id},now);assert.equal(moved.location,id);assert.ok(moved.progress.visited.includes(id));assert.ok(!isFirstArrival(moved));assert.ok(frame(moved).includes(heading));assert.ok(frame(moved).includes('class="rail"'));
  assert.deepEqual(moved.inventory,initial.inventory);assert.deepEqual(moved.heroes,initial.heroes);assert.equal(moved.recruit.total,0);assert.deepEqual(moved.progress.claims,[]);
  const returned=dispatch(data,moved,{type:'move',id:'yuncheng'},now);assert.ok(!isFirstArrival(returned));assert.ok(frame(returned).includes('class="resources"'));assert.ok(frame(returned).includes('story-doors'));
}
const tavern=dispatch(data,initial,{type:'move',id:'tavern'},now);
let rumor=dispatch(data,tavern,{type:'mapAction',id:'rumor_dongxi'},now);
assert.equal(rumor.heroes.wuyong.status,'heard');assert.equal(rumor.progress.flags.dongxi_rumor,true);assert.equal(rumor.daily.counters.news,1);
assert.ok(!frame(rumor).includes(command('mapAction','rumor_dongxi')));
assert.throws(()=>dispatch(data,rumor,{type:'mapAction',id:'rumor_dongxi'},now));
rumor=dispatch(data,rumor,{type:'meet',id:'baisheng'},now);assert.equal(rumor.heroes.baisheng.status,'known');
const guided=dispatch(data,rumor,{type:'guide'},now);assert.equal(guided.heroes.baisheng.status,'owned');assert.ok(guided.team.includes('baisheng'));
assert.ok(guided.journal.some(e=>e.text.includes('附近乡道走得熟')));
for(const changed of [s=>s.recruit.total=1,s=>s.heroes.baisheng.status='known',s=>s.progress.flags.guide=true,s=>s.progress.actions.news=true]){
  const s=structuredClone(initial);changed(s);assert.ok(!isFirstArrival(s),'Progressed saves keep their normal navigation');
}
const unsafe=structuredClone(data);unsafe.config.opening=['<img onerror=alert(1)>'];assert.ok(render({state:initial,data:unsafe,view:'welcome'}).includes('&lt;img onerror=alert(1)&gt;'));
const css=readFileSync(new URL('../public/game/css/game.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.opening-lines p\{animation:none\}\}/);
assert.equal(data.config.version,2,'No save format migration for presentation-only release');
console.log('Shuihu opening: exact prologue, isolated first entry/import, safe save rendering, real story exits, normal returning navigation, once-only rumors, guide recruitment and reduced motion passed.');
