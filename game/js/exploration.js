import {crossStep,crossAvailable} from './cross-region-data.js?v=0.82.1';
import {crossAction,crossWork} from './cross-region.js?v=0.82.1';
import {MINE_COMPANION_TASKS,mineCompanionTask} from './mine-companion-data.js?v=0.82.1';
import {mineCompanionAction} from './mine-companion.js?v=0.82.1';
import {revisitWork} from './region-revisit.js?v=0.82.1';
import {mountainAction,finishMountain} from './mountain.js?v=0.82.1';
import {waterAction,finishWater} from './water.js?v=0.82.1';
import {forestAction,finishForest} from './forest.js?v=0.82.1';
import {ruinsAction,finishRuins} from './ruins.js?v=0.82.1';
import {marshAction,finishMarsh,marshDecoct} from './marsh.js?v=0.82.1';
import {REGION_NODES,REGION_BUILDINGS,REGION_CONTACTS,regionHas,regionGate,regionBuilt,mineRoute,MINE_REWARDS,MINE_SMELT} from './exploration-data.js?v=0.82.1';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.82.1';
import {knowHero,ownHero} from './hero.js?v=0.82.1';
import {requireRule,journal} from './utils.js?v=0.82.1';
export function openRegion(s){return s.exploration??={version:1,position:'entrance',visited:['entrance'],flags:[],buildings:[],pending:null,visiting:false,contacts:Object.fromEntries(Object.keys(REGION_CONTACTS).map(id=>[id,{cycles:0,earned:0}]))};}
const mark=(x,id)=>{if(!x.flags.includes(id))x.flags.push(id);};
export function regionPath(s,target){if(regionGate(s,target))return null;const start=s.exploration?.position||'entrance',queue=[[start]],seen=new Set([start]);while(queue.length){const p=queue.shift(),id=p.at(-1);if(id===target)return p;for(const next of REGION_NODES[id].links)if(!seen.has(next)&&!regionGate(s,next)){seen.add(next);queue.push([...p,next]);}}return null;}
export function regionFightQuote(s,node,approach='direct'){const n=Object.hasOwn(REGION_NODES,node)?REGION_NODES[node]:null;if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};const q=specialPlan(s,n.battle,1,mineRoute(node,approach));return {...q,reason:!['direct','orecart','timberguard'].includes(approach)||approach==='orecart'&&node!=='vault'||approach==='timberguard'&&node!=='rail'?'没有这条进攻路线。':!s.exploration||s.exploration.position!==node?'先前往'+n.name+'。':regionGate(s,node)||q.reason};}
export function regionBuildQuote(s,id){const b=REGION_BUILDINGS[id];let reason=!b?'没有这项扩建。':!s.camp?'先建立寨子。':s.exploration?.buildings.includes(id)?'已经建成。':s.camp.buildings.hall<2?'聚义厅需要 2 级。':s.camp.wood<b.wood?'营建木材不足。':s.player.silver<b.silver?'碎银不足。':Object.entries(b.items).some(([k,n])=>(s.inventory[k]||0)<n)?'地区材料不足。':'';return {model:b,reason};}
export function regionTask(s,id){if(Object.hasOwn(MINE_COMPANION_TASKS,id))return mineCompanionTask(s,id);const at=s.exploration?.position,has=k=>regionHas(s,k),done={rescue:'rescued',survey:'surveyed',meet:'met',commission:'commission',invite:'invited',cache:'cache',repair:'repair_supplies',return:'return_met',checkcart:'cart_checked',thanks:'return_paid'}[id];if(!done)return '没有这件事。';if(has(done))return '这件事已经办妥。';const place={rescue:'chamber',survey:'vein',meet:'furnace',commission:'furnace',invite:'furnace',cache:'vault',repair:'furnace',return:'furnace',checkcart:'rail',thanks:'furnace'}[id];if(at!==place)return '先前往'+REGION_NODES[place].name+'。';
 if(id==='repair'&&has('commission'))return '炉已修好，无须再领修炉料。';
 if(id==='repair'&&(!has('met')||!has('surveyed')))return '先救出老杜、勘察矿脉，再与汤隆交谈。';
 if(id==='return'&&(!has('invited')||!has('rescued')||!has('surveyed')))return '先救出老杜、勘察矿脉并邀请汤隆入寨。';
 if(id==='checkcart'&&!has('return_met'))return '先到旧炉房听老杜的口信。';
 if(id==='thanks'&&!has('won_orecart'))return '先夺回藏室里的矿车。';
 if(Object.entries(MINE_REWARDS[id]||{}).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '材料库存已满，整理后再取。';
 if(id==='rescue'&&!has('won_chamber'))return '先赶走石室门外的守卫。';
 if(id==='survey'&&!has('rescued'))return '先救出矿工。';
 if(id==='commission'){if(!has('met'))return '先与汤隆交谈。';if((s.inventory.magnetite_sand||0)<3||(s.inventory.iron||0)<2)return '修炉需要磁铁砂 3、精铁 2。'+(!has('repair_supplies')&&has('surveyed')?'老杜已在炉房备好，可取来修炉。':'救出老杜并勘察矿脉后可领一份；也可派遣补齐。');}
 if(id==='invite'&&(!has('commission')||!has('won_vault')))return '先帮汤隆修炉，再击败矿头取回工具。';
 if(id==='cache'&&!has('won_vault'))return '先击败矿头。';
 if(id==='cache'&&(s.inventory.strength_charm||0)>=10000000)return '强化符库存已满，整理后再取。';return '';}
export function explorationAction(s,d,a){requireRule(s.camp,'先建立寨子。');requireRule(!s.realm?.trek&&!s.expansion?.run&&!s.adventure?.run,'先结束当前行程。');const x=openRegion(s);
 requireRule(a.region===undefined||['mine','marsh','ruins','forest','water','mountain'].includes(a.region),'没有这个探索地区。');
 if(a.type==='regionCrossTask')return crossAction(s,a);
 if(a.type==='regionCrossWork')return crossWork(s);
 if(a.type==='regionCrossTravel'){const g=crossStep(s);requireRule(crossAvailable(s)&&g.region,'先查看故人共事的下一步。');explorationAction(s,d,{type:'regionOpen',region:g.region});return explorationAction(s,d,{type:'regionMove',region:g.region,id:g.node});}
 if(!['regionBuild','regionVisits','regionSmelt','regionDecoct','regionRevisitWork'].includes(a.type)){
  if(a.region==='mountain'){x.activeRegion='mountain';return mountainAction(s,d,a);}
  if(a.region==='water'){x.activeRegion='water';return waterAction(s,d,a);}
  if(a.region==='forest'){x.activeRegion='forest';return forestAction(s,d,a);}
  if(a.region==='ruins'){x.activeRegion='ruins';return ruinsAction(s,d,a);}
  if(a.region==='marsh'){x.activeRegion='marsh';return marshAction(s,d,a);}
  if(x.activeRegion!==undefined)x.activeRegion='mine';
 }
 if(a.type==='regionRevisitWork')return revisitWork(s,a.region);
 if(a.type==='regionDecoct')return marshDecoct(s);
 if(a.type==='regionSmelt'){const q=mineSmeltQuote(s);requireRule(!q.reason,q.reason);s.player.silver-=MINE_SMELT.silver;for(const [id,n]of Object.entries(MINE_SMELT.items))s.inventory[id]-=n;s.inventory.tempered_steel=(s.inventory.tempered_steel||0)+1;s.daily.counters.mine_smelt=1;s.daily.counters.craft_tempered_steel=(s.daily.counters.craft_tempered_steel||0)+1;journal(s,'汤隆挑去杂砂，夹出一块淬炼钢。磁铁砂 6、精铁 1、碎银 25 已用去；今日这炉只淬一块。');return;}
 if(a.type==='regionOpen')return;
 if(a.type==='regionTrade'){requireRule(x.position==='entrance'&&regionHas(s,'won_vault'),'货郎尚未在矿口开摊。');requireRule(!(s.daily.counters.region_trade>0),'今日这批精铁已换过。');requireRule(s.player.silver>=60,'需要碎银 60。');requireRule((s.inventory.iron||0)<=9999997,'精铁库存已满。');s.player.silver-=60;s.inventory.iron=(s.inventory.iron||0)+3;s.daily.counters.region_trade=1;journal(s,'货郎解开布包：精铁 3 已收好，付碎银 60。明日再来进货。');return;}
 if(a.type==='regionVisits'){requireRule(typeof a.enabled==='boolean','请选择是否顺路寻访。');x.visiting=a.enabled;journal(s,a.enabled?'派遣好汉会顺路捎信：每采集四小时带回一枚当地人物信物，最多暂存两枚。':'已停止顺路寻访，暂存信物与已走访进度保留。');return;}
 if(a.type==='regionBuild'){const q=regionBuildQuote(s,a.id);requireRule(!q.reason,q.reason);s.camp.wood-=q.model.wood;s.player.silver-=q.model.silver;for(const [id,n]of Object.entries(q.model.items))s.inventory[id]-=n;x.buildings.push(a.id);journal(s,'【营建】'+q.model.name+'建成。'+q.model.text);return;}
 if(a.type==='regionMove'){const path=regionPath(s,a.id);requireRule(path,'道路尚未走通。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);journal(s,'抵达旧矿洞 · '+REGION_NODES[a.id].name+'。');return;}
 if(a.type==='regionBattle'){const approach=a.approach===undefined?'direct':a.approach,q=regionFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);const n=REGION_NODES[a.id];enterSpecial(s,d,{id:n.battle,tier:1,route:mineRoute(a.id,approach)});x.pending={node:a.id,...(approach!=='direct'?{approach}:{})};return;}
 requireRule(a.type==='regionDo','没有这项区域事务。');if(Object.hasOwn(MINE_COMPANION_TASKS,a.id))return mineCompanionAction(s,d,a.id);const reason=regionTask(s,a.id);requireRule(!reason,reason);
 for(const [id,n]of Object.entries(MINE_REWARDS[a.id]||{}))s.inventory[id]=(s.inventory[id]||0)+n;
 if(a.id==='repair'){mark(x,'repair_supplies');journal(s,'老杜把小筐推过来：“这三份矿砂挑过了，两块铁也拿去。别再摸黑进矿道找。”磁铁砂 3、精铁 2 已收好，只领这一次。');}
 if(a.id==='return'){mark(x,'return_met');journal(s,'汤隆拿着半截车轴：“老杜送来的。昨夜矿车没回来，拉车的人说，岔口有人等着。先去轨道上看看。”');}
 if(a.id==='checkcart'){mark(x,'cart_checked');journal(s,'车辙拐进了藏室，地上散着新打的铁扣。汤隆捡起一枚：“他们拿我们的铁补甲。先截住后头送料的，头目就撑不久。”截矿夺车已开放，可重复挑战。');}
 if(a.id==='thanks'){mark(x,'return_paid');journal(s,'汤隆敲开一块矿样，老杜凑近看了看：“这层矿不错，杂石得挑净。”你收下磁铁砂 4、汤隆信物 2、淬炼钢 1；矿砂炉可每日选矿淬料一次。这份矿样只取一次。');}
 if(a.id==='meet'){knowHero(s,'tanglong','known',d);mark(x,'met');journal(s,'汤隆放下铁钳：“炉膛裂了，帮我找三份磁铁砂、两块精铁。修好它，咱们去取回被矿头扣下的家伙。”');}
 if(a.id==='commission'){s.inventory.magnetite_sand-=3;s.inventory.iron-=2;mark(x,'commission');journal(s,'汤隆补好炉膛，把火钳别在腰后：“藏室就在里头。梯子已经露出来了，不必再在外头兜圈子。”');}
 if(a.id==='rescue'){mark(x,'rescued');journal(s,'你撬开木梁，把老杜拉出石室。他指了指壁后的窄缝：“那边还有矿。等腿养好，我去寨里教你的人认石头。”老杜已回寨，深层矿脉可以前往。');}
 if(a.id==='survey'){mark(x,'surveyed');journal(s,'你沿水沟敲开封石，给矿脉立了记号。之后旧矿洞派遣每批磁铁砂增加 1 份；已有暂存不补发。');}
 if(a.id==='invite'){mark(x,'invited');if(s.heroes.tanglong.status==='owned'){journal(s,'汤隆收齐工具：“人早就在你寨里了，这回把炉火也接上。”这段委托已完成。');}else{ownHero(s,'tanglong',d);journal(s,'汤隆背上工具箱：“往后修枪打铁，算我一个。”未消耗招贤令。');}}
 if(a.id==='cache'){mark(x,'cache');s.inventory.strength_charm=(s.inventory.strength_charm||0)+1;journal(s,'工具箱下压着一张强化符，已收好。这处藏物只取一次。');}
}
export function finishExploration(s,b){if(s.exploration?.mountain?.pending)return finishMountain(s,b);if(s.exploration?.water?.pending)return finishWater(s,b);if(s.exploration?.forest?.pending)return finishForest(s,b);if(s.exploration?.ruins?.pending)return finishRuins(s,b);if(s.exploration?.marsh?.pending)return finishMarsh(s,b);const x=s.exploration;if(!x?.pending)return;const n=x.pending.node,m=REGION_NODES[n];requireRule(b.context.type==='special'&&b.context.id===m.battle&&b.context.tier===1&&b.context.route===mineRoute(n,x.pending.approach),'区域战斗与记录不符。');if(b.outcome==='victory'){mark(x,'won_'+n);if(n==='vault'&&x.pending.approach!=='orecart')journal(s,'矿头退走，矿口的货郎回来支摊。老杜的工具也找齐了，可以回炉房找汤隆。');}x.pending=null;}
export function accrueContacts(s,m,cycles){const x=s.exploration;if(!x?.visiting||!cycles)return;const p=x.contacts[m.region],token=REGION_CONTACTS[m.region]+'_token',total=p.cycles+cycles,earned=Math.min(2-(s.idleDispatch.bank[token]||0),Math.floor(total/8),10000000-p.earned);p.cycles=total%8;if(earned>0){s.idleDispatch.bank[token]=(s.idleDispatch.bank[token]||0)+earned;s.idleDispatch.earned+=earned;p.earned+=earned;}}

export function mineSmeltQuote(s){const r=MINE_SMELT;return {reason:!s.camp?'先建立寨子。':s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run?'先结束交战或行程。':!regionHas(s,'return_paid')?'先夺回矿车，回炉房请汤隆验矿。':!regionBuilt(s,'forge')?'先建好矿砂炉。':(s.daily.counters.mine_smelt||0)>=1?'今日已淬过一块，明日再来。':(s.daily.counters.craft_tempered_steel||0)>=8?'今日淬钢加工次数已用完。':(s.inventory.tempered_steel||0)>=10000000?'淬炼钢库存已满。':s.player.silver<r.silver?'需要碎银 25。':Object.entries(r.items).some(([id,n])=>(s.inventory[id]||0)<n)?'需要磁铁砂 6、精铁 1。':''};}
