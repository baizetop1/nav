export const RESOURCE_ROUTES=[
  {id:'silver',name:'商路护镖',resource:true,resourceKey:'silver',resourceName:'碎银',days:[0,1,2,3,4,5,6],enemies:['road_raider','bandit'],amounts:[300,700,1400],use:'碎银用于营建、募兵和集市采购。'},
  {id:'grain',name:'粮车接应',resource:true,resourceKey:'food',resourceName:'粮草',days:[0,1,2,3,4,5,6],enemies:['bandit','soldier'],amounts:[60,140,280],use:'粮草直接送入寨仓，用于募兵、治疗伤兵与出征。'},
  {id:'timber',name:'林场清匪',resource:true,resourceKey:'wood',resourceName:'木材',days:[0,1,2,3,4,5,6],enemies:['bandit','guard'],amounts:[40,95,190],use:'木材直接送入寨仓，用于修建、扩建设施与工坊加工。'},
  {id:'herbs',name:'药圃驱寇',resource:true,resourceKey:'herb',resourceName:'药草',days:[0,1,2,3,4,5,6],enemies:['bandit','bandit_chief'],amounts:[6,14,28],use:'药草收进行囊，可到药铺制药，补充交战消耗。'},
];
// One fixed reward table is shared by battle settlement, previews and sweeps.
export function resourceReward(id,tier){
  const route=RESOURCE_ROUTES.find(r=>r.id===id);
  if(!route||!Number.isInteger(tier)||tier<1||tier>3)return null;
  const amount=route.amounts[tier-1];
  return route.resourceKey==='herb'?{items:{herb:amount}}:{[route.resourceKey]:amount};
}
