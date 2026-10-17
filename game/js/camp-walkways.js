// Foot positions traced against the unchanged 1122 x 1402 camp painting.
// The farm has no painted gate, and the market's north side is a roof: neither
// is treated as a shortcut. Market residents use their own open courtyard.
export const CAMP_WALK_SIZE=Object.freeze({width:1122,height:1402});
export const CAMP_WALK_NODES={
 hallStairs:[558,286],hallFoot:[558,337],northRoad:[550,370],northBend:[534,414],northFork:[526,454],
 squareNorth:[552,498],squareNE:[605,537],squareEast:[624,580],squareSE:[600,626],squareSouth:[558,673],squareSW:[520,625],squareWest:[499,580],squareNW:[510,535],
 lumberRoad:[475,468],lumberStop:[430,447],barracksRoad:[683,578],barracksBend:[724,545],barracksGate:[758,510],
 southFork:[541,733],southRoad:[532,784],farmStop:[540,800],southBend:[542,837],southJunction:[571,889],
 clinicRoad:[665,912],clinicBend:[748,928],clinicOutside:[804,921],clinicGate:[811,898],
 marketCenter:[550,1100],marketNE:[590,1090],marketEast:[620,1100],marketSE:[605,1115],marketSouth:[555,1118],marketSW:[520,1117],marketWest:[505,1105],marketNW:[530,1092]
};
const HALL=['hallStairs','hallFoot','northRoad','northBend','northFork','squareNorth'];
const WEST=['squareNorth','squareNW','squareWest','squareSW','squareSouth'];
const EAST=['squareNorth','squareNE','squareEast','squareSE','squareSouth'];
const SOUTH=['squareSouth','southFork','southRoad','southBend','southJunction'];
const CLINIC=['southJunction','clinicRoad','clinicBend','clinicOutside','clinicGate'];
const LUMBER=['lumberStop','lumberRoad','northFork','squareNorth'];
const BARRACKS=['barracksGate','barracksBend','barracksRoad','squareEast'];
const join=(...parts)=>parts.flatMap((part,index)=>index?part.slice(1):part);
const roundTrip=path=>[...path,...path.slice(0,-1).reverse()];
export const CAMP_WALK_LOOPS=[
 {id:'hall-square',name:'聚义厅前阶与空场',nodes:join(HALL,WEST,[...EAST].reverse(),[...HALL].reverse())},
 {id:'lumber-farm',name:'伐木场外与田边',nodes:roundTrip(join(LUMBER,WEST,['squareSouth','southFork','southRoad','farmStop']))},
 {id:'barracks-clinic',name:'兵营南门与医馆正门',nodes:roundTrip(join(BARRACKS,['squareEast','squareSE','squareSouth'],SOUTH,CLINIC))},
 {id:'farm-clinic',name:'田边与医馆门前',nodes:roundTrip(join(['farmStop','southRoad','southBend','southJunction'],CLINIC))},
 {id:'clinic-hall',name:'医馆门前与聚义厅前阶',nodes:roundTrip(join([...CLINIC].reverse(),[...SOUTH].reverse(),[...WEST].reverse(),[...HALL].reverse()))},
 {id:'market-courtyard',name:'集市内院',nodes:['marketCenter','marketNE','marketEast','marketSE','marketSouth','marketSW','marketWest','marketNW','marketCenter']}
];
export const CAMP_WALK_STOPS=new Set(['hallStairs','lumberStop','barracksGate','farmStop','clinicGate','marketNE','marketSW']);
export function campWalkPaths(){return CAMP_WALK_LOOPS.map(loop=>({...loop,points:loop.nodes.map(id=>({id,x:CAMP_WALK_NODES[id][0],y:CAMP_WALK_NODES[id][1],stop:CAMP_WALK_STOPS.has(id)}))}));}
