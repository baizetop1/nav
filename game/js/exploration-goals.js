import {CROSS_STORY,crossStep,crossHas,crossPrerequisite,crossAvailable,crossCommand} from './cross-region-data.js?v=0.82.2';
import {revisitSpec,revisitHas} from './region-revisit-data.js?v=0.82.2';
import {EXPLORATION_REGIONS,REGION_NODES,REGION_CONTACTS,EXPLORATION_HERO_REGIONS,REGION_BUILDINGS,activeRegion,regionState,regionHas,regionBuilt,mineGoal} from './exploration-data.js?v=0.82.2';
import {marshGoal,MARSH_NODES} from './marsh-data.js?v=0.82.2';
import {ruinsGoal,RUINS_NODES} from './ruins-data.js?v=0.82.2';
import {forestGoal,FOREST_NODES} from './forest-data.js?v=0.82.2';
import {waterGoal,WATER_NODES} from './water-data.js?v=0.82.2';
import {mountainGoal,MOUNTAIN_NODES} from './mountain-data.js?v=0.82.2';
import {GATHERING_REGIONS,REGIONAL_RECIPES} from './gathering-data.js?v=0.82.2';
import {regionalQuote} from './gathering.js?v=0.82.2';
import {idleUnlocked} from './idle-data.js?v=0.82.2';
export const EXPLORATION_GOAL_KINDS={invite:'邀好汉',regional:'备装备药品',regionBuild:'扩建寨子',crossRegion:'故人共事'};
export const explorerGoal=g=>!!g&&typeof g.kind==='string'&&Object.hasOwn(EXPLORATION_GOAL_KINDS,g.kind);
export function validExplorerGoal(g){return explorerGoal(g)&&typeof g.id==='string'&&(g.kind==='crossRegion'?g.id===CROSS_STORY.id:g.kind==='invite'?Object.hasOwn(EXPLORATION_HERO_REGIONS,g.id):Object.hasOwn(g.kind==='regional'?REGIONAL_RECIPES:REGION_BUILDINGS,g.id));}
const NODES={mine:REGION_NODES,marsh:MARSH_NODES,ruins:RUINS_NODES,forest:FOREST_NODES,water:WATER_NODES,mountain:MOUNTAIN_NODES};
export const regionGoalCommand=(region,node)=>({type:'ui_regionOpen',region,...(node?{node}:{})});
export const validRegionNode=(region,node)=>Object.hasOwn(NODES[region]||{},node);
export function explorationResume(s,region=activeRegion(s),local=false){
 if(!local&&crossAvailable(s)&&!crossHas(s,'delivered')){const g=crossStep(s);return {...g,region:g.region||'marsh',name:CROSS_STORY.name,place:g.place,text:g.text,label:crossHas(s,'accepted')?'继续护药':'查看药船消息',command:crossCommand()};}
 if(!Object.hasOwn(EXPLORATION_REGIONS,region))region='mine';
 if(s.camp&&!Object.values(s.heroes).some(h=>h.status==='owned'&&h.level>=5))return {region,name:EXPLORATION_REGIONS[region],place:'出行准备',text:'探索需要一位 5 级好汉。先走一段主线，或到好汉页用经验丹培养。',label:'继续主线',command:{type:'ui_storyResume'}};
 const g=({mine:mineGoal,marsh:marshGoal,ruins:ruinsGoal,forest:forestGoal,water:waterGoal,mountain:mountainGoal})[region](s),x=regionState(s,region);
 return {...g,region,name:EXPLORATION_REGIONS[region],place:NODES[region][x?.position]?.name||'尚未进入',label:g.label||'继续探索',command:g.command||regionGoalCommand(region,g.node)};
}
export function explorerChoices(d,kind){
 if(kind==='crossRegion')return [{id:CROSS_STORY.id,name:CROSS_STORY.name+' · 安道全、时迁、阮小七'}];
 if(kind==='invite')return Object.entries(EXPLORATION_HERO_REGIONS).map(([id,region])=>({id,name:d.by.heroes[id].name+' · '+EXPLORATION_REGIONS[region]}));
 if(kind==='regional')return Object.entries(REGIONAL_RECIPES).map(([id,r])=>({id,name:(r.kind==='equipment'?d.by.equipments:d.by.items)[r.output].name}));
 return Object.entries(REGION_BUILDINGS).map(([id,b])=>({id,name:b.name}));
}
const firstFight={mine:'rail',marsh:'reeds',ruins:'court',forest:'fork',water:'shoal',mountain:'slope'};
export function explorationMaterialSource(s,id){return {label:'查看来源',command:{type:'ui_sources',id}};}

export function explorationGoalQuote(s,d,g=s.development?.goal){
 if(!validExplorerGoal(g))return null;
 const steps=[],step=(done,text,label,command,extra={})=>steps.push({done:!!done,text,label,command,...extra});
 const campCommand={type:'ui_section',view:'camp',id:'buildings'},picker={type:'ui_section',view:'camp',id:'exploreGoals'};
 step(s.camp,'先在山脚建起寨子。','前往寨子',{type:'ui_section',view:'camp',id:'home'});
 let name,note,completeLabel,completeCommand,done=false;
 const material=(id,needed)=>{if(!needed)return;const stock=id==='silver'?s.player.silver:id==='campWood'?s.camp?.wood||0:s.inventory[id]||0,label=id==='silver'?'碎银':id==='campWood'?'营建木材':d.by.items[id].name,source=explorationMaterialSource(s,id);step(stock>=needed,label+' '+stock+'/'+needed+(stock<needed?'，还差 '+(needed-stock):'，已备齐'),source.label,{...source.command,amount:needed},{material:id,stock,needed});};
 if(g.kind==='crossRegion'){
  name=CROSS_STORY.name;note='三地重访后可接下。首通谢礼只领一次；护药路线与每日行药会留下。';done=crossHas(s,'delivered');
  for(const [region,label]of Object.entries(CROSS_STORY.regions)){const next=explorationResume(s,region,true);step(s.exploration?.[region]?.flags.includes('return_paid'),'办妥'+label+'的故人重访',next.label,next.command);}
  const next=crossStep(s);step(done,next.text,done?'回寨配药':'查看共事',crossCommand());completeLabel='回寨配药';completeCommand=crossCommand();
 }else if(g.kind==='invite'){
  const region=EXPLORATION_HERO_REGIONS[g.id],next=explorationResume(s,region,true);name='邀请'+d.by.heroes[g.id].name;note='办完当地委托即可邀请，不消耗招贤令。已通过其他途径入寨也算完成。';done=s.heroes[g.id].status==='owned';
  step(done,done?d.by.heroes[g.id].name+'已经入寨。':next.text,next.label,next.command);completeLabel='查看好汉';completeCommand={type:'ui_section',view:'heroes',id:'profile',hero:g.id};
 }else if(g.kind==='regional'){
  const q=regionalQuote(s,d,g.id),r=q.recipe;name='备齐'+q.model.name;note=r.use+' 已持有也算完成；材料清单按当前营建减耗计算。';done=r.kind==='equipment'?s.equipment.some(e=>e.item===r.output):(s.inventory[r.output]||0)>=r.count;
  if(!done){step(idleUnlocked(s,g.id),'通关'+EXPLORATION_REGIONS[g.id]+'，取得当地配方。','前往地区',regionGoalCommand(g.id,firstFight[g.id]));step((s.camp?.buildings[r.building]||0)>=2,({market:'集市',clinic:'医馆'}[r.building])+'升到 2 级。','营建设施',campCommand);material('silver',r.silver);for(const [id,n]of Object.entries(r.items))material(id,n);step(false,q.reason&&!q.missing.length?q.reason:'材料齐了，到军需加工做一份。','查看配方',{type:'ui_regionalRecipe',id:g.id});}
  completeLabel=r.kind==='equipment'?'去穿戴':'查看补给';completeCommand=r.kind==='equipment'?{type:'ui_gearModel',id:r.output}:{type:'ui_section',view:'bag',id:'supplies'};
 }else{
  const b=REGION_BUILDINGS[g.id];name='扩建'+b.name;note=b.text;done=regionBuilt(s,g.id);
  if(!done){step((s.camp?.buildings.hall||0)>=2,'聚义厅升到 2 级。','营建设施',campCommand);material('silver',b.silver);material('campWood',b.wood);for(const [id,n]of Object.entries(b.items))material(id,n);step(false,'材料齐了，回寨动工。','前往营建',{type:'ui_section',view:'camp',id:'exploration',building:g.id});}
  completeLabel='查看营建';completeCommand={type:'ui_section',view:'camp',id:'exploration',building:g.id};
 }
 if(done)for(const row of steps)row.done=true;
 return {explore:true,name,note,done,steps,next:done?{text:'目标已完成。',label:completeLabel,command:completeCommand}:steps.find(r=>!r.done),completeLabel,completeCommand,picker};
}
