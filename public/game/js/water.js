import {revisitAction,revisitTask} from './region-revisit.js?v=0.82.2';
import {WATER_NODES,waterHas,waterGate,waterLinks,waterRoute} from './water-data.js?v=0.82.2';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.82.2';
import {ensureGathering} from './gathering.js?v=0.82.2';
import {knowHero,ownHero} from './hero.js?v=0.82.2';
import {requireRule,journal} from './utils.js?v=0.82.2';
export function openWater(s){return s.exploration.water??={version:1,position:'dock',visited:['dock'],flags:[],pending:null};}
export function waterPath(s,target){
 if(waterGate(s,target))return null;const start=s.exploration?.water?.position||'dock',queue=[[start]],seen=new Set([start]);
 while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const next of waterLinks(s,id))if(!seen.has(next)&&!waterGate(s,next)){seen.add(next);queue.push([...path,next]);}}return null;
}
export function waterFightQuote(s,id,approach='direct'){
 const n=Object.hasOwn(WATER_NODES,id)?WATER_NODES[id]:null;if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};
 const q=specialPlan(s,n.battle,1,waterRoute(id,approach));
 return {...q,reason:['medicineboat','backwash'].includes(approach)&&id!=='fort'?'没有这条进攻路线。':!['direct','moored','backwash','medicineboat'].includes(approach)||approach==='moored'&&id!=='fort'?'没有这条进攻路线。':s.exploration?.water?.position!==id?'先前往'+n.name+'。':waterGate(s,id)||q.reason};
}
const TASKS={meet:{place:'dock',flag:'met'},chart:{place:'bend',flag:'charted'},tend:{place:'reeds',flag:'tended',rewards:{reed_fiber:4}},moor:{place:'stakes',flag:'moored',items:{reed_fiber:3,wood:2}},rescue:{place:'fort',flag:'rescued',rewards:{woven_linen:1,herb:3}},invite:{place:'dock',flag:'invited'}};
export function waterTask(s,id){const revisit=revisitTask(s,'water',id);if(revisit!==null)return revisit;
 const t=Object.hasOwn(TASKS,id)?TASKS[id]:null;if(!t)return '没有这件事。';if(waterHas(s,t.flag))return '这件事已经办妥。';if(s.exploration?.water?.position!==t.place)return '先前往'+WATER_NODES[t.place].name+'。';
 if(id==='chart'&&!waterHas(s,'met'))return '先到鱼棚与阮小七交谈。';
 if(['chart','tend'].includes(id)&&!waterHas(s,'won_shoal')&&!waterHas(s,'won_bend'))return '先清出芦岸浅滩或回水湾。';
 if(id==='moor'&&!waterHas(s,'charted'))return '先跟阮小七测明水道。';
 if(id==='rescue'&&!waterHas(s,'won_fort'))return '先击败水寨头目。';
 if(id==='invite'&&!waterHas(s,'rescued'))return '先从水寨救出船户。';
 if(Object.entries(t.items||{}).some(([k,n])=>(s.inventory[k]||0)<n))return '需要苇丝 3、行囊木材 2。苇丝可在苇滩取得，木材可在行囊集市购买。';
 if(Object.entries(t.rewards||{}).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '材料库存已满，整理后再取。';return '';
}
export function waterAction(s,d,a){const x=openWater(s);
 if(a.type==='regionOpen')return;
 if(a.type==='regionMove'){const path=waterPath(s,a.id);requireRule(path,'水路尚未探明。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);journal(s,'抵达芦荡渡口 · '+WATER_NODES[a.id].name+'。');return;}
 if(a.type==='regionBattle'){const approach=a.approach===undefined?'direct':a.approach,q=waterFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);enterSpecial(s,d,{id:WATER_NODES[a.id].battle,tier:1,route:waterRoute(a.id,approach)});x.pending={node:a.id,approach};return;}
 requireRule(a.type==='regionDo','没有这项渡口事务。');const reason=waterTask(s,a.id);requireRule(!reason,reason);if(revisitAction(s,'water',a.id))return;const t=TASKS[a.id];
 if(a.id==='tend')ensureGathering(s);for(const [k,n]of Object.entries(t.items||{}))s.inventory[k]-=n;for(const [k,n]of Object.entries(t.rewards||{}))s.inventory[k]=(s.inventory[k]||0)+n;x.flags.push(t.flag);
 if(a.id==='meet'){knowHero(s,'ruanxiaoqi','known',d);journal(s,'阮小七收起网针：“那几个船户还扣在对岸。你替我清开浅滩，我带你认水路。”');}
 if(a.id==='chart')journal(s,'阮小七把篙插在湾口：“顺这边走，别往漩里去。鱼棚后头还有条近水道。”去水寨与旧泊船桩的路已标明。');
 if(a.id==='tend')journal(s,'你割下四束老苇，在新芽旁插了记号。苇丝 4 已入囊；此后渡口派遣每批苇丝额外 +1，原有暂存不补发。');
 if(a.id==='moor')journal(s,'你们换了两根横木，用三束苇丝拧好缆绳。阮小七拽了几下：“这下吃得住浪。”以后攻寨可系缆稳船，不再重复耗料。');
 if(a.id==='rescue')journal(s,'船户解开船绳，划回鱼棚。船老大从包里取出密织麻布 1、药草 3：“别推了，路上用得着。”渡船重新开张，这份谢礼只收一次。');
 if(a.id==='invite'){
  if(s.heroes.ruanxiaoqi.status==='owned')journal(s,'阮小七把船拴好：“人齐了，回寨。”渡口的事已经办妥，原有培养保留，不重复发人物或信物。');
  else{ownHero(s,'ruanxiaoqi',d);journal(s,'阮小七卷起渔网：“往后水上的事，算我一个。”他随你回寨，未消耗招贤令。');}
  journal(s,'配药间建成后，阮小七教人拧苇绳、编药包：野营药包少用苇丝 1，渡口派遣每批粗布 +1。');
 }
}
export function finishWater(s,b){const x=s.exploration?.water;if(!x?.pending)return;const {node,approach}=x.pending,n=WATER_NODES[node];requireRule(b.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===waterRoute(node,approach),'渡口战斗与记录不符。');if(b.outcome==='victory'){if(!x.flags.includes('won_'+node))x.flags.push('won_'+node);if(node==='fort'&&!['backwash','medicineboat'].includes(approach))journal(s,'头目弃船逃了。去栈桥解开船绳，送船户回鱼棚。');}x.pending=null;}
