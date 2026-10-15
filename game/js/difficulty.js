import {CHAPTER_MISSIONS} from './volume-three-data.js?v=0.88.0';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS} from './special-dungeons-data.js?v=0.88.0';
import {RESOURCE_ROUTES} from './resource-dungeons-data.js?v=0.88.0';
import {POSTS} from './frontier-data.js?v=0.88.0';
import {ELITES} from './elites.js?v=0.88.0';
import {JOURNEY_TIERS} from './journey-data.js?v=0.88.0';
import {REGIONS} from './realm-data.js?v=0.88.0';

// Fixed encounter levels: a player's upgrades never raise a previously visited enemy.
// Endurance, striking power and armor grow separately; speed stays readable.
export const DIFFICULTY_PROFILES={
 resource:{name:'资源',hp:.70,attack:.60,defense:.75,speed:1},
 daily:{name:'历练',hp:1,attack:.82,defense:1,speed:1.02},
 story:{name:'主线',hp:1.05,attack:.82,defense:1,speed:1.02},
 special:{name:'探索',hp:.75,attack:.92,defense:1.10,speed:1.04},
 weekly:{name:'周本',hp:1.45,attack:1.15,defense:1.20,speed:1.08},
 challenge:{name:'挑战',hp:1.60,attack:1.25,defense:1.25,speed:1.10},
 camp:{name:'寨务',hp:.85,attack:.75,defense:.85,speed:1},
 frontier:{name:'据点',hp:1,attack:.82,defense:1.05,speed:1.02},
 journey:{name:'游历',hp:1,attack:.82,defense:1,speed:1.03}
};
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
export function difficultyCurve(level=1){
 const x=limit(Number.isFinite(level)?level:1,1,40)-1;
 return {hp:1+.12*x+.003*x*x,attack:1+.065*x+.0012*x*x,defense:1+.04*x+.0005*x*x,strategy:1+.075*x+.0012*x*x,speed:1+Math.min(.18,x*.0045)};
}
function stage(state,data,c,scale){
 const id=c?.id||'',kind=c?.kind,tier=c?.tier||1;
 if(c?.type==='story'||c?.type==='replay'){
  const m=CHAPTER_MISSIONS[id.replace(/^echo_/,'')];if(!m)return null;
  return {family:id.replace(/^echo_/,'')==='v3_veteran'?'challenge':'story',level:m.level,baseScale:m.scale,quality:m.level>=30?2:m.level>=15?1:0};
 }
 if(c?.type==='dungeon'){const m=data.by.dungeons[id];return m?{family:id==='immortal_trial'?'challenge':'daily',level:m.level,baseScale:m.scale,quality:id==='immortal_trial'?1:m.level>=30?2:m.level>=15?1:0}:null;}
 if(c?.type==='rotation'){
  const weekly=kind==='weekly',resource=RESOURCE_ROUTES.some(r=>r.id===id);
  return {family:weekly?'weekly':resource?'resource':'daily',level:weekly?5+tier*5:(tier-1)*10+1,baseScale:weekly?.8+tier*.7:.55+(tier-1)*1.2,quality:weekly?(tier>=4?2:tier>=2?1:0):(tier===3?1:0)};
 }
 if(c?.type==='special'){const t=SPECIAL_TIERS[tier],m=SPECIAL_DUNGEONS[id];return t&&m?{family:'special',level:m.level??t.level,baseScale:m.scale??t.scale,quality:tier>1?1:0,boss:!!m.parent||!!m.companion}:null;}
 if(c?.type==='elite'){const m=ELITES[id];return m?{family:kind==='hard'?'challenge':'weekly',level:m.level,baseScale:m.scale,quality:m.level>=30?2:1,boss:true}:null;}
 if(c?.type==='frontier'){const m=POSTS[id];return m?{family:'frontier',level:m.level,baseScale:m.scale,quality:m.level>=15?1:0}:null;}
 if(c?.type==='camp'){
  const m=({woods:[1,.7],convoy:[8,1],fort:[15,1.4],grain_escort:[5,.9],grain_scout:[8,1],grain_assault:[10,1.5]})[id];
  return m?{family:'camp',level:m[0],baseScale:m[1],quality:0}:null;
 }
 if(c?.type==='realm'){
  if(kind==='challenge'){const quality=[0,1,1,2,2][tier-1];return {family:'challenge',level:[15,20,25,30,35][tier-1],baseScale:1+tier*.7,quality,recommendedQuality:id==='mortal'?0:quality};}
  if(kind==='trek'){
   const j=state.realm?.trek?.journey,t=JOURNEY_TIERS[j?.tier];
   if(t)return {family:'journey',level:t.level,baseScale:t.scale,quality:j.tier-1};
   return {family:'journey',level:10+(tier-1)*2,baseScale:1.1+(tier-1)*.2,quality:0};
  }
  if(kind==='defense'||kind==='relay')return {family:'journey',level:15+(tier-1)*3,baseScale:.9+(tier-1)*.4,quality:1};
  if(kind==='squad')return {family:'camp',level:id==='scout'?12:8,baseScale:id==='scout'?1.2:1,quality:0};
  // Personal lessons keep their task-specific healing and damage requirements.
  if(kind==='personal')return null;
  const r=REGIONS[id];return r?{family:'camp',level:({yuncheng:5,jingyang:12,dongxi:20})[id],baseScale:r.scale,quality:id==='dongxi'?1:0}:null;
 }
 return null;
}
export function difficultyQuote(state,data,context,scale=1,{guest=false}={}){
 const m=guest||context?.type==='lesson'?null:stage(state,data,context,scale);
 if(!m)return {version:0,family:'legacy',level:0,quality:0,multipliers:{hp:scale,attack:scale,defense:scale,strategy:scale,speed:1}};
 const profile=m.family==='special'&&context.tier===1?{...DIFFICULTY_PROFILES.special,hp:m.boss?.18:.20,attack:.55,defense:.80,speed:1}:DIFFICULTY_PROFILES[m.family],curve=difficultyCurve(m.level),quality=1+[0,.10,.24][m.quality||0];
 const modifier=limit(scale/Math.max(.01,m.baseScale||scale),.45,2.5),boss=m.boss?1.10:1;
 const multipliers={hp:curve.hp*profile.hp*quality*modifier*boss,attack:curve.attack*profile.attack*quality*modifier*boss,defense:curve.defense*profile.defense*quality*modifier,strategy:curve.strategy*profile.attack*quality*modifier*boss,speed:curve.speed*profile.speed};
 return {version:1,...m,name:profile.name,quality:m.quality||0,multipliers,modifier};
}
export function difficultyAttributes(attribute,quote){return Object.fromEntries(Object.entries(attribute).map(([key,n])=>[key,Math.max(1,Math.round(n*(quote.multipliers[key]||1)))]));}
export function difficultyLabel(quote){return quote.version?'建议 '+quote.level+' 级 · '+['凡品','灵品','仙品'][quote.recommendedQuality??quote.quality]+' · '+quote.name:'剧情教习';}
