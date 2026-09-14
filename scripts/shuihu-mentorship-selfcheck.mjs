import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {mentorshipQuote,MENTOR_LIMIT} from '../public/game/js/mentorship.js';
import {experienceToNext,experienceResult,totalExperience,ATTRIBUTE_NAMES} from '../public/game/js/progression.js';
import {gainExp,attributes} from '../public/game/js/hero.js';
import {gains} from '../public/game/js/rewards-ui.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
function fixture(){const s=newGame(d,new Date(2026,8,14,12).getTime(),51);s.camp=freshCamp();s.camp.buildings.hall=2;s.camp.buildings.barracks=1;s.camp.food=1000;s.player.silver=2000;s.heroes.linchong={status:'owned',level:20,exp:23};s.heroes.lujunyi={status:'owned',level:1,exp:0};s.heroes.luzhishen={status:'owned',level:1,exp:0};s.team=['linchong'];return s;}
const quote=(s,student='lujunyi',mentor='linchong')=>mentorshipQuote(s,d,mentor,student);
const command=q=>({type:'heroMentor',mentor:q.mentor,student:q.student,expected:q.signature});
const run=(s,q=quote(s),now=s.clock)=>{const n=dispatch(d,s,command(q),now);assert.deepEqual(gameSnapshot(n,d),n);return n;};
let s=fixture(),raw=JSON.stringify(s),q=quote(s);assert.equal(q.reason,'');assert.equal(q.amount,480);assert.equal(q.matched,true);assert.equal(quote(s,'luzhishen').amount,400);assert.equal(JSON.stringify(s),raw,'preview does not mutate');
let n=run(s,q);assert.equal(n.player.stamina,s.player.stamina-5);assert.equal(n.player.silver,s.player.silver-100);assert.equal(n.camp.food,s.camp.food-20);assert.equal(n.daily.counters.heroMentor,1);assert.equal(n.stats.heroMentor,1);assert.deepEqual(n.heroes.linchong,s.heroes.linchong);assert.deepEqual(n.inventory,s.inventory);assert.deepEqual(n.team,s.team);assert.equal(n.rng,s.rng);
assert.equal(n.heroes.lujunyi.level,q.next.level);assert.equal(n.heroes.lujunyi.exp,q.next.exp);assert.equal(gains(s,n,d).find(r=>r.name==='卢俊义 · 历练').amount,q.amount);
for(const [key,name] of Object.entries(ATTRIBUTE_NAMES))assert.equal(q.rows.find(r=>r.name===name).value,attributes(s,'lujunyi',d)[key]+' → '+attributes(n,'lujunyi',d)[key]);
assert.deepEqual(importSave(exportSave(n,{id:1,name:'演武测试'},d),d).state,n);
s.camp.buildings.barracks=2;assert.equal(quote(s).amount,528);
for(let lv=1;lv<=40;lv++){const h={level:lv,exp:0};assert.equal(totalExperience(h),Array.from({length:lv-1},(_,i)=>experienceToNext(i+1)).reduce((a,b)=>a+b,0));}
// Receipt regression: crossing levels must use the new curve; capped XP excludes overflow.
for(const [level,exp,amount] of [[1,0,300],[20,790,300],[39,experienceToNext(39)-1,300]]){const a=fixture();a.heroes.lujunyi={status:'owned',level,exp};const b=structuredClone(a);gainExp(b,'lujunyi',amount,d);const actual=amount-experienceResult(a.heroes.lujunyi,amount,40).overflow;assert.equal(gains(a,b,d).find(r=>r.name==='卢俊义 · 历练').amount,actual);}
s=fixture();for(let i=0;i<MENTOR_LIMIT;i++)s=run(s);assert.match(quote(s).reason,/用完/);raw=JSON.stringify(s);assert.throws(()=>run(s),/用完/);assert.equal(JSON.stringify(s),raw);
const next=dispatch(d,s,{type:'refresh'},s.clock+86400000);assert.equal(quote(next).remaining,3);assert.equal(run(next).daily.counters.heroMentor,1);assert.equal(run(next).stats.heroMentor,4);
s=fixture();q=quote(s);assert.throws(()=>run(s,q,s.clock+86400000),/重新预览/,'old-day confirmation rejected');
s=fixture();s.heroes.linchong.level=10;s.heroes.lujunyi={status:'owned',level:6,exp:experienceToNext(6)-1};q=quote(s);assert.equal(q.amount,1);n=run(s,q);assert.equal(n.heroes.lujunyi.level,7);assert.equal(n.heroes.lujunyi.exp,0);assert.match(quote(n).reason,/至少 4 级/);
for(const [mutate,pattern] of [[v=>v.camp=null,/建立寨子/],[v=>v.camp.buildings.hall=1,/聚义厅/],[v=>v.camp.buildings.barracks=0,/兵营/],[v=>v.heroes.linchong.level=9,/10 级/],[v=>v.heroes.lujunyi.status='known',/学员/],[v=>v.player.silver=99,/碎银/],[v=>v.player.stamina=4,/体力/],[v=>v.camp.food=19,/粮草/],[v=>v.affairs={mission:{hero:'linchong'}},/外派/],[v=>v.affairs={mission:{hero:'lujunyi'}},/外派/],[v=>v.battle={},/交战/]]){
 const v=fixture();mutate(v);assert.match(quote(v).reason,pattern);const before=JSON.stringify(v);assert.throws(()=>run(v));assert.equal(JSON.stringify(v),before);
}
assert.match(quote(fixture(),'linchong').reason,/不同好汉/);assert.match(quote(fixture(),'missing').reason,/学员/);
s=fixture();q=quote(s);s.heroes.lujunyi.exp=100;assert.throws(()=>run(s,q),/重新预览/);
s=fixture();q=quote(s);s.camp.buildings.barracks=2;assert.throws(()=>run(s,q),/重新预览/);
for(const h of d.heroes){const v=fixture(),mentor=h.id==='linchong'?'lujunyi':'linchong';v.heroes[mentor]={status:'owned',level:40,exp:0};v.heroes[h.id]={status:'owned',level:1,exp:0};const p=quote(v,h.id,mentor);assert.equal(p.reason,'');assert.ok(p.amount>0);}
assert.deepEqual(gameSnapshot(fixture(),d).heroes,fixture().heroes,'old save requires no new fields');
console.log('Mentorship PASS: all 108 candidates, role/level/building yield, real atomic costs, mentor preservation, exact XP/stat preview, cap, shared daily limit/reset, stale and cross-day rejection, activity/mission locks, receipts across levels, export/import and old saves.');
