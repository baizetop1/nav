import assert from 'node:assert/strict';
import {d,fixture,act,travel,story,ready,complete} from './shuihu-volume-seven-selfcheck.mjs';
import {storyObjective} from '../public/game/js/story-guide.js';
import {campDashboard} from '../public/game/js/folio-ui.js';
import {afterBattleNext} from '../public/game/js/opening-ui.js';
import {mainlinePlanPanel} from '../public/game/js/mainline-ui.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {exportSave,importSave} from '../public/game/js/portable.js';
const objective=(s,id)=>{const g=storyObjective(s,d);assert.equal(g.story,id);assert.equal(g.map,d.by.stories[id].map);assert.ok(g.route);return g;};
let s=fixture();objective(s,'v7_report');
s=travel(s,'v7_camp');s=story(s,'v7_report');objective(s,'v7_scout');s=travel(s,'v7_watch');s=story(s,'v7_scout');objective(s,'v7_probe');
// The guide catches real battle gates before and after opening the story, without mutating progress.
for(const opened of [false,true]){const base=opened?act(travel(s,'v7_ford'),'story',{id:'v7_probe'}):s;for(const [change,view,section,words] of [
 [x=>{x.team=[]},'heroes','formation',/35/],
 [x=>{for(const id of x.team)x.heroes[id].level=34},'heroes','training',/35/],
 [x=>{x.camp.buildings.hall=3},'camp','buildings',/4/],
 [x=>{x.player.stamina=0},'bag','supplies',/12/],
 [x=>{x.camp.food=0},'camp','duties',/158/],
 [x=>{x.camp.troops=0},'camp','formation',/独行/]
 ]){const q=structuredClone(base);change(q);const raw=JSON.stringify(q),g=storyObjective(q,d);assert.equal(g.view,view);assert.equal(g.section,section);assert.match(g.detail,words);assert.equal(JSON.stringify(q),raw);}}
// Owning a high-level reserve does not satisfy the deployed-team requirement.
const reserves=structuredClone(s);for(const id of reserves.team)reserves.heroes[id].level=34;reserves.heroes.xuning={status:'owned',level:40,exp:0,quality:0};assert.equal(storyObjective(reserves,d).section,'training');
// Real victory, settlement and file reload preserve the next step, including optional aid interception.
s=ready('hook');objective(s,'v7_break');s=travel(s,'v7_road');s=act(s,'chapterBattle',{id:'v7_cut',choice:'fight'});for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');const b=structuredClone(s.battle);s=act(s,'finishBattle');assert.equal(afterBattleNext(s,b,d,null).command.type,'ui_storyResume');objective(s,'v7_cut');s=travel(s,'v7_camp');s=importSave(exportSave(s,{id:1,name:'待领战果'},d),d).state;objective(s,'v7_cut');s=travel(s,'v7_road');s=story(s,'v7_cut');objective(s,'v7_break');
const after=complete().s;const end=objective(after,'v8_choose');assert.equal(end.chapter,8);assert.equal(end.map,'v8_camp');
const btn=(name,command)=>'<button data-type="'+command.type+'">'+name+'</button>',dash=campDashboard(fixture(),d,String,btn,'');assert.ok(dash.indexOf('当前主线目标')<dash.indexOf('下一步游玩目标'));assert.match(dash,/ui_storyResume/);assert.match(campDashboard(after,d,String,btn,''),/ui_storyResume/);assert.doesNotMatch(campDashboard(after,d,String,btn,''),/尚未开放|查看后续篇章/);
const planned=mainlinePlanPanel(after,d,String);assert.match(planned,/主线已开放至第十二卷/);assert.doesNotMatch(planned,/规划中|尚未开放/);assert.equal((planned.match(/已开放<\/span>/g)||[]).length,1);assert.equal((planned.match(/待前卷完成<\/span>/g)||[]).length,4);assert.doesNotMatch(planned,/data-command|data-view/);assert.equal(d.chapters.length,12);
console.log('Volume seven guide PASS: prerequisites, deployed-team gates, pending optional victory after reload, next objectives and live transition into volume eight.');
