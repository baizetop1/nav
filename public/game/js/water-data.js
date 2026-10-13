import {REVISIT_FLAGS,revisitGoal} from './region-revisit-data.js?v=0.83.0';
export const WATER_NODES={
 dock:{name:'渡口鱼棚',links:['shoal','reeds'],text:'鱼棚里只剩半篓小鱼。阮小七坐在船头补网，望着对岸几条没升篷的船。',purpose:'与阮小七相识，救回船户后可邀他入寨。'},
 shoal:{name:'芦岸浅滩',links:['dock','bend'],text:'几名水匪把小船拖上浅滩，拦着上岸的人收钱。水边散落着拆开的包袱。',purpose:'可重复挑战，搜寻苇丝、布匹、药草和水行装备。',battle:'water'},
 bend:{name:'回水湾',links:['shoal','fort'],text:'水流到了这里打转。阮小七看了看漂来的苇叶，用船篙试着水底。',purpose:'清出浅滩或湾口后测水，找出去水寨的航道；也可挑战接舷追兵。',battle:'water',route:'boarders'},
 reeds:{name:'水韧苇滩',links:['dock','stakes'],text:'老苇泡在浅水里，外皮剥开后，里面的丝又长又韧。新芽长在更靠岸的地方。',purpose:'留芽割苇，带回苇丝并提高派遣产量；苇丝可绑缆、编药包。'},
 stakes:{name:'旧泊船桩',links:['reeds','fort'],text:'几根木桩斜插在水里。缆绳早已泡烂，阮小七把船靠过去，伸手试了试桩脚。',purpose:'用苇丝 3、行囊木材 2 整修泊船处，攻寨时可选择系缆稳船。'},
 fort:{name:'芦荡水寨',links:['bend','stakes'],text:'船户被锁在栈桥尽头。水匪头目踩住船帮，身边的人正等着他挥篙。',purpose:'击败头目救出船户；此后可反复搜寻药材与装备。',battle:'waterfort'}
};
export const WATER_FLAGS=[...REVISIT_FLAGS,'met','won_shoal','won_bend','charted','tended','moored','won_fort','rescued','invited'];
export const waterHas=(s,id)=>!!s?.exploration?.water?.flags.includes(id);
export function waterGate(s,id){if(!Object.hasOwn(WATER_NODES,id))return '没有这个地点。';if(!s.camp)return '先建立寨子。';if(['stakes','fort'].includes(id)&&!waterHas(s,'charted'))return '先与阮小七交谈，清出水路，再到回水湾测水。';return '';}
export function waterLinks(s,id){return [...(WATER_NODES[id]?.links||[]),...(waterHas(s,'charted')?(id==='dock'?['stakes']:id==='stakes'?['dock']:[]):[])];}
export const waterRoute=(id,approach='direct')=>id==='fort'&&approach==='medicineboat'?'medicineboat':id==='fort'&&approach==='backwash'?'backwash':id==='fort'&&approach==='moored'?'moored':WATER_NODES[id]?.route;
export function waterGoal(s){const has=k=>waterHas(s,k);
 if(!has('met'))return {node:'dock',text:'阮小七在鱼棚补网，问问对岸出了什么事。'};
 if(!has('won_shoal')&&!has('won_bend'))return {node:'shoal',text:'先清出芦岸浅滩，再到回水湾测水。'};
 if(!has('charted'))return {node:'bend',text:'跟阮小七到回水湾，找出去水寨的航道。'};
 if(!has('tended')&&!has('won_fort'))return {node:'reeds',text:'苇滩能取绑缆的苇丝。也可直接攻寨，遇浪时固守。'};
 if(!has('won_fort'))return {node:has('moored')?'fort':'stakes',text:has('moored')?'泊船桩已修好，去水寨时可系缆稳船。':'先修泊船桩，或直接攻寨；头目掀浪时切换固守。'};
 if(!has('rescued'))return {node:'fort',text:'船户还锁在栈桥尽头。解开船绳，送他们回岸。'};
 if(!has('invited'))return {node:'dock',text:'船户已回鱼棚，去找阮小七会合。'};
 const revisit=revisitGoal(s,'water');if(revisit)return revisit;
 return {node:'reeds',text:'渡船复航了。苇丝可编药包，回寨找阮小七学编法。',label:'查看野营药包',command:{type:'ui_regionalRecipe',id:'water'}};
}
