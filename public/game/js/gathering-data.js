// Local materials have one named source and a useful, bounded workshop recipe.
export const GATHERING_REGIONS={
 mine:{item:'magnetite_sand',site:'深层矿脉',dungeons:['mine','minechief']},
 marsh:{item:'marsh_orchid',site:'泽兰药圃',dungeons:['marsh','marshnest']},
 ruins:{item:'stone_rubbing',site:'残碑石室',dungeons:['ruins','ruinsvault']},
 forest:{item:'mountain_vine',site:'老藤坡'},
 water:{item:'reed_fiber',site:'水韧苇滩'},
 mountain:{item:'copper_sand',site:'赤铜矿脉'}
};
export const REGIONAL_RECIPES={
 mine:{kind:'equipment',output:'guard_pike',count:1,building:'market',silver:100,items:{magnetite_sand:6,iron:2,wood:3},limit:2,use:'枪头掺入磁铁砂锻打，配木杆制成守路长枪。'},
 marsh:{kind:'item',output:'jinchuang_gao',count:1,building:'clinic',silver:35,items:{marsh_orchid:4,herb:2,cloth:1},limit:3,use:'泽兰捣汁入膏。战斗中恢复一位同伴 900 气血。'},
 ruins:{kind:'item',output:'martial_pages',count:2,building:'market',silver:25,items:{stone_rubbing:6,cloth:1},limit:4,use:'比对碑文中的招式，整理成两张武学残页，可抄录好汉招式书或练兵。'},
 forest:{kind:'equipment',output:'scout_coat',count:1,building:'market',silver:100,items:{mountain_vine:6,cloth:4,leather:2},limit:2,use:'山藤编入衣衬，配布匹与皮革制成斥候短褐。'},
 water:{kind:'item',output:'camp_pack',count:1,building:'clinic',silver:25,items:{reed_fiber:6,herb:3},limit:2,use:'苇丝裹药制成野营药包，游历途中恢复全队未退阵好汉 20% 气血。'},
 mountain:{kind:'equipment',output:'sturdy_belt',count:1,building:'market',silver:100,items:{copper_sand:6,cloth:3,leather:2},limit:2,use:'赤铜铸扣、皮革缝带，制成稳步束带。'}
};
export function historicGathering(s,id){
 const m=GATHERING_REGIONS[id];if(!m)return {runs:0,best:0};
 if(!m.dungeons){const best=s.realm?.journey?.best[id]||0;return {runs:Math.min(3,best),best};}
 let runs=0,best=0;for(const dungeon of m.dungeons)for(let tier=1;tier<=3;tier++){const n=s.specialDungeons?.clears[dungeon+'_'+tier]||0;runs+=n;if(n)best=Math.max(best,tier);}
 return {runs:Math.min(3,runs),best};
}
export const gatheringProgress=(s,id)=>s?.gathering?.regions[id]||historicGathering(s||{},id);
export const gatheringRegion=id=>Object.keys(GATHERING_REGIONS).find(k=>k===id||GATHERING_REGIONS[k].dungeons?.includes(id));
