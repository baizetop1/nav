import {SEVENTH_MISSIONS,hasSeventhVolume} from './volume-seven-data.js?v=0.68.0';
import {meets} from './map.js?v=0.68.0';
const seventh=id=>typeof id==='string'&&id.startsWith('v7_');
const isFlag=id=>seventh(id)||id==='volume_seven_complete';
const historicalCondition=c=>!c?null:Object.fromEntries(Object.entries(c).filter(([key])=>key!=='notFlag').map(([key,value])=>[key,['all','any'].includes(key)?value.map(historicalCondition):value]));
const flagsOf=choice=>(choice.effects||[]).filter(e=>e.type==='flag').map(e=>e.id);
const reached=(model,from,to)=>{const pending=[from],seen=new Set();while(pending.length){const id=pending.shift();if(id===to)return true;if(seen.has(id))continue;seen.add(id);for(const c of model.steps[id]?.choices||[])if(c.next)pending.push(c.next);}return false;};
export function validateSeventhVolume(s,d,check){
 const flags=s.progress.flags,stories=s.progress.stories,chapter=d.chapters.find(c=>c.id==='volume_seven'),models=d.stories.filter(m=>seventh(m.id));
 const sources=new Map();for(const m of models)for(const step of Object.values(m.steps))for(const choice of step.choices||[])for(const flag of flagsOf(choice)){if(!sources.has(flag))sources.set(flag,[]);sources.get(flag).push({m,choice});}
 for(const id of Object.keys(flags).filter(seventh))check(sources.has(id),'第七卷未知剧情标记');
 if(!hasSeventhVolume(s)&&!seventh(s.location))return;
 check(!!chapter&&!!flags.volume_six_complete,'第七卷须完成高唐救援');
 const route=['v7_hook','v7_trench'].filter(id=>flags[id]);check(route.length<=1&&!!flags.v7_prepared===(route.length===1),'第七卷破阵选择');
 for(const m of models){const p=stories[m.id];if(!p)continue;
  check(s.progress.visited.includes(m.map)&&meets(s,historicalCondition(m.condition)),'第七卷剧情前置');
  check(reached(m,m.start,p.step),'第七卷剧情步骤不可达');
  const finish=(m.steps[p.step]?.choices||[]).filter(c=>c.finish);
  if(p.status==='completed')check(finish.some(c=>flagsOf(c).every(id=>flags[id])),'第七卷剧情完成标记');
  else check(!finish.some(c=>flagsOf(c).length&&flagsOf(c).every(id=>flags[id])),'第七卷已完成剧情仍在进行');
 }
 for(const [flag,rows] of sources)if(flags[flag])check(rows.some(({m,choice})=>stories[m.id]?.status==='completed'&&(m.steps[stories[m.id].step]?.choices||[]).includes(choice)),'第七卷剧情标记缺少完成记录');
 if(flags.volume_seven_complete)check(meets(s,chapter.condition)&&chapter.requirements.every(r=>meets(s,r.condition)),'第七卷结卷条件');
 const battleSource=(b,live)=>{
  if(!seventh(b?.context?.id))return;
  const c=b.context,m=d.by.stories[c.id],mission=SEVENTH_MISSIONS[c.id],p=stories[c.id];
  check(c.type==='story'&&!!m&&!!mission&&!!p&&Object.keys(c).every(k=>['type','id','next','terrain'].includes(k)),'第七卷战役来源');
  check(c.terrain===mission.terrain&&Object.values(m.steps).some(step=>step.choices.some(choice=>choice.battle&&choice.next===c.next)),'第七卷战役后续');
  if(live){check(!b.guest&&!!s.camp&&!!b.expedition&&p.status==='active'&&m.steps[p.step].map===s.location&&meets(s,m.steps[p.step].condition)&&m.steps[p.step].choices.some(choice=>choice.battle&&choice.next===c.next),'第七卷在途战局');}
  else if(b.outcome==='victory')check(reached(m,c.next,p.step),'第七卷胜利复盘与剧情不符');
 };
 battleSource(s.battle,true);battleSource(s.lastBattle,false);
}
// Ordinary uploads only move chapter progress forward. Explicit history rollback is separate.
export function seventhVolumePreserved(old,next,data){
 const a=old?.progress,b=next?.progress;if(!a)return true;
 if(Object.entries(a.flags||{}).some(([id,value])=>isFlag(id)&&value&&b?.flags?.[id]!==true))return false;
 if((a.visited||[]).filter(seventh).some(id=>!Array.isArray(b?.visited)||!b.visited.includes(id)))return false;
 for(const [id,p] of Object.entries(a.stories||{}).filter(([id])=>seventh(id))){const q=b?.stories?.[id];if(!q)return false;if(p.status==='completed'&&(q.status!=='completed'||q.step!==p.step))return false;if(p.step!==q.step&&(!data?.by.stories[id]||!reached(data.by.stories[id],p.step,q.step)))return false;}
 return true;
}
