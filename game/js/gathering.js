import {marshHas} from './marsh-data.js?v=0.69.0';
import {regionBuilt} from './exploration-data.js?v=0.69.0';
import {GATHERING_REGIONS,REGIONAL_RECIPES,historicGathering,gatheringProgress} from './gathering-data.js?v=0.69.0';
import {IDLE_ROUTES,idleUnlocked} from './idle-data.js?v=0.69.0';
import {RECIPES} from './provisions.js?v=0.69.0';
import {pay,grant,newEquipment} from './item.js?v=0.69.0';
import {requireRule,count,journal} from './utils.js?v=0.69.0';
export function ensureGathering(s){return s.gathering??={version:1,regions:Object.fromEntries(Object.keys(GATHERING_REGIONS).map(id=>[id,historicGathering(s,id)]))};}
// Call before the original clear counter changes, so the first new clear is counted once.
export function recordGatheringClear(s,id,tier){
 if(!Object.hasOwn(GATHERING_REGIONS,id))return;
 const x=ensureGathering(s),p=x.regions[id],old={...p};p.runs=Math.min(3,p.runs+1);p.best=Math.max(p.best,tier);
 const route=IDLE_ROUTES[id].name;
 if(old.runs<3&&p.runs===3)journal(s,'【发现采集点】'+route+' · '+GATHERING_REGIONS[id].site+'，特产每批增加 1 份。');
 if(old.best<2&&p.best>=2)journal(s,'【探明采集路】'+route+'的险路已走通，派遣每批主要原料增加 1 份。');
}
export function regionalQuote(s,d,id){
 const original=Object.hasOwn(REGIONAL_RECIPES,id)?REGIONAL_RECIPES[id]:null;
 const r=original?{...original,items:{...original.items},silver:original.kind==='equipment'&&regionBuilt(s,'forge')?Math.floor(original.silver*.8):original.silver}:null;
 if(r?.kind==='item'&&regionBuilt(s,'clinic')&&r.items.herb)r.items.herb=Math.max(0,r.items.herb-1);
 if(id==='marsh'&&r&&regionBuilt(s,'clinic')&&marshHas(s,'invited'))r.items.marsh_orchid--;
 if(!r)return {reason:'没有这张地区配方。'};
 const model=(r.kind==='equipment'?d.by.equipments:d.by.items)[r.output],counter=r.kind==='item'?'craft_'+r.output:'regional_craft_'+id,used=s.daily.counters[counter]||0,limit=r.kind==='item'?Math.min(r.limit,RECIPES[r.output].limit):r.limit;
 const missing=Object.entries(r.items).filter(([k,n])=>(s.inventory[k]||0)<n).map(([k,n])=>({id:k,count:n-(s.inventory[k]||0)}));
 const reason=!s.camp?'先建立寨子。':s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run?'先结束当前交战或远征。':!idleUnlocked(s,id)?'先通关'+IDLE_ROUTES[id].name+'，带回当地配方。':s.camp.buildings[r.building]<2?({market:'集市',clinic:'医馆'}[r.building])+'需要 2 级。':used>=limit?'今日加工次数已用完。':r.kind==='equipment'&&(s.equipment.length>=200||s.nextEquipment>=10000000)?'请先整理装备，留出一个空位。':r.kind==='item'&&(s.inventory[r.output]||0)+r.count>10000000?'成品库存已满。':s.player.silver<r.silver?'还缺碎银 '+(r.silver-s.player.silver)+'。':missing.length?'还缺'+missing.map(v=>d.by.items[v.id].name+' '+v.count).join('、')+'。':'';
 return {recipe:r,model,counter,used,limit,missing,reason};
}
export function regionalCraft(s,d,a){
 const q=regionalQuote(s,d,a.id);requireRule(!q.reason,q.reason);const r=q.recipe;
 ensureGathering(s);pay(s,{silver:r.silver,items:r.items});
 if(r.kind==='equipment')newEquipment(s,r.output);else grant(s,{items:{[r.output]:r.count}},d);
 count(s,q.counter);journal(s,'【地区加工】'+q.model.name+' ×'+r.count+'已收好。');
}
