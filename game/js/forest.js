import {revisitAction,revisitTask} from './region-revisit.js?v=0.82.0';
import {FOREST_NODES,forestHas,forestGate,forestLinks,forestRoute} from './forest-data.js?v=0.82.0';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.82.0';
import {ensureGathering} from './gathering.js?v=0.82.0';
import {knowHero,ownHero} from './hero.js?v=0.82.0';
import {requireRule,journal} from './utils.js?v=0.82.0';
export function openForest(s){return s.exploration.forest??={version:1,position:'post',visited:['post'],flags:[],pending:null};}
export function forestPath(s,target){
 if(forestGate(s,target))return null;const start=s.exploration?.forest?.position||'post',queue=[[start]],seen=new Set([start]);
 while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const next of forestLinks(s,id))if(!seen.has(next)&&!forestGate(s,next)){seen.add(next);queue.push([...path,next]);}}return null;
}
export function forestFightQuote(s,id,approach='frontal'){
 const n=Object.hasOwn(FOREST_NODES,id)?FOREST_NODES[id]:null;if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};
 const q=specialPlan(s,n.battle,1,forestRoute(id,approach));
 return {...q,reason:approach==='crossfire'&&id!=='camp'?'没有这条进攻路线。':!['frontal','quiet','crossfire'].includes(approach)||approach==='quiet'&&id!=='camp'?'没有这条进攻路线。':s.exploration?.forest?.position!==id?'先前往'+n.name+'。':forestGate(s,id)||q.reason};
}
const TASKS={meet:{place:'post',flag:'met'},scout:{place:'watch',flag:'scouted'},tend:{place:'ridge',flag:'tended',rewards:{mountain_vine:3}},sabotage:{place:'trail',flag:'sabotaged',items:{mountain_vine:2}},cargo:{place:'camp',flag:'cargo',rewards:{cloth:4,leather:2}},invite:{place:'post',flag:'invited'}};
export function forestTask(s,id){const revisit=revisitTask(s,'forest',id);if(revisit!==null)return revisit;
 const t=Object.hasOwn(TASKS,id)?TASKS[id]:null;if(!t)return '没有这件事。';if(forestHas(s,t.flag))return '这件事已经办妥。';if(s.exploration?.forest?.position!==t.place)return '先前往'+FOREST_NODES[t.place].name+'。';
 if(id==='scout'&&!forestHas(s,'met'))return '先去茶棚与时迁交谈。';
 if(['scout','tend'].includes(id)&&!forestHas(s,'won_fork')&&!forestHas(s,'won_watch'))return '先清出运货岔路或松林哨台。';
 if(id==='sabotage'&&!forestHas(s,'scouted'))return '先跟时迁查明哨位。';
 if(id==='cargo'&&!forestHas(s,'won_camp'))return '先击败藏货营地头目。';
 if(id==='invite'&&!forestHas(s,'cargo'))return '先从营地取回商队货物。';
 if(Object.entries(t.items||{}).some(([k,n])=>(s.inventory[k]||0)<n))return '需要山藤 2。可去老藤坡取藤，也可挑战岔路或派遣采集。';
 if(Object.entries(t.rewards||{}).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '材料库存已满，整理后再取。';return '';
}
export function forestAction(s,d,a){const x=openForest(s);
 if(a.type==='regionOpen')return;
 if(a.type==='regionMove'){const path=forestPath(s,a.id);requireRule(path,'道路尚未走通。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);journal(s,'抵达青石古道 · '+FOREST_NODES[a.id].name+'。');return;}
 if(a.type==='regionBattle'){const approach=a.approach===undefined?'frontal':a.approach,q=forestFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);enterSpecial(s,d,{id:FOREST_NODES[a.id].battle,tier:1,route:forestRoute(a.id,approach)});x.pending={node:a.id,approach};return;}
 requireRule(a.type==='regionDo','没有这项古道事务。');const reason=forestTask(s,a.id);requireRule(!reason,reason);if(revisitAction(s,'forest',a.id))return;const t=TASKS[a.id];
 if(a.id==='tend')ensureGathering(s);for(const [k,n]of Object.entries(t.items||{}))s.inventory[k]-=n;for(const [k,n]of Object.entries(t.rewards||{}))s.inventory[k]=(s.inventory[k]||0)+n;x.flags.push(t.flag);
 if(a.id==='meet'){knowHero(s,'shiqian','known',d);journal(s,'时迁把断绳递给你：“货没走远。你清出路口，我去看看他们把东西藏在哪儿。”');}
 if(a.id==='scout')journal(s,'时迁从树上滑下来：“铃绳绕着坡走，后边能进去。”他用树枝画出一条小路，茶棚与营后之间的捷径已标在图上。');
 if(a.id==='tend')journal(s,'你留住老根，只割下三束长藤，又给采藤人留了记号。山藤 3 已入囊；此后古道派遣每批山藤额外 +1，原有暂存不补发。');
 if(a.id==='sabotage')journal(s,'时迁用两束山藤固定铃舌，又把牵绳埋回落叶下：“进营别走正门。”后路已备好，以后可选择潜入，头目无法号令齐射。');
 if(a.id==='cargo')journal(s,'你把货箱送回茶棚。掌柜清点完，留下粗布 4、皮革 2 作谢礼，重新摆开了货摊。这份谢礼只收一次。');
 if(a.id==='invite'){
  if(s.heroes.shiqian.status==='owned')journal(s,'时迁在肩上搭好包袱：“回寨吧，这条路我认熟了。”委托已完成，原有培养保留，不重复发人物或信物。');
  else{ownHero(s,'shiqian',d);journal(s,'时迁拍拍衣上的土：“跟你们走。今后探路送信，叫我一声就成。”未消耗招贤令。');}
  journal(s,'客舍建成后，时迁教人裁藤缝衣：斥候短褐少用山藤 1，古道派遣每批皮革 +1。');
 }
}
export function finishForest(s,b){const x=s.exploration?.forest;if(!x?.pending)return;const {node,approach}=x.pending,n=FOREST_NODES[node];requireRule(b.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===forestRoute(node,approach),'古道战斗与记录不符。');if(b.outcome==='victory'){if(!x.flags.includes('won_'+node))x.flags.push('won_'+node);if(node==='camp'&&approach!=='crossfire')journal(s,'营里的人散了，货箱就在棚下。取回货物，再去茶棚找时迁。');}x.pending=null;}
