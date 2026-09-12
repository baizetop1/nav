export const EQUIPMENT_SETS=[
  {id:'guard',name:'守寨装',items:['cloth_armor','felt_cap','leather_belt'],two:{defense:.08},three:{hp:.10},text:'两件防御 +8%；三件再加气血 +10%。'},
  {id:'hunter',name:'游猎装',items:['short_bow','leather_armor','swift_boots'],two:{speed:.08},three:{attack:.10},text:'两件速度 +8%；三件再加攻击 +10%。'},
  {id:'breaker',name:'破阵装',items:['long_spear','iron_helmet','chain_armor'],two:{attack:.08},three:{defense:.10},text:'两件攻击 +8%；三件再加防御 +10%。'},
  {id:'sage',name:'筹谋装',items:['oak_staff','tactics_book','cloth_belt'],two:{strategy:.10},three:{hp:.10},text:'两件谋略 +10%；三件再加气血 +10%。'}
];
export function equippedSets(s,id){const items=new Set(s.equipment.filter(e=>e.hero===id).map(e=>e.item));return EQUIPMENT_SETS.map(set=>({...set,count:set.items.filter(id=>items.has(id)).length}));}
export function applySets(s,id,attributes){for(const set of equippedSets(s,id))for(const bonus of [set.count>=2?set.two:{},set.count>=3?set.three:{}])for(const [k,v] of Object.entries(bonus))attributes[k]=Math.round(attributes[k]*(1+v));}
