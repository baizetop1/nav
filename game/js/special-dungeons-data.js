import {SPECIAL_ROUTES} from './special-routes.js?v=0.58.0';
import {hasOwn} from './utils.js?v=0.58.0';
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
 drops:[material('scrap_iron',.38),material('iron',.20),rare('grain',.04),material('wood',.15),material('cloth',.12),rare('tempered_steel',.06),rare('mount_token',.012),rare('strength_shard',.055),material('herb',.11),rare('jinchuangyao',.075),rare('zhuanggu_tang',.025),gear('iron_saber',.07),gear('iron_helmet',.045),gear('chain_armor',.018),gear('guard_pike',.012),gear('guard_helmet',.012),rare('dark_iron',.04),rare('blueprint',.025)]},
 marsh:{name:'芦苇泽',hp:[6,8,10],terrain:'water',description:'浅滩上的旧药船被芦苇困住，毒蛇藏在船底，野兽也循味而来。',enemies:['snake','wolf','snake'],rule:'两条毒蛇开战怒气 70，能较早施毒。解毒、照应和打断都有用。',
 drops:[material('herb',.38),material('leather',.19),material('cloth',.21),rare('woven_linen',.045),rare('cured_hide',.055),rare('medicinal_extract',.035),rare('tiger_bone',.06),rare('tiger_skin',.05),rare('jiedudan',.12),rare('huiqisan',.09),rare('jinchuang_gao',.035),rare('xing_shen_san',.035),gear('short_bow',.07),gear('river_charm',.035),gear('scout_coat',.03),gear('river_boots',.018),gear('medic_pouch',.015)]},
 ruins:{name:'荒祠地宫',hp:[2.5,3,2.6],terrain:'forest',description:'荒祠石阶下另有地窖。盗匪把搜来的旧书、行装和药囊藏在此处。',enemies:['bandit_chief','bandit','bandit'],rule:'盗匪头目开战怒气 50，蓄势后会全队护阵；两名伏兵速度提高 20%。可用打断或眩晕截住蓄势。',
 drops:[material('cloth',.30),material('wood',.22),material('iron',.12),rare('spirit_essence',.015),rare('martial_pages',.055),material('horse_feed',.13),rare('mount_feed',.04),rare('exp_pill',.065),rare('strength_shard',.04),rare('strength_charm',.012),rare('jinchuangyao',.08),rare('xing_shen_san',.045),gear('oak_staff',.08),gear('felt_cap',.055),gear('cloth_belt',.06),gear('jade',.04),gear('tactics_book',.022),gear('sturdy_belt',.018),rare('blueprint',.025),material('skill_page',.06)]}
};
Object.assign(SPECIAL_DUNGEONS,{
 minechief:{parent:'mine',name:'炉底密窟',hp:[4,5,4],terrain:'mountain',description:'守洞人藏起了通往炉底的梯子。连闯旧矿洞五次，才寻到入口。',enemies:['bandit_chief','soldier','guard'],rule:'守炉头目开场护阵 30%，持续 12 秒；蓄势 3 秒后重锤扫过全队，之后每隔 12 秒再蓄势。可用护阵反击或打断应对，守炉重锤能破去护阵。',drops:[material('iron',.3),rare('dark_iron',.08),rare('tempered_steel',.1),rare('blueprint',.04),gear('furnace_hammer',.025)]},
 marshnest:{parent:'marsh',name:'芦荡药船',hp:[7,9,11],terrain:'water',description:'芦苇深处有条沉船，舱内还留着药箱。船板已朽，踏上去便惊动了蛇群。',enemies:['snake','snake','wolf'],rule:'蛇群开场怒气 90，狼加速 30%；首蛇蓄势 3 秒后施放全队毒雾，持续 6 秒。可打断；有效治疗配药匣能清除一项毒伤。',drops:[material('herb',.35),rare('medicinal_extract',.08),rare('jinchuang_gao',.06),rare('jiedudan',.15),gear('reed_medicine_case',.025)]},
 ruinsvault:{parent:'ruins',name:'地宫内室',hp:[3.5,4,3.5],terrain:'forest',description:'石门后的盗匪守着几箱兵书。两翼伏兵出手很快，头目则伺机整队。',enemies:['bandit_chief','guard','bandit'],rule:'头目开场怒气 80，两翼加速 35%；蓄势 3 秒后为存活敌人各恢复 15% 气血。留住打断招式截住治疗，再集火收尾。',drops:[rare('skill_page',.2),rare('martial_pages',.08),rare('spirit_essence',.025),rare('blueprint',.04),gear('vault_strategy',.025)]}
});
export function specialDropTable(id,tier){
 if(!hasOwn(SPECIAL_DUNGEONS,id)||!hasOwn(SPECIAL_TIERS,tier)||!Number.isInteger(tier))return [];
 return SPECIAL_DUNGEONS[id].drops.map(row=>({kind:row.kind,id:row.id,min:row.amounts[tier-1][0],max:row.amounts[tier-1][1],rate:Math.round(row.rate*SPECIAL_TIERS[tier].rate*10000)/10000}));
}
export function validSpecialContext(c){return !!c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===(c.route===undefined?4:5)&&(c.route===undefined||Object.hasOwn(SPECIAL_ROUTES,c.route))&&Object.keys(c).every(k=>['type','id','tier','terrain','route'].includes(k))&&c.type==='special'&&hasOwn(SPECIAL_DUNGEONS,c.id)&&Number.isInteger(c.tier)&&hasOwn(SPECIAL_TIERS,c.tier)&&c.terrain===SPECIAL_DUNGEONS[c.id].terrain;}
