import {hasOwn} from './utils.js?v=0.52.0';
export const SPECIAL_TIERS={
 1:{name:'寻常',level:5,hall:1,scale:.72,rate:1},
 2:{name:'险境',level:15,hall:2,scale:1.65,rate:1.3},
 3:{name:'深处',level:25,hall:3,scale:3.1,rate:1.6}
};
const material=(id,rate)=>({kind:'item',id,rate,amounts:[[1,2],[1,3],[2,4]]});
const rare=(id,rate)=>({kind:'item',id,rate,amounts:[[1,1],[1,1],[1,2]]});
const gear=(id,rate)=>({kind:'equipment',id,rate,amounts:[[1,1],[1,1],[1,1]]});
export const SPECIAL_DUNGEONS={
 mine:{name:'旧矿洞',hp:[3,4,3],terrain:'mountain',description:'废矿里有人私开炉火。击退守洞人，搜寻矿料与遗落的兵甲。',enemies:['soldier','bandit','guard'],rule:'守洞军士开战获得 20% 护阵，持续 10 秒。可用破甲或谋攻压低前排。',
 drops:[material('scrap_iron',.38),material('iron',.20),rare('grain',.04),material('wood',.15),material('cloth',.12),rare('tempered_steel',.06),rare('mount_token',.012),rare('strength_shard',.055),material('herb',.11),rare('jinchuangyao',.075),rare('zhuanggu_tang',.025),gear('iron_saber',.07),gear('iron_helmet',.045),gear('chain_armor',.018),gear('guard_pike',.012),gear('guard_helmet',.012)]},
 marsh:{name:'芦苇泽',hp:[6,8,10],terrain:'water',description:'浅滩上的旧药船被芦苇困住，毒蛇藏在船底，野兽也循味而来。',enemies:['snake','wolf','snake'],rule:'两条毒蛇开战怒气 70，能较早施毒。解毒、照应和打断都有用。',
 drops:[material('herb',.38),material('leather',.19),material('cloth',.21),rare('woven_linen',.045),rare('cured_hide',.055),rare('medicinal_extract',.035),rare('tiger_bone',.06),rare('tiger_skin',.05),rare('jiedudan',.12),rare('huiqisan',.09),rare('jinchuang_gao',.035),rare('xing_shen_san',.035),gear('short_bow',.07),gear('river_charm',.035),gear('scout_coat',.03),gear('river_boots',.018),gear('medic_pouch',.015)]},
 ruins:{name:'荒祠地宫',hp:[2.5,3,2.6],terrain:'forest',description:'荒祠石阶下另有地窖。盗匪把搜来的旧书、行装和药囊藏在此处。',enemies:['bandit_chief','bandit','bandit'],rule:'盗匪头目开战怒气 50，蓄势后会全队护阵；两名伏兵速度提高 20%。可用打断或眩晕截住蓄势。',
 drops:[material('cloth',.30),material('wood',.22),material('iron',.12),rare('spirit_essence',.015),rare('martial_pages',.055),material('horse_feed',.13),rare('mount_feed',.04),rare('exp_pill',.065),rare('strength_shard',.04),rare('strength_charm',.012),rare('jinchuangyao',.08),rare('xing_shen_san',.045),gear('oak_staff',.08),gear('felt_cap',.055),gear('cloth_belt',.06),gear('jade',.04),gear('tactics_book',.022),gear('sturdy_belt',.018)]}
};
export function specialDropTable(id,tier){
 if(!hasOwn(SPECIAL_DUNGEONS,id)||!hasOwn(SPECIAL_TIERS,tier)||!Number.isInteger(tier))return [];
 return SPECIAL_DUNGEONS[id].drops.map(row=>({kind:row.kind,id:row.id,min:row.amounts[tier-1][0],max:row.amounts[tier-1][1],rate:Math.round(row.rate*SPECIAL_TIERS[tier].rate*10000)/10000}));
}
export function validSpecialContext(c){return !!c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===4&&Object.keys(c).every(k=>['type','id','tier','terrain'].includes(k))&&c.type==='special'&&hasOwn(SPECIAL_DUNGEONS,c.id)&&Number.isInteger(c.tier)&&hasOwn(SPECIAL_TIERS,c.tier)&&c.terrain===SPECIAL_DUNGEONS[c.id].terrain;}
