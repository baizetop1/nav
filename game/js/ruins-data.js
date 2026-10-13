import {REVISIT_FLAGS,revisitGoal} from './region-revisit-data.js?v=0.83.0';
export const RUINS_NODES = {
 gate:{name:'荒祠山门',links:['court','bell'],text:'门匾歪在枯树上。破殿里有火光，钟楼下断断续续传来笛声。',purpose:'认路、整备；听清钟声后，可从东墙直达残碑石室。'},
 court:{name:'破殿前庭',links:['gate','stele'],text:'几名盗匪围着火堆分东西。领头的人一抬手，旁边两人便往石阶靠拢。',purpose:'三名盗匪；头目会蓄势护阵，可用眩晕或打断截住。',battle:'ruins'},
 bell:{name:'残钟楼',links:['gate','passage'],text:'乐和停了笛子，侧耳听着地底传来的钟声。他丢的谱册就在那些盗匪手里。',purpose:'结识乐和，辨清暗门的回声；取回谱册后邀他入寨。'},
 passage:{name:'回声夹道',links:['bell','stele'],text:'石壁后有人拉动钟绳，守卫正从侧门赶来。这条道更难走，却能截下他们的布包。',purpose:'多一名守卫；敌人气血、速度提高，头目蓄势治疗。胜利必得粗布 2。',battle:'ruins',route:'warbell'},
 stele:{name:'残碑石室',links:['court','passage','vault'],text:'东墙后露出半截石碑，刻的是步法与使枪的架势。尘土太厚，得先擦净拓下来。',purpose:'用粗布 2 拓碑，取得旧碑拓片 4；之后派遣每批拓片额外 +1。'},
 vault:{name:'地宫内室',links:['stele'],text:'盗匪头目守着几箱旧书，乐和的谱册也夹在里面。两翼的伏兵已经握紧兵器。',purpose:'头目蓄势 3 秒后给全敌回血 15%；留住打断或先集火头目。',battle:'ruinsvault'}
};
export const RUINS_FLAGS=[...REVISIT_FLAGS,'rubbing_supplies','met','won_court','won_passage','heard','rubbed','won_vault','invited','cache'];
export const ruinsHas=(s,flag)=>!!s?.exploration?.ruins?.flags.includes(flag);
export function ruinsGate(s,id){
 if(!Object.hasOwn(RUINS_NODES,id))return '没有这个地点。';
 if(!s.camp)return '先建立寨子。';
 if(id==='stele'&&!ruinsHas(s,'heard'))return '先清出破殿或夹道，再到残钟楼听声辨路。';
 if(id==='vault'&&!ruinsHas(s,'rubbed'))return '先拓下残碑，查清石阶通向哪里。';
 return '';
}
// Hearing the echo reveals a persistent entrance in the east wall.
export function ruinsLinks(s,id){return [...RUINS_NODES[id].links,...(ruinsHas(s,'heard')&&id==='gate'?['stele']:ruinsHas(s,'heard')&&id==='stele'?['gate']:[])];}
export function ruinsGoal(s){
 if(!ruinsHas(s,'met'))return {node:'bell',text:'到残钟楼找吹笛的人。'};
 if(!ruinsHas(s,'won_court')&&!ruinsHas(s,'won_passage'))return {node:'court',text:'先清出一条路。破殿敌人较少；夹道有援兵，胜利另得粗布 2。'};
 if(!ruinsHas(s,'heard'))return {node:'bell',text:'外头安静了，回钟楼与乐和听声辨路。'};
 if(!ruinsHas(s,'rubbed')&&!ruinsHas(s,'rubbing_supplies')&&(s.inventory.cloth||0)<2)return {node:'bell',text:'乐和留了两块包布。回钟楼领来，就能去石室拓碑。'};
 if(!ruinsHas(s,'rubbed'))return {node:'stele',text:'东墙暗门已找到。带粗布 2 去残碑石室拓碑。'};
 if(!ruinsHas(s,'won_vault')){const n=s.specialDungeons?.clears.ruins_1||0;return n<1?{node:'court',text:'破殿与夹道合计通关 '+n+'/1 趟，再进内室。可选夹道补粗布。'}:{node:'vault',text:'进地宫内室找回谱册。首领会蓄势治疗，记得留住打断。'};}
 if(!ruinsHas(s,'cache'))return {node:'vault',text:'内室已清。收好书箱里的招式书页和武学残页。'};
 if(!ruinsHas(s,'invited'))return {node:'bell',text:'谱册已找回，回残钟楼与乐和会合。'};
 const revisit=revisitGoal(s,'ruins');if(revisit)return revisit;
 return {node:'stele',text:'乐和已入寨。拓片能整理成武学残页；内室仍可寻找兵书装备。',label:'整理武学残页',command:{type:'ui_regionalRecipe',id:'ruins'}};
}

export const ruinsRoute=(id,approach='direct')=>id==='vault'&&approach==='bellbreak'?'bellbreak':RUINS_NODES[id]?.route;
