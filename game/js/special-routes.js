export const SPECIAL_ROUTES={ambush:{name:'侧道伏兵',enemy:'road_raider',hp:1.1,speed:1.1,bonus:'scrap_iron',amount:2,text:'增援一名绕后骑兵，全敌气血、速度提高 10%。胜利另得碎铁；注意保护后排。'},supplies:{name:'深处药箱',enemy:'snake',hp:1.2,speed:1,bonus:'herb',amount:2,text:'增援一条毒蛇（开场怒气 90），全敌气血提高 20%。胜利另得药草；备好解毒和治疗。'}};
export const routeReward=(route,tier)=>Object.hasOwn(SPECIAL_ROUTES,route)?{id:SPECIAL_ROUTES[route].bonus,count:SPECIAL_ROUTES[route].amount*tier}:null;

Object.assign(SPECIAL_ROUTES,{
 oreguard:{introduced:2,areas:['mine','minechief'],name:'封炉守卫',enemy:'guard',hp:1.15,speed:1,bonus:'iron',amount:1,text:'多一名守卫；全敌气血提高 15%，开场护阵 45%，持续 12 秒。破阵本领可提前除去护阵，强攻会被削弱。'},
 poisonbank:{introduced:2,areas:['marsh','marshnest'],name:'涉毒浅滩',enemy:'snake',hp:1.1,speed:1,bonus:'herb',amount:3,text:'多一条毒蛇；全敌气血提高 10%。涉水者开场中毒，每 2 秒损失 3% 最大气血，共 4 次；用解毒或净化应对。'},
 warbell:{introduced:2,areas:['ruins','ruinsvault'],name:'鸣钟援阵',enemy:'guard',hp:1.15,speed:1.1,bonus:'cloth',amount:2,text:'多一名守卫；全敌气血提高 15%、速度提高 10%。头目蓄势招式改为给全敌恢复 15% 气血，可打断或优先集火。'}
});
export const routeAllowed=(route,id)=>route===undefined||Object.hasOwn(SPECIAL_ROUTES,route)&&(!SPECIAL_ROUTES[route].areas||SPECIAL_ROUTES[route].areas.includes(id));
