import {icon} from './icons.js?v=0.91.0';
import {PROMOTION_ITEMS,PROMOTION_CORES} from './promotion-data.js?v=0.91.0';

// A shared object atlas, ordered left to right, top to bottom. Selection is visual only.
export const ITEM_ART_FAMILIES=Object.freeze(['silver','grain','wood','iron','scrap','dark-iron','cloth','hide','herb','bone','ore','fiber','healing','rage','antidote','wine','ration','exp','manual','charm','order','mount','spirit','seal','chest','blueprint','letter','saber','spear','bow','staff','armor','helmet','belt','boots','accessory']);
const families=Object.freeze({silver:'silver',food:'grain',grain:'grain',wood:'wood',iron:'iron',tempered_steel:'iron',scrap_iron:'scrap',dark_iron:'dark-iron',cloth:'cloth',woven_linen:'cloth',leather:'hide',cured_hide:'hide',tiger_skin:'hide',herb:'herb',marsh_orchid:'herb',medicinal_extract:'herb',tiger_bone:'bone',magnetite_sand:'ore',copper_sand:'ore',mountain_vine:'fiber',reed_fiber:'fiber',jinchuangyao:'healing',jinchuang_gao:'healing',camp_pack:'healing',medical_crate:'chest',huiqisan:'rage',xing_shen_san:'rage',jiedudan:'antidote',zhuanggu_tang:'antidote',vital_pill:'antidote',wine:'wine',ration:'ration',horse_feed:'grain',mount_feed:'grain',exp_pill:'exp',skill_page:'manual',martial_pages:'manual',strength_charm:'charm',strength_shard:'charm',recruit_order:'order',recruit_shard:'order',mount_token:'mount',mount_clue:'mount',spirit_essence:'spirit',immortal_seal:'seal',material_choice:'chest',smoke_pack:'rage',blueprint:'blueprint',lost_ledger:'letter',stone_rubbing:'letter',zhujia_pass:'order',refuge_letter:'letter',night_clothes:'armor'});
const equipmentFamilies=Object.freeze({oak_staff:'staff',iron_saber:'saber',long_spear:'spear',short_bow:'bow',monk_staff:'staff',route_forest_blade:'saber',guard_pike:'spear',bastion_spear:'spear',skirmish_blade:'saber',furnace_hammer:'staff',watchman_blade:'saber',tactics_book:'manual',vault_strategy:'manual',medic_pouch:'healing',reed_medicine_case:'chest',field_bandage:'belt'});
const newPortraits=new Set(["lujunyi","guansheng","qinming","huyanzhuo","liying","zhutong","dongping","zhangqing","xuning","suochao","daizong","likui","shijin","muhong","leiheng","lijun","ruanxiaoer","zhangheng","ruanxiaowu","zhangshun","yangxiong","shixiu","jiezhen","jiebao","zhuwu","huangxin","sunli","xuanzan","haosiwen","hantao","pengqi","shantinggui","weidingguo","xiaorang","peixuan","oupeng","dengfei","yanshun","yanglin","lingzhen","jiangjing","lvfang","guosheng","andaoquan","huangfuduan","wangying","husanniang","baoxu","fanrui","kongming","kongliang","xiangchong","ligun","jindajian","malin","tongwei","tongmeng","mengkang","houjian","chenda","yangchun","zhengtianshou","taozongwang","songqing","yuehe","gongwang","dingdesun","muchun","caozheng","songwan","duqian","xueyong","shien","lizhong","zhoutong","tanglong","duxing","zouyuan","zourun","zhugui","zhufu","caifu","caiqing","lili","liyun","jiaoting","shiyong","sunxin","gudasao","zhangqing_gardener","sunerniang","wangdingliu","yubaosi","duanjingzhu"]);
const standalonePortraits=Object.freeze({"chaogai":"art/chaogai-v1.png","wangjin":"art/wangjin-v1.png","hucheng":"art/hucheng-v1.png","luantingyu":"art/luantingyu-v1.png"});
const safeClass=value=>/^[a-z][a-z0-9_]*$/.test(String(value||''))?String(value):'';
const escapeAttribute=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function model(value){return typeof value==='string'?{id:value}:value&&typeof value==='object'?value:{};}
export function itemArtFamily(value,{kind}={}){
 const item=model(value),id=String(item.id||item.item||'');
 if(Object.hasOwn(families,id))return families[id];
 if(Object.hasOwn(equipmentFamilies,id))return equipmentFamilies[id];
 if(kind==='equipment'||['weapon','armor','helmet','belt','shoes','accessory'].includes(item.type))return ({weapon:'saber',armor:'armor',helmet:'helmet',belt:'belt',shoes:'boots',accessory:'accessory'})[item.type]||'saber';
 if(id.endsWith('_manual'))return 'manual';
 if(id.endsWith('_mount_contract'))return 'mount';
 if(id.endsWith('_order')||item.type==='token')return 'order';
 if(Object.hasOwn(PROMOTION_ITEMS,id))return 'spirit';
 if(item.effect?.hp)return 'healing';
 if(item.effect?.rage)return 'rage';
 if(item.effect?.cleanse)return 'antidote';
 if(item.effect?.exp)return 'exp';
 return item.type==='quest'?'letter':'chest';
}
export function itemArt(value,options={}){
 const item=model(value),id=String(item.id||item.item||''),family=itemArtFamily(item,options),core=Object.hasOwn(PROMOTION_ITEMS,id)?PROMOTION_ITEMS[id]:null,token=id.endsWith('_token')&&Object.hasOwn(PROMOTION_CORES,id.slice(0,-6))?PROMOTION_CORES[id.slice(0,-6)]:null,heroId=core?.hero||token?.hero;
 if(heroId&&safeClass(heroId)){
  const portrait=standalonePortraits[heroId],image=portrait?'<img src="'+escapeAttribute(portrait)+'" alt="" loading="lazy">':'';
  return '<span class="item-art item-art-personal item-art-'+(core?'core':'token')+'" aria-hidden="true" data-item-art="'+family+'"><span class="hero-portrait portrait-'+heroId+(newPortraits.has(heroId)?' portrait-new':'')+'">'+image+'</span><i>'+(core?'炼':'信')+'</i></span>';
 }
 if(id==='furnace_hammer')return '<span class="item-art item-art-tool" aria-hidden="true" data-item-art="'+family+'" data-item-tool="hammer">'+icon('forge')+'</span>';
 return '<span class="item-art item-art-'+family+'" aria-hidden="true" data-item-art="'+family+'"></span>';
}
