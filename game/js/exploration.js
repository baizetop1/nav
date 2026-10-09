import {marshAction,finishMarsh} from './marsh.js?v=0.69.0';
import {REGION_NODES,REGION_BUILDINGS,REGION_CONTACTS,regionHas,regionGate} from './exploration-data.js?v=0.69.0';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.69.0';
import {knowHero,ownHero} from './hero.js?v=0.69.0';
import {requireRule,journal} from './utils.js?v=0.69.0';
export function openRegion(s){return s.exploration??={version:1,position:'entrance',visited:['entrance'],flags:[],buildings:[],pending:null,visiting:false,contacts:Object.fromEntries(Object.keys(REGION_CONTACTS).map(id=>[id,{cycles:0,earned:0}]))};}
const mark=(x,id)=>{if(!x.flags.includes(id))x.flags.push(id);};
export function regionPath(s,target){if(regionGate(s,target))return null;const start=s.exploration?.position||'entrance',queue=[[start]],seen=new Set([start]);while(queue.length){const p=queue.shift(),id=p.at(-1);if(id===target)return p;for(const next of REGION_NODES[id].links)if(!seen.has(next)&&!regionGate(s,next)){seen.add(next);queue.push([...p,next]);}}return null;}
export function regionFightQuote(s,node){const n=REGION_NODES[node];if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};const q=specialPlan(s,n.battle,1,n.route);return {...q,reason:!s.exploration||s.exploration.position!==node?'先前往'+n.name+'。':regionGate(s,node)||q.reason};}
export function regionBuildQuote(s,id){const b=REGION_BUILDINGS[id];let reason=!b?'没有这项扩建。':!s.camp?'先建立寨子。':s.exploration?.buildings.includes(id)?'已经建成。':s.camp.buildings.hall<2?'聚义厅需要 2 级。':s.camp.wood<b.wood?'营建木材不足。':s.player.silver<b.silver?'碎银不足。':Object.entries(b.items).some(([k,n])=>(s.inventory[k]||0)<n)?'地区材料不足。':'';return {model:b,reason};}
export function regionTask(s,id){const at=s.exploration?.position,has=k=>regionHas(s,k),done={rescue:'rescued',survey:'surveyed',meet:'met',commission:'commission',invite:'invited',cache:'cache'}[id];if(!done)return '没有这件事。';if(has(done))return '这件事已经办妥。';const place={rescue:'chamber',survey:'vein',meet:'furnace',commission:'furnace',invite:'furnace',cache:'vault'}[id];if(at!==place)return '先前往'+REGION_NODES[place].name+'。';
 if(id==='rescue'&&!has('won_chamber'))return '先赶走石室门外的守卫。';
 if(id==='survey'&&!has('rescued'))return '先救出矿工。';
 if(id==='commission'){if(!has('met'))return '先与汤隆交谈。';if((s.inventory.magnetite_sand||0)<3||(s.inventory.iron||0)<2)return '修炉需要磁铁砂 3、精铁 2。通关运矿道后，可派空闲好汉采集矿砂。';}
 if(id==='invite'&&(!has('commission')||!has('won_vault')))return '先帮汤隆修炉，再击败矿头取回工具。';
 if(id==='cache'&&!has('won_vault'))return '先击败矿头。';
 if(id==='cache'&&(s.inventory.strength_charm||0)>=10000000)return '强化符库存已满，整理后再取。';return '';}
export function explorationAction(s,d,a){requireRule(s.camp,'先建立寨子。');requireRule(!s.realm?.trek&&!s.expansion?.run&&!s.adventure?.run,'先结束当前行程。');const x=openRegion(s);
 requireRule(a.region===undefined||['mine','marsh'].includes(a.region),'没有这个探索地区。');
 if(!['regionBuild','regionVisits'].includes(a.type)){
  if(a.region==='marsh'){x.activeRegion='marsh';return marshAction(s,d,a);}
  if(x.activeRegion!==undefined)x.activeRegion='mine';
 }
 if(a.type==='regionOpen')return;
 if(a.type==='regionTrade'){requireRule(x.position==='entrance'&&regionHas(s,'won_vault'),'货郎尚未在矿口开摊。');requireRule(!(s.daily.counters.region_trade>0),'今日这批精铁已换过。');requireRule(s.player.silver>=60,'需要碎银 60。');requireRule((s.inventory.iron||0)<=9999997,'精铁库存已满。');s.player.silver-=60;s.inventory.iron=(s.inventory.iron||0)+3;s.daily.counters.region_trade=1;journal(s,'货郎解开布包：精铁 3 已收好，付碎银 60。明日再来进货。');return;}
 if(a.type==='regionVisits'){requireRule(typeof a.enabled==='boolean','请选择是否顺路寻访。');x.visiting=a.enabled;journal(s,a.enabled?'派遣好汉会顺路捎信：每采集四小时带回一枚当地人物信物，最多暂存两枚。':'已停止顺路寻访，暂存信物与已走访进度保留。');return;}
 if(a.type==='regionBuild'){const q=regionBuildQuote(s,a.id);requireRule(!q.reason,q.reason);s.camp.wood-=q.model.wood;s.player.silver-=q.model.silver;for(const [id,n]of Object.entries(q.model.items))s.inventory[id]-=n;x.buildings.push(a.id);journal(s,'【营建】'+q.model.name+'建成。'+q.model.text);return;}
 if(a.type==='regionMove'){const path=regionPath(s,a.id);requireRule(path,'道路尚未走通。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);journal(s,'抵达旧矿洞 · '+REGION_NODES[a.id].name+'。');return;}
 if(a.type==='regionBattle'){const q=regionFightQuote(s,a.id);requireRule(!q.reason,q.reason);const n=REGION_NODES[a.id];enterSpecial(s,d,{id:n.battle,tier:1,route:n.route});x.pending={node:a.id};return;}
 requireRule(a.type==='regionDo','没有这项区域事务。');const reason=regionTask(s,a.id);requireRule(!reason,reason);
 if(a.id==='meet'){knowHero(s,'tanglong','known',d);mark(x,'met');journal(s,'汤隆放下铁钳：“炉膛裂了，帮我找三份磁铁砂、两块精铁。修好它，咱们去取回被矿头扣下的家伙。”');}
 if(a.id==='commission'){s.inventory.magnetite_sand-=3;s.inventory.iron-=2;mark(x,'commission');journal(s,'汤隆补好炉膛，把火钳别在腰后：“藏室就在里头。守卫换了几回岗，得摸清时辰再进去。”');}
 if(a.id==='rescue'){mark(x,'rescued');journal(s,'你撬开木梁，把老杜拉出石室。他指了指壁后的窄缝：“那边还有矿。等腿养好，我去寨里教你的人认石头。”老杜已回寨，深层矿脉可以前往。');}
 if(a.id==='survey'){mark(x,'surveyed');journal(s,'你沿水沟敲开封石，给矿脉立了记号。之后旧矿洞派遣每批磁铁砂增加 1 份；已有暂存不补发。');}
 if(a.id==='invite'){mark(x,'invited');if(s.heroes.tanglong.status==='owned'){journal(s,'汤隆收齐工具：“人早就在你寨里了，这回把炉火也接上。”这段委托已完成。');}else{ownHero(s,'tanglong',d);journal(s,'汤隆背上工具箱：“往后修枪打铁，算我一个。”未消耗招贤令。');}}
 if(a.id==='cache'){mark(x,'cache');s.inventory.strength_charm=(s.inventory.strength_charm||0)+1;journal(s,'工具箱下压着一张强化符，已收好。这处藏物只取一次。');}
}
export function finishExploration(s,b){if(s.exploration?.marsh?.pending)return finishMarsh(s,b);const x=s.exploration;if(!x?.pending)return;const n=x.pending.node,m=REGION_NODES[n];requireRule(b.context.type==='special'&&b.context.id===m.battle&&b.context.route===m.route,'区域战斗与记录不符。');if(b.outcome==='victory'){mark(x,'won_'+n);if(n==='vault')journal(s,'矿头退走，矿口的货郎回来支摊。老杜的工具也找齐了，可以回炉房找汤隆。');}x.pending=null;}
export function accrueContacts(s,m,cycles){const x=s.exploration;if(!x?.visiting||!cycles)return;const p=x.contacts[m.region],token=REGION_CONTACTS[m.region]+'_token',total=p.cycles+cycles,earned=Math.min(2-(s.idleDispatch.bank[token]||0),Math.floor(total/8),10000000-p.earned);p.cycles=total%8;if(earned>0){s.idleDispatch.bank[token]=(s.idleDispatch.bank[token]||0)+earned;s.idleDispatch.earned+=earned;p.earned+=earned;}}
