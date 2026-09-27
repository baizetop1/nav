const regions=['forest','water','mountain'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,keys)=>object(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const choice=c=>c==='shelter'||c==='watch';
const sameJob=(a,b)=>a&&b&&a.kind===b.kind&&a.region===b.region&&(a.kind==='story'?a.chapter===b.chapter&&a.choice===b.choice:a.rank===b.rank);
const snapshot=x=>object(x)&&regions.includes(x.region)&&(x.kind==='story'?exact(x,['kind','region','chapter','choice'])&&integer(x.chapter,0,2)&&choice(x.choice):x.kind==='patrol'&&exact(x,['kind','region','rank'])&&integer(x.rank,1,8));
export const hasChronicle=s=>s.realm?.journey?.chronicle!==undefined||s.realm?.trek?.journey?.chronicle!==undefined||s.battle?.journey?.chronicle!==undefined;

export function validateChronicle(s,check){
  const record=s.realm?.journey?.chronicle,run=s.realm?.trek?.journey,battle=s.battle?.journey;
  const runJob=run?.chronicle,battleJob=battle?.chronicle;
  if(record===undefined){check(runJob===undefined&&battleJob===undefined,'路线篇章缺少记录');return;}
  check(exact(record,['version','routes','active'])&&record.version===1&&exact(record.routes,regions),'路线篇章记录');
  for(const region of regions){
    const route=record.routes[region];
    check(exact(route,['choices','patrol','forged'])&&Array.isArray(route.choices)&&route.choices.length<=3&&Array.from(route.choices).every(choice)&&integer(route.patrol,0,8)&&integer(route.forged,0,3),'路线篇章营建');
    check(!route.choices.length||(s.camp?.buildings.hall>=route.choices.length+1&&(s.realm.journey.best[region]||0)>=route.choices.length),'路线篇章营建条件');
    check((!route.patrol&&!route.forged||route.choices.length===3)&&route.patrol>=route.forged*2,'路线巡防与锻造');
  }
  const active=record.active;
  if(active!==null){
    check(object(active)&&regions.includes(active.region)&&['story','patrol'].includes(active.kind),'路线篇章目标');
    const route=record.routes[active.region];
    if(active.kind==='story'){
      check(exact(active,['kind','region','chapter','choice','ready'])&&integer(active.chapter,0,2)&&active.chapter===route.choices.length&&choice(active.choice)&&typeof active.ready==='boolean','路线篇章抉择');
      check(s.camp?.buildings.hall>=active.chapter+2&&(!active.ready||(s.realm.journey.best[active.region]||0)>=active.chapter+1),'路线篇章完成条件');
    }else check(exact(active,['kind','region','rank'])&&route.choices.length===3&&integer(active.rank,1,8)&&active.rank<=route.patrol+1,'路线巡防阶次');
  }
  const eligible=!!(active&&run&&run.region===active.region&&run.tier>=(active.kind==='story'?active.chapter+1:3)&&(active.kind!=='story'||!active.ready));
  check((runJob!==undefined)===eligible,'路线篇章行程绑定');
  if(runJob!==undefined)check(snapshot(runJob)&&sameJob(active,runJob),'路线篇章行程目标');
  if(battle){
    check((battleJob!==undefined)===(runJob!==undefined),'路线篇章战局绑定');
    if(battleJob!==undefined)check(snapshot(battleJob)&&sameJob(runJob,battleJob),'路线篇章战局目标');
  }else check(battleJob===undefined,'路线篇章战局缺少行程');
}

// An ordinary upload may advance, finish or cancel a job, but cannot erase earned route progress.
export function chroniclePreserved(oldState,nextState){
  const old=oldState.realm?.journey?.chronicle,next=nextState?.realm?.journey?.chronicle;
  if(old===undefined)return true;
  if(!object(next)||next.version!==1||!object(next.routes))return false;
  for(const region of regions){
    const before=old.routes[region],after=next.routes[region];
    if(!object(after)||!Array.isArray(after.choices)||after.choices.length<before.choices.length||before.choices.some((c,i)=>after.choices[i]!==c)||!(after.patrol>=before.patrol)||!(after.forged>=before.forged))return false;
  }
  return true;
}
