import {marshHas} from './marsh-data.js?v=0.69.0';
export const REGION_NODES={
 entrance:{name:'矿口',links:['rail','chamber'],text:'旧矿道分成两路。左边铁轨通往炉房，右边石缝里传来敲击声。',purpose:'整备、回寨；清走矿头后商人回来。'},
 rail:{name:'运矿道',links:['entrance','furnace'],text:'矿车横在轨道上，几个守卫正把矿袋往里搬。',purpose:'可反复挑战，掉落矿料与兵器。',battle:'mine'},
 chamber:{name:'塌方石室',links:['entrance','vein'],text:'断梁压住了半扇木门。里面的人还活着，守卫不肯放行。',purpose:'赶走守卫，救出矿工老杜。',battle:'mine',route:'oreguard'},
 furnace:{name:'旧炉房',links:['rail','vault'],text:'汤隆翻看炉渣：“这矿砂杂得很，得先挑一挑。”他手边放着一支尚未装柄的枪头。',purpose:'结识汤隆，帮他修炉、取回工具，再邀他入寨。'},
 vein:{name:'深层矿脉',links:['chamber','vault'],text:'老杜记得石壁后还有一条矿脉。撬开封石后，矿砂沿着水沟露了出来。',purpose:'亲自勘察后，旧矿洞派遣每批磁铁砂再加一份。'},
 vault:{name:'矿头藏室',links:['furnace','vein'],text:'矿头占住了最深处的石厅。被夺走的工具和矿账都堆在门后。',purpose:'挑战矿头，取回工具，开放矿口交易。',battle:'minechief'}
};
export const REGION_FLAGS=['won_rail','won_chamber','won_vault','rescued','surveyed','met','commission','invited','cache'];
export const REGION_BUILDINGS={
 forge:{name:'矿砂炉',items:{magnetite_sand:6,copper_sand:6},wood:30,silver:150,text:'地区兵器、衣甲和腰带配方的碎银消耗降低 20%。'},
 clinic:{name:'配药间',items:{marsh_orchid:6,reed_fiber:6},wood:30,silver:150,text:'地区药品配方每次少用 1 份药草；加工次数不变。'},
 lodge:{name:'客舍',items:{mountain_vine:6,stone_rubbing:6},wood:30,silver:150,text:'安置回寨的矿工老杜；他指点采集人手，旧矿洞每批碎铁增加 1 份。'}
};
export const REGION_CONTACTS={mine:'tanglong',marsh:'andaoquan',ruins:'yuehe',forest:'shiqian',water:'ruanxiaoqi',mountain:'xiangchong'};
export const regionHas=(s,flag)=>!!s?.exploration?.flags.includes(flag);
export const regionBuilt=(s,id)=>!!s?.exploration?.buildings.includes(id);
export function regionGate(s,id){if(!REGION_NODES[id])return '没有这个地点。';if(!s.camp)return '先建立寨子。';if(id==='vein'&&!regionHas(s,'rescued'))return '先到塌方石室救出矿工，由他指路。';if(id==='vault'&&!regionHas(s,'commission'))return '先在旧炉房帮汤隆修炉，问清藏室位置。';return '';}
export const EXPLORATION_REGIONS={mine:'旧矿洞',marsh:'芦苇泽'};
export const activeRegion=s=>s.exploration?.activeRegion||'mine';
export const regionState=(s,id=activeRegion(s))=>id==='marsh'?s.exploration?.marsh:s.exploration;
export const regionPending=s=>s.exploration?.marsh?.pending?{region:'marsh',...s.exploration.marsh.pending}:s.exploration?.pending?{region:'mine',...s.exploration.pending}:null;
export const regionBonus=(s,region)=>region==='mine'?{special:regionHas(s,'surveyed')?1:0,base:regionHas(s,'rescued')&&regionBuilt(s,'lodge')?1:0}:region==='marsh'?{special:marshHas(s,'tended')?1:0,base:marshHas(s,'invited')&&regionBuilt(s,'clinic')?1:0}:{special:0,base:0};
