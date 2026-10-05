import {validateLateBattle} from './late-mainline-combat.js?v=0.64.0';
import {CHAPTER_MISSIONS} from './volume-three-data.js?v=0.64.0';
import {meets} from './map.js?v=0.64.0';
const volumes=['eight','nine','ten','eleven','twelve'];
const late=id=>typeof id==='string'&&/^v(?:8|9|10|11|12)_/.test(id);
const chapterFlags=volumes.map(name=>'volume_'+name+'_complete');
const isFlag=id=>late(id)||chapterFlags.includes(id);
const flagsOf=choice=>(choice.effects||[]).filter(e=>e.type==='flag').map(e=>e.id);
// A completed story may close its own entrance. Keep its permanent prerequisites.
const historical=c=>!c?null:Object.fromEntries(Object.entries(c).filter(([key])=>key!=='notFlag').map(([key,value])=>[key,['all','any'].includes(key)?value.map(historical):value]));
const reached=(model,from,to,state=null)=>{const pending=[from],seen=new Set();while(pending.length){const id=pending.shift();if(id===to)return true;if(seen.has(id))continue;seen.add(id);for(const c of model.steps[id]?.choices||[])if(c.next&&(!state||meets(state,historical(c.condition))))pending.push(c.next);}return false;};
export const hasLateMainline=s=>!!(late(s?.location)||Object.entries(s?.progress?.flags||{}).some(([id,value])=>value&&isFlag(id))||(s?.progress?.visited||[]).some(late)||Object.keys(s?.progress?.stories||{}).some(late)||late(s?.battle?.context?.id)||late(s?.lastBattle?.context?.id)||s?.battle?.mainline);
export function validateLateMainline(s,d,check){
 validateLateBattle(s,d,check);
 const {flags,stories,visited}=s.progress,models=d.stories.filter(m=>late(m.id)),sources=new Map();
 for(const m of models)for(const [stepId,step] of Object.entries(m.steps))for(const choice of step.choices||[])for(const flag of flagsOf(choice)){if(!sources.has(flag))sources.set(flag,[]);sources.get(flag).push({m,stepId,choice});}
 for(const id of Object.keys(flags).filter(late))check(sources.has(id),'第八至十二卷未知剧情标记');
 if(!hasLateMainline(s))return;
 for(const [i,name] of volumes.entries()){
  const prefix='v'+(i+8)+'_',chapter=d.chapters.find(c=>c.id==='volume_'+name),complete='volume_'+name+'_complete';
  const touched=flags[complete]||s.location.startsWith(prefix)||visited.some(id=>id.startsWith(prefix))||Object.keys(stories).some(id=>id.startsWith(prefix))||Object.entries(flags).some(([id,value])=>id.startsWith(prefix)&&value)||s.battle?.context?.id?.startsWith(prefix)||s.lastBattle?.context?.id?.startsWith(prefix);
  if(!touched)continue;
  check(!!chapter&&!!flags['volume_'+(i?volumes[i-1]:'seven')+'_complete'],'第'+(i+8)+'卷前卷未完成');
  const eligible=meets(s,chapter.condition)&&chapter.requirements.every(r=>meets(s,r.condition));
  check(!!flags[complete]===eligible,'第'+(i+8)+'卷结卷条件');
 }
 for(const [done,choices] of [
  ['v8_chosen',['v8_priority_rescue','v8_priority_evidence','v8_priority_supply']],
  ['v9_chosen',['v9_covert','v9_assault']],
  ['v10_allocated',['v10_supply','v10_defense']],
  ['v11_decided',['v11_homeland','v11_charter']],
  ['v12_chosen',['v12_stay','v12_sea','v12_return']],
  ['v12_settled',['v12_ending_stay','v12_ending_sea','v12_ending_return']]
 ]){const n=choices.filter(id=>flags[id]).length;check(n<=1&&!!flags[done]===(n===1),'后五卷分支选择与结局不一致');}
 for(const id of ['stay','sea','return']){
  if(flags['v12_'+id])check(!!flags[id==='return'?'v11_charter':'v11_homeland'],'终卷去向与聚义决议不符');
  if(flags['v12_ending_'+id])check(!!flags['v12_'+id],'终卷结局与选择不符');
 }
 for(const m of models){const p=stories[m.id];if(!p)continue;
  check(visited.includes(m.map)&&meets(s,historical(m.condition)),'后五卷剧情前置');
  check(reached(m,m.start,p.step,s),'后五卷剧情步骤不可达');
  const step=m.steps[p.step],finish=(step?.choices||[]).filter(c=>c.finish);
  check(!!step&&visited.includes(step.map)&&meets(s,historical(step.condition)),'后五卷剧情步骤前置');
  if(p.status==='completed')check(finish.some(c=>meets(s,historical(c.condition))&&flagsOf(c).every(id=>flags[id])),'后五卷剧情完成标记');
  else check(!finish.some(c=>flagsOf(c).length&&flagsOf(c).every(id=>flags[id])),'后五卷已完成剧情仍在进行');
 }
 for(const [flag,rows] of sources)if(flags[flag])check(rows.some(({m,stepId,choice})=>choice.finish&&stories[m.id]?.status==='completed'&&stories[m.id].step===stepId&&meets(s,historical(choice.condition))),'后五卷剧情标记缺少完成记录');
 const battleSource=(b,live)=>{
  if(!late(b?.context?.id))return;
  const c=b.context,m=d.by.stories[c.id],mission=CHAPTER_MISSIONS[c.id],p=stories[c.id];
  check(c.type==='story'&&!!m&&!!mission&&!!p&&Object.keys(c).every(k=>['type','id','next','terrain'].includes(k)),'后五卷战役来源');
  check(c.terrain===mission.terrain&&Object.values(m.steps).some(step=>step.choices.some(choice=>choice.battle&&choice.next===c.next)),'后五卷战役后续');
  if(live)check(!b.guest&&!!s.camp&&!!b.expedition&&p.status==='active'&&m.steps[p.step].map===s.location&&meets(s,m.steps[p.step].condition)&&m.steps[p.step].choices.some(choice=>choice.battle&&choice.next===c.next&&meets(s,choice.condition)),'后五卷在途战局');
  else if(b.outcome==='victory')check(reached(m,c.next,p.step),'后五卷胜利复盘与剧情不符');
 };
 battleSource(s.battle,true);battleSource(s.lastBattle,false);
}
// Normal uploads are monotonic; only the dedicated history action may roll back.
export function lateMainlinePreserved(old,next,data){
 const a=old?.progress,b=next?.progress;if(!a)return true;
 const completeFlags=hasLateMainline(old)?(data?.chapters||[]).map(c=>c.completeFlag):[];
 if(completeFlags.some(id=>a.flags?.[id]&&b?.flags?.[id]!==true))return false;
 if(Object.entries(a.flags||{}).some(([id,value])=>isFlag(id)&&value&&b?.flags?.[id]!==true))return false;
 if((a.visited||[]).filter(late).some(id=>!Array.isArray(b?.visited)||!b.visited.includes(id)))return false;
 for(const [id,p] of Object.entries(a.stories||{}).filter(([id])=>late(id))){const q=b?.stories?.[id];if(!q)return false;if(p.status==='completed'&&(q.status!=='completed'||q.step!==p.step))return false;if(p.step!==q.step&&(!data?.by.stories[id]||!reached(data.by.stories[id],p.step,q.step)))return false;}
 return true;
}
