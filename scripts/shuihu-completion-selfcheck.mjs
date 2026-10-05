import assert from 'node:assert/strict';
import {pendingCompletion,completionDialog,completionReview,receiptPrompt} from '../public/game/js/completion-ui.js';
import {completionFixtures} from './shuihu-completion-fixtures.mjs';
import {act,fixture} from './shuihu-campaign-fixtures.mjs';
import {esc} from '../public/game/js/ui.js';
for(const [name,s] of Object.entries(completionFixtures())){
 const original=structuredClone(s),q=pendingCompletion(s);assert.ok(q,name);const html=completionDialog(q,esc);assert.equal((html.match(/data-command=/g)||[]).length,2);assert.deepEqual(s,original);
 const next=act(s,q.command.type);assert.equal(pendingCompletion(next),null);assert.throws(()=>act(next,q.command.type));
 if(['schemeSuccess','schemeFailure','squad'].includes(name))assert.ok(completionReview(s,next,esc));
 console.log('Completion PASS '+name+': valid ready state, read-only prompt, settlement once.');
}
assert.equal(pendingCompletion(fixture()),null);
const t=act(fixture(),'trekStart');assert.equal(pendingCompletion(t),null,'no early retreat');
const j=act(fixture(),'journeyStart',{region:'forest',tier:1,goal:'practice'});assert.equal(pendingCompletion(j),null);
const r=act(fixture(),'ventureStart',{kind:'defense',layout:'reserve'});assert.equal(pendingCompletion(r),null);
const s=act(fixture(),'squadSend',{id:'escort',team:['shiqian'],troops:0});assert.equal(pendingCompletion(s),null,'not back yet');s.clock=s.realm.squad.readyAt;s.expansion={run:{stage:1}};assert.equal(pendingCompletion(s),null,'blocked collection during a venture');
assert.ok(receiptPrompt('<title>','<img>',esc).includes('&lt;img&gt;'));assert.ok(!completionDialog({title:'<title>',text:'<img>',command:{type:'finishScheme'},label:'继续',details:'明细'},esc).includes('<img>'));
console.log('Completion guards PASS: unfinished runs, blocked collection, escaped presentation.');
