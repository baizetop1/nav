import {MINE_COMPANION_FLAGS,mineCompanionGoal} from './mine-companion-data.js?v=0.82.2';
import {mountainHas} from './mountain-data.js?v=0.82.2';
import {waterHas} from './water-data.js?v=0.82.2';
import {forestHas} from './forest-data.js?v=0.82.2';
import {ruinsHas} from './ruins-data.js?v=0.82.2';
import {marshHas} from './marsh-data.js?v=0.82.2';
export const REGION_NODES={
 entrance:{name:'矿口',links:['rail','chamber'],text:'旧矿道分成两路。左边铁轨通往炉房，右边石缝里传来敲击声。',purpose:'整备、回寨；清走矿头后商人回来。'},
 rail:{name:'运矿道',links:['entrance','furnace'],text:'矿车横在轨道上，几个守卫正把矿袋往里搬。',purpose:'可反复挑战，掉落矿料与兵器。',battle:'mine'},
 chamber:{name:'塌方石室',links:['entrance','vein'],text:'断梁压住了半扇木门。里面的人还活着，守卫不肯放行。',purpose:'赶走守卫，救出矿工老杜。',battle:'mine',route:'oreguard'},
 furnace:{name:'旧炉房',links:['rail','vault'],text:'汤隆翻看炉渣：“这矿砂杂得很，得先挑一挑。”他手边放着一支尚未装柄的枪头。',purpose:'结识汤隆，帮他修炉、取回工具，再邀他入寨。'},
 vein:{name:'深层矿脉',links:['chamber','vault'],text:'老杜记得石壁后还有一条矿脉。撬开封石后，矿砂沿着水沟露了出来。',purpose:'亲自勘察后，派遣每批磁铁砂加一份；老杜会在炉房备好一次修炉料。'},
 vault:{name:'矿头藏室',links:['furnace','vein'],text:'矿头占住了最深处的石厅。被夺走的工具和矿账都堆在门后。',purpose:'挑战矿头，取回工具，开放矿口交易。',battle:'minechief'}
};
export const REGION_FLAGS=['won_rail','won_chamber','won_vault','rescued','surveyed','met','commission','invited','cache','repair_supplies','return_met','cart_checked','won_orecart','return_paid',...MINE_COMPANION_FLAGS];
export const REGION_BUILDINGS={
 forge:{name:'矿砂炉',items:{magnetite_sand:6,copper_sand:6},wood:30,silver:150,text:'地区兵器、衣甲和腰带配方的碎银消耗降低 20%。'},
 clinic:{name:'配药间',items:{marsh_orchid:6,reed_fiber:6},wood:30,silver:150,text:'地区药品配方每次少用 1 份药草；加工次数不变。'},
 lodge:{name:'客舍',items:{mountain_vine:6,stone_rubbing:6},wood:30,silver:150,text:'安置回寨的故人。老杜指点采矿，乐和整理碑文，时迁教人裁藤缝衣。各自委托办妥后生效。'}
};
export const REGION_CONTACTS={mine:'tanglong',marsh:'andaoquan',ruins:'yuehe',forest:'shiqian',water:'ruanxiaoqi',mountain:'xiangchong'};
export const EXPLORATION_HERO_REGIONS={...Object.fromEntries(Object.entries(REGION_CONTACTS).map(([region,hero])=>[hero,region])),liyun:'mine'};
export const regionHas=(s,flag)=>!!s?.exploration?.flags.includes(flag);
export const regionBuilt=(s,id)=>!!s?.exploration?.buildings.includes(id);
export function regionGate(s,id){if(!REGION_NODES[id])return '没有这个地点。';if(!s.camp)return '先建立寨子。';if(id==='vein'&&!regionHas(s,'rescued'))return '先到塌方石室救出矿工，由他指路。';if(id==='vault'&&!regionHas(s,'commission'))return '先在旧炉房帮汤隆修炉，问清藏室位置。';return '';}
export const EXPLORATION_REGIONS={mine:'旧矿洞',marsh:'芦苇泽',ruins:'荒祠地宫',forest:'青石古道',water:'芦荡渡口',mountain:'断崖粮道'};
export const activeRegion=s=>s.exploration?.activeRegion||'mine';
export const regionState=(s,id=activeRegion(s))=>id==='mountain'?s.exploration?.mountain:id==='water'?s.exploration?.water:id==='forest'?s.exploration?.forest:id==='marsh'?s.exploration?.marsh:id==='ruins'?s.exploration?.ruins:s.exploration;
export const regionPending=s=>s.exploration?.mountain?.pending?{region:'mountain',...s.exploration.mountain.pending}:s.exploration?.water?.pending?{region:'water',...s.exploration.water.pending}:s.exploration?.forest?.pending?{region:'forest',...s.exploration.forest.pending}:s.exploration?.ruins?.pending?{region:'ruins',...s.exploration.ruins.pending}:s.exploration?.marsh?.pending?{region:'marsh',...s.exploration.marsh.pending}:s.exploration?.pending?{region:'mine',...s.exploration.pending}:null;
export const regionBonus=(s,region)=>region==='mine'?{special:regionHas(s,'surveyed')?1:0,base:(regionHas(s,'rescued')&&regionBuilt(s,'lodge')?1:0)+(regionHas(s,'liyun_invited')?1:0)}:region==='marsh'?{special:marshHas(s,'tended')?1:0,base:marshHas(s,'invited')&&regionBuilt(s,'clinic')?1:0}:region==='ruins'?{special:ruinsHas(s,'rubbed')?1:0,base:ruinsHas(s,'invited')&&regionBuilt(s,'lodge')?1:0}:region==='forest'?{special:forestHas(s,'tended')?1:0,base:forestHas(s,'invited')&&regionBuilt(s,'lodge')?1:0}:region==='water'?{special:waterHas(s,'tended')?1:0,base:waterHas(s,'invited')&&regionBuilt(s,'clinic')?1:0}:region==='mountain'?{special:mountainHas(s,'surveyed')?1:0,base:mountainHas(s,'invited')&&regionBuilt(s,'forge')?1:0}:{special:0,base:0};

export const MINE_REWARDS={repair:{magnetite_sand:3,iron:2},thanks:{magnetite_sand:4,tanglong_token:2,tempered_steel:1}};
export const MINE_SMELT={items:{magnetite_sand:6,iron:1},silver:25,output:'tempered_steel'};
export const mineRoute=(id,approach='direct')=>id==='rail'&&approach==='timberguard'?'timberguard':id==='vault'&&approach==='orecart'?'orecart':REGION_NODES[id]?.route;
export const hasMineRevisit=s=>!!s.exploration?.flags.some(k=>['repair_supplies','return_met','cart_checked','won_orecart','return_paid'].includes(k))||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>c?.route==='orecart'||c?.id==='minechief'&&(s.specialDungeons?.clears['mine_'+c.tier]||0)<5)||[1,2,3].some(t=>(s.specialDungeons?.clears['minechief_'+t]||0)>0&&(s.specialDungeons?.clears['mine_'+t]||0)<5);
export function mineGoal(s){const has=k=>regionHas(s,k);
 if(!has('rescued'))return {node:'chamber',text:has('won_chamber')?'守卫已退，去石室扶出被困的矿工。':'去塌方石室赶走守卫，救出被困的矿工。'};
 if(!has('surveyed'))return {node:'vein',text:'照老杜说的位置标记矿脉，他会在炉房备好修炉料。'};
 if(!has('met'))return {node:'furnace',text:'旧炉房有人打铁，去和汤隆说说话。'};
 if(!has('commission'))return {node:'furnace',text:!has('repair_supplies')?'老杜在炉房留了磁铁砂 3、精铁 2，可领来修炉。':'带磁铁砂 3、精铁 2 回炉房修炉；用掉了可派遣补齐。'};
 if(!has('won_vault'))return {node:'vault',text:'炉火已起，通往藏室的路也清出来了。去找矿头夺回工具。'};
 if(!has('invited'))return {node:'furnace',text:'工具已找齐，回炉房邀请汤隆入寨。'};
 if(!has('return_met'))return {node:'furnace',text:'汤隆带来老杜的口信：昨晚一车好矿没送到。回炉房问问。'};
 if(!has('cart_checked'))return {node:'rail',text:'到运矿道查找失踪的矿车，看看车轮留下的痕迹。'};
 if(!has('won_orecart'))return {node:'vault',text:'矿车被推入藏室。先除去最末位运料匪，截断头目的补给。'};
 if(!has('return_paid'))return {node:'furnace',text:'矿车已夺回，回炉房让汤隆看看这批矿。'};
 const companion=mineCompanionGoal(s);if(companion&&!companion.done)return companion;
 return {node:'furnace',text:'汤隆试出了淬料的火候。寨里建好矿砂炉，每日可用矿砂淬钢一次。',label:'回寨选矿淬料',command:{type:'ui_section',view:'camp',id:'exploration',region:'mine',building:'forge'}};
}
