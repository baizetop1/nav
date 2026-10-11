export const MOUNTAIN_NODES={
 shelter:{name:'粮道歇棚',links:['slope','vein'],text:'项充把团牌靠在柱边，正替一个车夫包扎手掌。山上扣下的粮车，原是送往邻村的。',purpose:'与项充相识，取回粮车后可邀他入寨。'},
 slope:{name:'断车坡',links:['shelter','pass'],text:'断轴横在坡上，粮袋漏了一地。几名匪徒拿车板做盾，堵住了去路。',purpose:'可重复挑战，搜寻赤铜砂、铁料、皮革和护身装备。',battle:'mountain'},
 pass:{name:'乱石隘',links:['slope','hold'],text:'隘口只容两人并肩。盾后露着枪尖，崖上还有一条断了横木的栈道。',purpose:'清出粮道后查看敌情；也可挑战增援盾兵，多取精铁。',battle:'mountain',route:'shieldpass'},
 vein:{name:'赤铜矿脉',links:['shelter','cliff'],text:'雨水冲开坡脚，露出一层红褐色矿砂。当地山民说，这里的铜适合铸带扣和木梯扣。',purpose:'标记矿脉，带回赤铜砂 4；此后派遣每批赤铜砂额外 +1。'},
 cliff:{name:'悬崖栈道',links:['vein','hold'],text:'旧栈道贴着崖壁，一段梯子滑出了石槽。项充拉住绳头，叫你先别踩上去。',purpose:'用赤铜砂 3、行囊木材 2 修通栈道，开辟近路，也可从高处攻营。'},
 hold:{name:'截粮营',links:['pass','cliff'],text:'粮车停在营门后。头目举起大盾，手下的人把长枪探过盾沿。',purpose:'击败头目，交还粮车；此后仍可反复搜寻矿料与装备。',battle:'mountainhold'}
};
export const MOUNTAIN_FLAGS=['met','won_slope','won_pass','scouted','surveyed','ladder','won_hold','cargo','invited','return_met','road_checked','won_convoy','return_paid'];
export const mountainHas=(s,id)=>!!s?.exploration?.mountain?.flags.includes(id);
export function mountainGate(s,id){if(!Object.hasOwn(MOUNTAIN_NODES,id))return '没有这个地点。';if(!s.camp)return '先建立寨子。';if(['cliff','hold'].includes(id)&&!mountainHas(s,'scouted'))return '先与项充交谈，清出粮道，再到乱石隘查看敌情。';return '';}
export function mountainLinks(s,id){return [...(MOUNTAIN_NODES[id]?.links||[]),...(mountainHas(s,'ladder')?(id==='shelter'?['cliff']:id==='cliff'?['shelter']:[]):[])];}
export const mountainRoute=(id,approach='direct')=>id==='hold'&&['highpath','convoy'].includes(approach)?approach:MOUNTAIN_NODES[id]?.route;
export function mountainGoal(s){const has=k=>mountainHas(s,k);
 if(!has('met'))return {node:'shelter',text:'项充在歇棚照看车夫，去问问粮车的下落。'};
 if(!has('won_slope')&&!has('won_pass'))return {node:'slope',text:'先清出断车坡，再去乱石隘看敌人的布置。'};
 if(!has('scouted'))return {node:'pass',text:'到乱石隘找项充，看清盾阵和崖上的旧路。'};
 if(!has('surveyed')&&!has('won_hold'))return {node:'vein',text:'矿砂能铸梯扣；也可直接攻营，留破甲招式对付头目。'};
 if(!has('won_hold'))return {node:has('ladder')?'hold':'cliff',text:has('ladder')?'栈道已修通，可绕开盾阵攻营。':'修栈道可绕行；正面攻营时，在头目蓄势的三秒内破盾。'};
 if(!has('cargo'))return {node:'hold',text:'粮车就在营门后，把车赶回山下。'};
 if(!has('invited'))return {node:'shelter',text:'车夫已回歇棚，去邀项充一起回寨。'};
 if(!has('return_met'))return {node:'shelter',text:'歇棚的车夫又捎来一封信，去看看粮车出了什么事。'};
 if(!has('road_checked'))return {node:'pass',text:'车夫说后车总在乱石隘掉队。去找找车辙和脚印。'};
 if(!has('won_convoy'))return {node:'hold',text:'伏兵绕到车队尾部。去截粮营接应；可先击倒最末位伏兵，或打断头目。'};
 if(!has('return_paid'))return {node:'shelter',text:'粮车已经过隘，回歇棚给车夫报个平安。'};
 return {node:'vein',text:'粮道通了。回寨用赤铜砂打带扣，项充能教你省料。',label:'查看稳步束带',command:{type:'ui_regionalRecipe',id:'mountain'}};
}

export const hasMountainReturn=s=>!!s.exploration?.mountain?.flags.some(k=>['return_met','road_checked','won_convoy','return_paid'].includes(k))||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>c?.route==='convoy');
