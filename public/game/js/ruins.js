import {revisitAction,revisitTask} from './region-revisit.js?v=0.82.0';
import {RUINS_NODES,ruinsHas,ruinsGate,ruinsLinks,ruinsRoute} from './ruins-data.js?v=0.82.0';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.82.0';
import {knowHero,ownHero} from './hero.js?v=0.82.0';
import {requireRule,journal} from './utils.js?v=0.82.0';
export function openRuins(s){return s.exploration.ruins??={version:1,position:'gate',visited:['gate'],flags:[],pending:null};}
export function ruinsPath(s,target){
 if(ruinsGate(s,target))return null;
 const start=s.exploration?.ruins?.position||'gate',queue=[[start]],seen=new Set([start]);
 while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const next of ruinsLinks(s,id))if(!seen.has(next)&&!ruinsGate(s,next)){seen.add(next);queue.push([...path,next]);}}
 return null;
}
export function ruinsFightQuote(s,id,approach='direct'){
 const n=Object.hasOwn(RUINS_NODES,id)?RUINS_NODES[id]:null;
 if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};
 const q=specialPlan(s,n.battle,1,ruinsRoute(id,approach));
 return {...q,reason:!['direct','bellbreak'].includes(approach)||approach==='bellbreak'&&id!=='vault'?'没有这条进攻路线。':s.exploration?.ruins?.position!==id?'先前往'+n.name+'。':ruinsGate(s,id)||q.reason};
}
const TASKS={paper:{place:'bell',flag:'rubbing_supplies',rewards:{cloth:2}},meet:{place:'bell',flag:'met'},listen:{place:'bell',flag:'heard'},rubbing:{place:'stele',flag:'rubbed',items:{cloth:2},rewards:{stone_rubbing:4}},invite:{place:'bell',flag:'invited'},cache:{place:'vault',flag:'cache',rewards:{skill_page:2,martial_pages:3}}};
export function ruinsTask(s,id){const revisit=revisitTask(s,'ruins',id);if(revisit!==null)return revisit;
 const t=Object.hasOwn(TASKS,id)?TASKS[id]:null;
 if(!t)return '没有这件事。';
 if(ruinsHas(s,t.flag))return '这件事已经办妥。';
 if(s.exploration?.ruins?.position!==t.place)return '先前往'+RUINS_NODES[t.place].name+'。';
 if(id==='listen'){
  if(!ruinsHas(s,'met'))return '先与乐和交谈。';
  if(!ruinsHas(s,'won_court')&&!ruinsHas(s,'won_passage'))return '先清出破殿或夹道，免得脚步声盖住回声。';
 }
 if(id==='paper'&&(!ruinsHas(s,'heard')||ruinsHas(s,'rubbed')))return '先听声辨路；已拓碑后不再领取这份布。';
 if(id==='rubbing'&&!ruinsHas(s,'heard'))return '先到残钟楼听声辨路。';
 if((id==='invite'||id==='cache')&&!ruinsHas(s,'won_vault'))return '先击败内室头目，找回谱册和书箱。';
 if(t.items&&Object.entries(t.items).some(([key,n])=>(s.inventory[key]||0)<n))return '需要粗布 2。回声夹道胜利必得粗布 2，也可派遣采集。';
 if(Object.entries(t.rewards||{}).some(([key,n])=>(s.inventory[key]||0)+n>10000000))return '书页或拓片库存已满，整理后再取。';
 return '';
}
export function ruinsAction(s,d,a){
 const x=openRuins(s);
 if(a.type==='regionOpen')return;
 if(a.type==='regionMove'){
  const path=ruinsPath(s,a.id);requireRule(path,'道路尚未走通。');x.position=a.id;
  for(const id of path)if(!x.visited.includes(id))x.visited.push(id);
  journal(s,'抵达荒祠地宫 · '+RUINS_NODES[a.id].name+'。');return;
 }
 if(a.type==='regionBattle'){
  const approach=a.approach===undefined?'direct':a.approach,q=ruinsFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);const n=RUINS_NODES[a.id];
  enterSpecial(s,d,{id:n.battle,tier:1,route:ruinsRoute(a.id,approach)});x.pending={node:a.id,...(approach==='bellbreak'?{approach}:{})};return;
 }
 requireRule(a.type==='regionDo','没有这项荒祠事务。');const reason=ruinsTask(s,a.id);requireRule(!reason,reason);
 if(revisitAction(s,'ruins',a.id))return;const t=TASKS[a.id];for(const [key,n]of Object.entries(t.items||{}))s.inventory[key]-=n;
 for(const [key,n]of Object.entries(t.rewards||{}))s.inventory[key]=(s.inventory[key]||0)+n;
 x.flags.push(t.flag);
 if(a.id==='meet'){knowHero(s,'yuehe','known',d);journal(s,'乐和收起笛子：“他们抢了我一本谱，还拿钟声传号。你清出一条路，我听听那声音从哪里来。”');}
 if(a.id==='listen')journal(s,'乐和敲了敲钟沿，又走到东墙边：“这里回声近，墙后是空的。”拨开藤蔓，果然露出一道矮门。山门通往残碑石室的暗道已标在图上。');
 if(a.id==='paper')journal(s,'乐和从谱册包布上裁下两块干净粗布：“先用这个拓，别空着手下去。”只取这一次。');
 if(a.id==='rubbing')journal(s,'你擦去碑上的泥灰，用粗布拓下四份碑文。乐和循着刻痕找到了内室石阶。今后荒祠派遣每批旧碑拓片额外 +1；此前暂存不补发。');
 if(a.id==='cache')journal(s,'书箱底还有基础技能残页 2、武学残页 3，已收进行囊。这箱书只取一次。');
 if(a.id==='invite'){
  if(s.heroes.yuehe.status==='owned')journal(s,'乐和把谱册揣好：“走，回寨。你们拓下的碑文，我再抄一份。”这段委托已完成，不重复发人物或信物。');
  else{ownHero(s,'yuehe',d);journal(s,'乐和翻看找回的谱册：“这趟多亏你们。我跟你回寨，闲时也能教大家认几个字。”未消耗招贤令。');}
  journal(s,'客舍建成后，乐和帮忙整理碑文：地区武学残页配方少用拓片 1，荒祠派遣每批粗布 +1。');
 }
}
export function finishRuins(s,b){
 const x=s.exploration?.ruins;if(!x?.pending)return;
 const id=x.pending.node,n=RUINS_NODES[id];
 requireRule(b.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===ruinsRoute(id,x.pending.approach),'荒祠战斗与记录不符。');
 if(b.outcome==='victory'){
  if(!x.flags.includes('won_'+id))x.flags.push('won_'+id);
  if(id==='vault'&&x.pending.approach!=='bellbreak')journal(s,'头目退去，谱册找到了。书箱里还有几页拳脚图谱，带上它们再回钟楼。');
 }
 x.pending=null;
}
