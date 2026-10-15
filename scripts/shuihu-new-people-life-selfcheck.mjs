import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {campFixture,nextDay} from './shuihu-camp-life-selfcheck.mjs';
import {d,act,win} from './shuihu-campaign-fixtures.mjs';
import {CAMP_PEOPLE} from '../public/game/js/camp-life-data.js';
import {talkQuote,jobQuote,lifePeople,lifePerson} from '../public/game/js/camp-life.js';
import {campLifePreserved} from '../public/game/js/camp-life-save.js';
import {sourceStock} from '../public/game/js/source-goals.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {acquisitionSources} from '../public/game/js/source-catalog.js';
import {lifePanel} from '../public/game/js/camp-life-ui.js';
export const NEW_LIFE_PEOPLE=['zhangshun','jindajian','zhugui'];
const clone=structuredClone;
function reject(s,type,args,pattern){const before=JSON.stringify(s);assert.throws(()=>act(s,type,args),pattern);assert.equal(JSON.stringify(s),before,'failed action must preserve every stock, RNG and record');}
function fillCost(s,cost){for(const [id,n]of Object.entries(cost)){if(id==='silver')s.player.silver=Math.max(s.player.silver,n+50);else if(id==='campWood')s.camp.wood=Math.max(s.camp.wood,n+50);else if(id==='campFood')s.camp.food=Math.max(s.camp.food,n+50);else s.inventory[id]=Math.max(s.inventory[id]||0,n+50);}}
export function newPeopleLifeRun(){
 let s=campFixture();for(const id of NEW_LIFE_PEOPLE){assert.ok(CAMP_PEOPLE[id],'new camp person '+id);assert.equal(CAMP_PEOPLE[id].scenes.length,3);fillCost(s,CAMP_PEOPLE[id].cost);s.heroes[id].status='owned';}
 const states=[clone(s)],startingHeroes=clone(s.heroes),old=clone(s);delete old.campLife;assert.deepEqual(gameSnapshot(old,d),old,'optional old life records remain compatible');
 for(const id of NEW_LIFE_PEOPLE){assert.ok(lifePeople(s).includes(id));const quotes=clone(s);assert.equal(talkQuote(s,id).reason,'');assert.ok(jobQuote(s,id).reason);lifePanel(s,d,String,label=>label,{lifeHero:id,lifeTab:'people'});assert.deepEqual(s,quotes,'new person panels and quotes remain read-only');reject(s,'lifeJob',{id},/先聊/);s=act(s,'lifeTalk',{id});states.push(clone(s));assert.equal(s.campLife.people[id].talks,1);reject(s,'lifeTalk',{id},/再帮/);}
 const runJob=id=>{const q=jobQuote(s,id),stocks={};assert.equal(q.reason,'');for(const key of new Set([...Object.keys(q.cost),...Object.keys(q.reward)]))stocks[key]=sourceStock(s,key);const before=JSON.stringify(s.heroes);s=act(s,'lifeJob',{id});for(const [key,n]of Object.entries(stocks))assert.equal(sourceStock(s,key),n-(q.cost[key]||0)+(q.reward[key]||0),'exact original job cost/reward for '+id+'/'+key);assert.equal(JSON.stringify(s.heroes),before,'doing a camp job must not reset hero investment');states.push(clone(s));};
 runJob('zhangshun');reject(s,'lifeJob',{id:'zhangshun'},/今天/);runJob('jindajian');reject(s,'lifeJob',{id:'zhugui'},/两件/);for(const id of ['zhangshun','jindajian']){s=act(s,'lifeTalk',{id});states.push(clone(s));assert.equal(lifePerson(s,id).talks,2);}
 // Finish three jobs per person over independent game days, respecting the unchanged two-job cap.
 for(let day=0;day<5;day++){
  s=nextDay(s);let done=0;for(const id of NEW_LIFE_PEOPLE){if(lifePerson(s,id).jobs>=3||done>=2)continue;runJob(id);done++;const p=lifePerson(s,id);if(p.talks===1&&p.jobs>=1){s=act(s,'lifeTalk',{id});states.push(clone(s));}if(p.jobs>=3&&lifePerson(s,id).talks===2){const token=s.inventory[id+'_token']||0;s=act(s,'lifeTalk',{id});states.push(clone(s));assert.equal(s.inventory[id+'_token'],token+1,'third talk gives exactly one personal token');reject(s,'lifeTalk',{id},/说过/);}}
 }
 for(const id of NEW_LIFE_PEOPLE){assert.equal(lifePerson(s,id).talks,3);assert.equal(lifePerson(s,id).jobs,3);assert.deepEqual(s.heroes[id],startingHeroes[id]);for(const material of Object.keys(CAMP_PEOPLE[id].reward))assert.ok(acquisitionSources(s,d,material).some(row=>row.key==='life:'+id),'reward has the real camp source '+id+'/'+material);}
 assert.equal(campLifePreserved(s,states[0]),false);assert.ok(campLifePreserved(s,nextDay(s)));assert.deepEqual(importSave(exportSave(s,{id:1,name:'寨中三位新故人'},d),d).state,s);
 const unowned=clone(states[0]);unowned.heroes.zhangshun.status='known';assert.match(talkQuote(unowned,'zhangshun').reason,/尚未入寨/);assert.ok(!lifePeople(unowned).includes('zhangshun'));
 const current=win(act(nextDay(clone(states[0])),'specialStart',{id:'mine',tier:1}));
 let away=act(current,'idleSend',{region:'mine',hero:'zhangshun'});assert.match(talkQuote(away,'zhangshun').reason,/回寨/);assert.match(jobQuote(away,'zhangshun').reason,/归寨/);reject(away,'lifeTalk',{id:'zhangshun'},/回寨|接回/);away=act(away,'idleRecall');assert.equal(talkQuote(away,'zhangshun').reason,'');
 const dry=clone(states.find(v=>v.campLife?.people.zhangshun?.talks===1));const firstMaterial=Object.keys(CAMP_PEOPLE.zhangshun.cost)[0];if(firstMaterial==='silver')dry.player.silver=0;else if(firstMaterial==='campWood')dry.camp.wood=0;else if(firstMaterial==='campFood')dry.camp.food=0;else dry.inventory[firstMaterial]=0;reject(dry,'lifeJob',{id:'zhangshun'},/材料/);
 console.log('New camp people PASS: 张顺/金大坚/朱贵, three conversations each, actual unchanged costs/rewards, full-camp two jobs/day and one/person/day, three independent job days, once-only token, owned investment preservation, real idle absence/return checks, source links, read-only views, optional legacy and exact file/snapshot roundtrips.');
 return {d,states,final:s};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)newPeopleLifeRun();
