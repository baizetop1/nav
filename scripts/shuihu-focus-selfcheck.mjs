import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
const state=newGame(data,Date.now(),12345);state.message='旧页面操作消息';
const frame=(view,s=state,extra={})=>render({state:s,data,view,status:'已保存到本机',...extra});
for(const view of ['map','heroes','bag','recruit','quests','chronicle','save','forge']){
  const html=frame(view);assert.ok(!html.includes('class="sidebar"'));assert.ok(!html.includes('旧页面操作消息'));
  assert.ok(html.includes('data-screen="'+view+'"'));
  if(view!=='chronicle')for(const label of ['此刻的梁山','眼下线索','第1卷 · 郓城风起 · 已开启'])assert.ok(!html.includes(label),view+' excludes '+label);
  assert.ok(html.includes('data-view="save"'),'Save access is always available');
}
const chronicle=frame('chronicle');for(const label of ['山寨概况与眼下线索','历练得胜','威望达到一百五十','最近记事'])assert.ok(chronicle.includes(label));
assert.ok(frame('heroes').includes('还没有正式入寨'));assert.ok(!frame('heroes').includes('尚未听闻的好汉</h2>'));
for(const location of ['recruit','forge']){
  const s={...state,location};assert.ok(!frame('map',s).includes('type&quot;:&quot;recruit'));
  assert.ok(!frame('map',s).includes('type&quot;:&quot;strengthen'));assert.ok(frame('map',s).includes(location==='recruit'?'进入招贤':'进入打造与强化'));
}
assert.ok(frame('forge').includes('需先在江湖进入'));assert.ok(!frame('forge').includes('type&quot;:&quot;craftEquip'));
const known=structuredClone(state);known.location='recruit';for(const h of Object.values(known.heroes))h.status='known';known.inventory.wusong_order=2;
const selected=frame('recruit',known);assert.ok(selected.includes('id="recruit-target"'));assert.equal((selected.match(/type&quot;:&quot;recruit&quot;/g)||[]).length,2,'Only ordinary plus one selected exclusive action');
assert.ok(selected.includes('id&quot;:&quot;wusong'));assert.ok(frame('recruit',known,{recruitTarget:'linchong'}).includes('id&quot;:&quot;linchong'));
assert.ok(frame('recruit',known,{recruitTarget:'missing'}).includes('id&quot;:&quot;wusong'),'Invalid UI target safely falls back');
for(const id of ['equipment','materials','shop'])assert.ok(frame('bag').includes('data-fold="'+id+'"'));
assert.ok(frame('save').includes('data-fold="reset"'));assert.ok(frame('quests').includes('data-fold="other-quests"'));
const notice=frame('heroes',state,{notice:'保存阵容 <已完成>'});assert.ok(notice.includes('保存阵容 &lt;已完成&gt;'));
for(const view of ['map','recruit','chronicle','save']){
  assert.ok(frame(view,state,{locked:true,status:'另一标签页更新了游戏存档'}).includes('另一标签页更新了游戏存档'));
  assert.ok(frame(view,state,{error:'操作失败'}).includes('role="alert">操作失败'));
}
console.log('Shuihu focused UI: page isolation, relocated overview, recruit selection, collapsed secondary content, forge location gate, old-message suppression and save/error visibility passed.');
