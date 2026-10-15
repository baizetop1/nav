import {REVISIT_FLAGS,revisitGoal} from './region-revisit-data.js?v=0.88.0';
export const FOREST_NODES={
 post:{name:'古道茶棚',links:['fork','ridge'],text:'茶棚的桌子翻在路边。一个瘦小汉子蹲在车辙旁，手里捏着半截断绳。',purpose:'结识时迁，查找商队失货；办妥后可邀他回寨。'},
 fork:{name:'运货岔路',links:['post','watch'],text:'两辆空车堵在岔口。劫道的人把货拆散，沿林间小路背走了。',purpose:'可重复挑战。皮革、布匹、山藤和轻装兵器分别判定掉落。',battle:'forest'},
 watch:{name:'松林哨台',links:['fork','camp'],text:'树上挂着一口小铜铃，铃绳一直拖进林子。时迁绕着树看了两圈，没有贸然去碰。',purpose:'清出岔路或哨台后，与时迁查探铃绳，找出营后小径。',battle:'forest',route:'ambush'},
 ridge:{name:'老藤坡',links:['post','trail'],text:'坡上的老藤缠成一片。几根新砍的藤条还搁在石头上，断口没有干。',purpose:'清出道路后标记采藤点；山藤可打造斥候短褐、搭建客舍。'},
 trail:{name:'林后小径',links:['ridge','camp'],text:'货箱在土里拖出一条深沟。铃绳藏在落叶下，轻轻一绊，营里就会听见。',purpose:'可用山藤固定铃舌，从营后潜入；也可以直接攻营。'},
 camp:{name:'藏货营地',links:['watch','trail'],text:'头目坐在货箱上点账，传令哨守在他身后。营外的铜铃一响，弓手便会按号齐射。',purpose:'击败头目取回商队货物；此后仍可重复搜寻装备。',battle:'forestcamp'}
};
export const FOREST_FLAGS=[...REVISIT_FLAGS,'met','won_fork','won_watch','scouted','tended','sabotaged','won_camp','cargo','invited'];
export const forestHas=(s,id)=>!!s?.exploration?.forest?.flags.includes(id);
export function forestGate(s,id){if(!Object.hasOwn(FOREST_NODES,id))return '没有这个地点。';if(!s.camp)return '先建立寨子。';if(['trail','camp'].includes(id)&&!forestHas(s,'scouted'))return '先与时迁相识，清出道路，再去松林哨台查探。';return '';}
export function forestLinks(s,id){return [...(FOREST_NODES[id]?.links||[]),...(forestHas(s,'scouted')?(id==='post'?['trail']:id==='trail'?['post']:[]):[])];}
export const forestRoute=(id,approach='frontal')=>id==='camp'&&approach==='crossfire'?'crossfire':id==='camp'&&approach==='quiet'?'cutbell':FOREST_NODES[id]?.route;
export function forestGoal(s){const has=k=>forestHas(s,k);
 if(!has('met'))return {node:'post',text:'茶棚边有人查看车辙，先跟他聊聊。'};
 if(!has('won_fork')&&!has('won_watch'))return {node:'fork',text:'替时迁清出运货岔路，再去哨台查探。'};
 if(!has('scouted'))return {node:'watch',text:'去松林哨台查探，找出营后的路。'};
 if(!has('tended'))return {node:'ridge',text:'老藤坡可取山藤、标记采集点。山藤还能固定警铃。'};
 if(!has('won_camp'))return {node:has('sabotaged')?'camp':'trail',text:has('sabotaged')?'警铃已拆，可从后路潜入藏货营地。':'去林后小径拆铃，或直接挑战藏货营地。'};
 if(!has('cargo'))return {node:'camp',text:'货箱还在营里。取回货物，再去茶棚会合。'};
 if(!has('invited'))return {node:'post',text:'商队已回茶棚。去见时迁，邀他回寨。'};
 const revisit=revisitGoal(s,'forest');if(revisit)return revisit;
 return {node:'ridge',text:'货路已通。山藤可做短褐，时迁在客舍能帮忙省料。',label:'查看斥候短褐',command:{type:'ui_regionalRecipe',id:'forest'}};
}
