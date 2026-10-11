// Shared, optional progress: regions keep their own map positions and first-visit tasks.
export const CROSS_STORY={id:'medicineboat',name:'药船夜渡',regions:{marsh:'芦苇泽',forest:'青石古道',water:'芦荡渡口'},heroes:['andaoquan','shiqian','ruanxiaoqi']};
export const CROSS_FLAGS=['accepted','traced','prepared','won','delivered'];
export const CROSS_TASKS={
 accept:{flag:'accepted',region:'marsh',node:'hut',place:'采药草庐',label:'问药船消息',text:'安道全摊开一张货单：“送药的船两天没到。最后一封信是从古道茶棚捎来的，你替我去问问。”'},
 trace:{flag:'traced',need:'accepted',region:'forest',node:'watch',place:'松林哨台',label:'随时迁查封条',text:'时迁从树根底下拣出半张药箱封条：“箱子往水边去了。哨台上的铃绳我来拆，你去找小七借船。”'},
 prepare:{flag:'prepared',need:'traced',region:'water',node:'dock',place:'渡口鱼棚',label:'请阮小七接船',text:'阮小七把苇缆丢上船：“认得这条汊。货箱别往中间堆，浪来了压不住船。你们顾好持弩的，我来掌舵。”'},
 deliver:{flag:'delivered',need:'won',label:'回寨交药',text:'安道全拆开药箱，摸了摸纸包：“没进水，还能用。”时迁把剩下的封条搁在桌上，小七已去院里晾绳了。'}
};
export const CROSS_REWARDS={andaoquan_token:1,shiqian_token:1,ruanxiaoqi_token:1,jinchuang_gao:1,medicinal_extract:2};
export const CROSS_WORK={output:'jinchuang_gao',silver:20,items:{marsh_orchid:2,reed_fiber:2,herb:2},counter:'cross_medicine',limit:1};
export const crossHas=(s,flag)=>!!s.exploration?.crossRegion?.flags?.includes(flag);
export const crossPrerequisite=s=>Object.keys(CROSS_STORY.regions).find(region=>!s.exploration?.[region]?.flags?.includes('return_paid'));
export const crossAvailable=s=>!!s.camp&&!crossPrerequisite(s);
export const hasCrossRegion=s=>s.exploration?.crossRegion!==undefined||s.development?.goal?.kind==='crossRegion'||s.daily?.counters?.cross_medicine!==undefined||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>c?.route==='medicineboat');
export function crossStep(s){
 if(!crossHas(s,'accepted'))return {...CROSS_TASKS.accept,id:'accept',number:1};
 if(!crossHas(s,'traced'))return {...CROSS_TASKS.trace,id:'trace',number:2};
 if(!crossHas(s,'prepared'))return {...CROSS_TASKS.prepare,id:'prepare',number:3};
 if(!crossHas(s,'won'))return {id:'battle',number:4,region:'water',node:'fort',place:'芦荡水寨',label:'护送药船',text:'时迁已经剪断哨铃，小七把船靠在水寨外。最后一名夺药弩手盯着伤重的同伴，先压住他，再对付头目。'};
 if(!crossHas(s,'delivered'))return {...CROSS_TASKS.deliver,id:'deliver',number:5,place:'寨中医馆',text:'药船已靠岸。安道全在寨里等着验药；这一趟三个人的信物各有一枚，还能学着用泽兰、苇丝合配行药。'};
 return {id:'done',number:5,place:'寨中医馆',text:'安道全留下了方子，小七把苇丝编成药袋。每天可合配一份金疮膏；缺药草时还能去护送药船。'};
}
export const crossCommand=()=>({type:'ui_section',view:'camp',id:'crossRegion'});
export function crossTaskReason(s,id){
 const t=Object.hasOwn(CROSS_TASKS,id)?CROSS_TASKS[id]:null;
 if(!t)return '没有这件共事。';
 if(crossHas(s,t.flag))return '这件事已经办妥。';
 if(!crossAvailable(s))return '先办妥安道全、时迁、阮小七的三地重访。';
 if(t.need&&!crossHas(s,t.need))return '先办完药船的上一件事。';
 if(t.region&&((s.exploration.activeRegion||'mine')!==t.region||s.exploration[t.region]?.position!==t.node))return '先前往'+t.place+'。';
 if(id==='deliver'&&Object.entries(CROSS_REWARDS).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '谢礼库存已满，整理后再交药。';
 return '';
}
