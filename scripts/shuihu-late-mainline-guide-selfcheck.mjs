import assert from 'node:assert/strict';
import {d,lateFixture,story,act,travel,resupply,beginFight,conduct,roundtrip,closeChapter,finishEleven} from './shuihu-late-mainline-selfcheck.mjs';
import {storyObjective} from '../public/game/js/story-guide.js';
import {conditionText,routeTo} from '../public/game/js/world-map.js';
import {afterBattleNext} from '../public/game/js/opening-ui.js';
import {campDashboard} from '../public/game/js/folio-ui.js';
import {mainlinePlanPanel} from '../public/game/js/mainline-ui.js';
import {lateMainlineBoard,chapterIntroduction,lateEndingText} from '../public/game/js/late-mainline-board.js';
import {CHAPTER_MISSIONS} from '../public/game/js/volume-three-data.js';
const btn=(name,command)=>'<button data-type="'+command.type+'">'+name+'</button>';
function goal(s,id){const original=JSON.stringify(s),g=storyObjective(s,d);assert.equal(g.story,id,JSON.stringify(g));assert.equal(g.map,d.by.stories[id].map);assert.ok(g.route,'goal has an open route');assert.equal(JSON.stringify(s),original,'reading a goal never mutates progress');return g;}
function readyGoal(s,id){s=resupply(s,id);goal(s,id);return s;}
function settledFight(s,id){
 s=readyGoal(s,id);s=conduct(beginFight(s,id)).s;assert.equal(s.battle.outcome,'victory');const b=structuredClone(s.battle);s=act(s,'finishBattle');
 goal(s,id);assert.equal(afterBattleNext(s,b,d,null).command.type,'ui_storyResume');
 s=travel(s,'v'+id.match(/^v(\d+)_/)[1]+'_camp');s=roundtrip(s,'导航待领战果');goal(s,id);return story(s,id);
}
function gates(base,id){
 const m=CHAPTER_MISSIONS[id];base=resupply(base,id);
 for(const opened of [false,true]){const state=opened?act(travel(structuredClone(base),d.by.stories[id].map),'story',{id}):base;
  for(const [mutate,view,section,detail]of [
   [s=>s.team=[],'heroes','formation',String(m.level)],
   [s=>{for(const h of s.team)s.heroes[h].level=m.level-1;},'heroes','training',String(m.level)],
   [s=>s.camp.buildings.hall=3,'camp','buildings','4'],
   [s=>s.player.stamina=0,'bag','supplies',String(m.stamina)],
   [s=>s.camp.food=0,'camp','duties','158'],
   [s=>{s.camp.troops=0;s.camp.wounded=0;},'camp','formation','独行']
  ]){const copy=structuredClone(state);mutate(copy);const snapshot=JSON.stringify(copy),g=storyObjective(copy,d);assert.equal(g.view,view,id);assert.equal(g.section,section,id);assert.ok(g.detail.includes(detail),g.detail);assert.equal(JSON.stringify(copy),snapshot);}
 }
}
const base=lateFixture();goal(base,'v8_choose');assert.equal(lateEndingText(base),'','unfinished progress does not expose an ending');let eighth;
for(const priority of ['rescue','evidence','supply']){
 let s=story(structuredClone(base),'v8_choose',priority);const order=[priority,...['rescue','evidence','supply'].filter(x=>x!==priority)];
 if(priority==='rescue')gates(s,'v8_rescue');
 for(const task of order)s=settledFight(s,'v8_'+task);
 s=settledFight(s,'v8_final');goal(s,'v8_settle');s=closeChapter(s,8,'v8_settle');goal(s,'v9_choose');if(priority==='rescue')eighth=s;
}
let ninth;
for(const branch of ['covert','assault']){
 let s=story(structuredClone(eighth),'v9_choose',branch);for(const id of ['v9_gate','v9_prison','v9_escape'])s=settledFight(s,id);goal(s,'v9_settle');s=closeChapter(s,9,'v9_settle');goal(s,'v10_report');if(branch==='covert')ninth=s;
}
let s=story(ninth,'v10_report');s=settledFight(s,'v10_escort');goal(s,'v10_allocate');s=story(s,'v10_allocate','defense');s=settledFight(s,'v10_ford');goal(s,'v10_gather');s=closeChapter(s,10,'v10_gather');goal(s,'v11_report');
s=story(s,'v11_report');gates(s,'v11_escort');s=settledFight(s,'v11_escort');s=settledFight(s,'v11_grain');goal(s,'v11_plain');s=story(s,'v11_plain');goal(s,'v11_covenant');s=story(s,'v11_covenant');goal(s,'v11_reply');const prepared=s;
for(const route of ['stay','sea','return']){
 let current=finishEleven(structuredClone(prepared),route==='return'?'charter':'homeland');goal(current,'v12_choose');current=story(current,'v12_choose',route);goal(current,'v12_choose');current=story(current,'v12_choose','back');goal(current,'v12_choose');current=story(current,'v12_choose',route);current=story(current,'v12_choose','confirm');
 const first='v12_'+route+'_first';current=readyGoal(current,first);gates(current,first);
 for(const other of ['stay','sea','return'].filter(x=>x!==route))assert.equal(routeTo(current,d,'v12_'+other+'_first_site'),null,'other ending does not get an objective');
 for(const stage of ['first','second','third'])current=settledFight(current,'v12_'+route+'_'+stage);
 goal(current,'v12_epilogue');current=story(current,'v12_epilogue','read_'+route);goal(current,'v12_epilogue');current=closeChapter(current,12,'v12_epilogue');
 const ending=storyObjective(current,d);assert.equal(ending.title,'主线已完结');assert.equal(ending.view,'chronicle');assert.equal(ending.done,ending.total);assert.equal(ending.chapter,12);assert.equal(ending.story,undefined);
 const text=lateEndingText(current);assert.ok(text.length>300,'completed route retains its full epilogue');assert.ok(text.includes({stay:'乡约抄了三份',sea:'最后一班渡船离岸之前',return:'界碑旁的乡老按户接走归民'}[route]),'epilogue matches the selected ending');assert.ok(text.includes('宋江')&&text.includes('林冲'),'specific character destinations are available to the chronicle');assert.match(lateMainlineBoard(current,d,String,btn),/主线已完结/);assert.match(campDashboard(current,d,String,btn,''),/查看结局与后记/);assert.doesNotMatch(mainlinePlanPanel(current,d,String),/待前卷完成|尚未开放|规划中/);
}
for(const c of d.chapters.filter(c=>c.number>=8))assert.ok(chapterIntroduction(c));
for(const [id,words]of [['v8_priority_supply','先截'],['v11_homeland','护乡'],['v12_sea','迁海'],['v12_return_third_done','护送归民过界'],['volume_twelve_complete','第12卷']]){
 assert.ok(conditionText({flag:id},d).includes(words));assert.ok(conditionText({notFlag:id},d).startsWith('尚未'));assert.doesNotMatch(conditionText({flag:id},d),/推进相关人物往事|满足相关探索条件/);
}
console.log('Late-mainline guide PASS: three first-task priorities, both city routes, all three endings, six battle gates, real victory confirmation after travel/reload, readable flags and completed-mainline navigation.');
