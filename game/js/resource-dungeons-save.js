import {RESOURCE_ROUTES} from './resource-dungeons-data.js?v=0.54.0';
const ids=RESOURCE_ROUTES.map(route=>route.id);
const resourceContext=context=>context?.type==='rotation'&&context.kind==='daily'&&ids.includes(context.id);
// Existing materials and empty campaign records remain compatible with older workers.
export const hasResourceDungeons=s=>ids.some(id=>Object.hasOwn(s.campaign?.daily?.uses||{},id)||[1,2,3].some(tier=>Object.hasOwn(s.campaign?.mastery||{},id+'_'+tier)))||resourceContext(s.battle?.context)||resourceContext(s.lastBattle?.context);

// Ordinary uploads preserve earned mastery and paid attempts; history rollback has its own endpoint.
export function resourceDungeonsPreserved(oldState,nextState){
 const before=oldState?.campaign,after=nextState?.campaign,object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 if(!before||!hasResourceDungeons(oldState))return true;
 if(!object(after)||after.version!==1||!object(after.daily)||!object(after.daily.uses)||typeof after.daily.date!=='string'||after.daily.date<before.daily.date)return false;
 for(const id of ids){
  for(const tier of [1,2,3]){const key=id+'_'+tier,n=before.mastery?.[key]||0;if(n&&(!Number.isSafeInteger(after.mastery?.[key])||after.mastery[key]<n))return false;}
  if(after.daily.date===before.daily.date){const n=after.daily.uses[id]??0;if(!Number.isSafeInteger(n)||n<(before.daily.uses[id]||0))return false;}
 }
 return true;
}