import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {storyObjective} from '../public/game/js/story-guide.js';
import {render} from '../public/game/js/ui.js';
import {PAGE_SECTIONS} from '../public/game/js/page-sections.js';
const dir=new URL('../public/game/data/',import.meta.url),d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL(n+'.json',dir)))])));
let s=newGame(d,Date.now(),1200);s.camp=freshCamp();
const objective=()=>{const before=JSON.stringify(s),g=storyObjective(s,d);assert.equal(JSON.stringify(s),before,'Guide must not mutate progress');return g;};
const go=()=>{const g=objective();assert.ok(g.map&&g.route,'Guide supplies an unlocked route');s=dispatch(d,s,{type:'travel',id:g.map});return g;};
assert.equal(objective().map,'inn');go();s=dispatch(d,s,{type:'story',id:'wusong_story'});s=dispatch(d,s,{type:'story',id:'wusong_story',choice:'introduce'});
assert.equal(s.location,'path');assert.equal(objective().map,'drywood');go();assert.equal(objective().action.id,'tracks');s=dispatch(d,s,objective().action);
assert.equal(objective().map,'tracks');go();s=dispatch(d,s,objective().action);assert.equal(objective().map,'deepforest');go();assert.ok(render({state:s,data:d,view:'map'}).includes('留意虎势'));
// A persisted interruption at every discovered stage restores the same destination.
const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(storyObjective(restored,d),objective());
s.progress.flags.tiger_complete=true;s.progress.stories.wusong_story={status:'completed',step:'after'};assert.equal(objective().map,'tavern');go();s=dispatch(d,s,objective().action);assert.equal(objective().map,'zhuang');go();s=dispatch(d,s,{type:'story',id:'seven_stars_story'});s=dispatch(d,s,{type:'story',id:'seven_stars_story',choice:'join'});assert.equal(objective().map,'creek');s=dispatch(d,s,{type:'story',id:'seven_stars_story',choice:'return'});assert.equal(objective().map,'guesthouse');s=dispatch(d,s,{type:'story',id:'seven_stars_story',choice:'pledge'});assert.equal(objective().map,'ridge');go();assert.ok(render({state:s,data:d,view:'map'}).includes('商议冈上的安排'));
s.progress.flags.huangni_complete=true;assert.equal(objective().view,'recruit');
const two=newGame(d,Date.now(),2);two.progress.flags.volume_complete=true;two.progress.flags.lin_escort=true;two.progress.stories.linchong_story={status:'active',step:'roadout'};two.location='boar_forest';const next=storyObjective(two,d);assert.equal(next.map,'xiangguosi','Lin Chong resumes through Lu Zhishen prerequisite');
for(const view of ['camp','recruit','trials','save','forge'])for(const id of Object.keys(PAGE_SECTIONS[view])){const html=render({state:s,data:d,view,pageSections:{[view]:id}});assert.ok(html.includes('data-page-section="'+view+':'+id+'"'),view+'/'+id);assert.equal((html.match(/data-page-section=/g)||[]).length,1);}
const home=render({state:s,data:d,view:'camp'});assert.ok(!home.includes('class="building-grid"'));assert.ok(!home.includes('class="camp-orders"'));assert.ok(home.includes('当前主线目标'));
const save=render({state:s,data:d,view:'save'});assert.ok(!save.includes('id="import-file"'));assert.ok(render({state:s,data:d,view:'save',pageSections:{save:'files'}}).includes('id="import-file"'));
const recruit=render({state:s,data:d,view:'recruit'});assert.ok(!recruit.includes('id="roster-book"'));assert.ok(!recruit.includes('id="recruit-target"'));
console.log('Mobile pages PASS: read-only guide, real tiger prerequisite path, save restoration, seven stars route, chapter gate and inter-story dependency; every hub renders one explicit section.');
