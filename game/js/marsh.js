import {WORKSHOP_RECIPES} from './supplies-data.js?v=0.91.0';
import {MARSH_NODES,marshHas,marshGate,marshRoute,MARSH_REWARDS,MARSH_DECOCT} from './marsh-data.js?v=0.91.0';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.91.0';
import {knowHero,ownHero} from './hero.js?v=0.91.0';
import {requireRule,journal} from './utils.js?v=0.91.0';
export function openMarsh(s){return s.exploration.marsh??={version:1,position:'landing',visited:['landing'],flags:[],pending:null};}
const mark=(x,id)=>{if(!x.flags.includes(id))x.flags.push(id);};
export function marshPath(s,target){
 if(marshGate(s,target))return null;
 const start=s.exploration?.marsh?.position||'landing',queue=[[start]],seen=new Set([start]);
 while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const next of MARSH_NODES[id].links)if(!seen.has(next)&&!marshGate(s,next)){seen.add(next);queue.push([...path,next]);}}
 return null;
}
export function marshFightQuote(s,id,approach='direct'){
 const n=Object.hasOwn(MARSH_NODES,id)?MARSH_NODES[id]:null;
 if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};
 const q=specialPlan(s,n.battle,1,marshRoute(id,approach));
 return {...q,reason:!['direct','reedvenom'].includes(approach)||approach==='reedvenom'&&id!=='nest'?'没有这条进攻路线。':s.exploration?.marsh?.position!==id?'先前往'+n.name+'。':marshGate(s,id)||q.reason};
}
const TASKS={meet:{place:'hut',flag:'met'},treatHerbs:{place:'hut',flag:'rescued',items:{herb:6,cloth:2}},treatAntidote:{place:'hut',flag:'rescued',items:{jiedudan:1}},tend:{place:'garden',flag:'tended',items:{wood:3,cloth:1}},invite:{place:'hut',flag:'invited'},cache:{place:'nest',flag:'cache'},supplies:{place:'hut',flag:'care_supplies'},return:{place:'hut',flag:'return_met'},checkwater:{place:'garden',flag:'source_checked'},thanks:{place:'hut',flag:'return_paid'}};
export function marshTask(s,id){
 const t=Object.hasOwn(TASKS,id)?TASKS[id]:null;
 if(!t)return '没有这件事。';
 if(marshHas(s,t.flag))return '这件事已经办妥。';
 if(s.exploration?.marsh?.position!==t.place)return '先前往'+MARSH_NODES[t.place].name+'。';
 if(id==='supplies'){
  if(marshHas(s,'rescued'))return '药农已经救治，无须再领这份药料。';
  if(!marshHas(s,'met')||!marshHas(s,'won_reeds')&&!marshHas(s,'won_poison'))return '先见过安道全，再清出一条水路。';
 }
 if(id==='return'&&!marshHas(s,'invited'))return '先取回药箱，邀请安道全入寨。';
 if(id==='checkwater'&&!marshHas(s,'return_met'))return '先回草庐听冯伯的口信。';
 if(id==='thanks'&&!marshHas(s,'won_reedvenom'))return '先到沉船清渠除蛇。';
 if(Object.entries(MARSH_REWARDS[id]||{}).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '药料库存已满，整理后再取。';
 if(t.flag==='rescued'){
  if(!marshHas(s,'met'))return '先与安道全交谈。';
  if(!marshHas(s,'won_reeds')&&!marshHas(s,'won_poison'))return '先清出一条水路，免得送药途中又被蛇群拦住。';
 }
 if(id==='tend'&&!marshHas(s,'rescued'))return '先救治药农。';
 if((id==='invite'||id==='cache')&&!marshHas(s,'won_nest'))return '先打退沉船里的蛇群，取回药箱。';
 if(t.items&&Object.entries(t.items).some(([k,n])=>(s.inventory[k]||0)<n))return id==='treatAntidote'?'需要解毒丹 1。也可改用药草与粗布救治。':id==='treatHerbs'?'需要药草 6、粗布 2。药草可在两条水路挑战或派遣采集中取得。':'需要木材 3、粗布 1。使用行囊材料，不扣营建木材。';
 if(id==='cache'&&['medicinal_extract','jiedudan'].some(k=>(s.inventory[k]||0)>9999998))return '药材或解毒丹库存已满，整理后再取。';
 return '';
}
export function marshAction(s,d,a){
 const x=openMarsh(s);
 if(a.type==='regionOpen')return;
 if(a.type==='regionMove'){
  const path=marshPath(s,a.id);requireRule(path,'道路尚未走通。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);
  journal(s,'抵达芦苇泽 · '+MARSH_NODES[a.id].name+'。');return;
 }
 if(a.type==='regionBattle'){
  const approach=a.approach===undefined?'direct':a.approach,q=marshFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);const n=MARSH_NODES[a.id];
  enterSpecial(s,d,{id:n.battle,tier:1,route:marshRoute(a.id,approach)});x.pending={node:a.id,...(approach==='reedvenom'?{approach}:{})};return;
 }
 requireRule(a.type==='regionDo','没有这项芦苇泽事务。');const reason=marshTask(s,a.id);requireRule(!reason,reason);
 for(const [id,n]of Object.entries(MARSH_REWARDS[a.id]||{}))s.inventory[id]=(s.inventory[id]||0)+n;
 if(a.id==='supplies')journal(s,'安道全指了指门后的木箱：“有干药，也有干净布。先拿来救人，木条带去修水沟。”药草 6、粗布 3、木料 3 已收好，只取这一次。');
 if(a.id==='return')journal(s,'冯伯把发黄的泽兰铺在桌上：“前两天还好好的。”安道全捻了捻叶片：“根泡坏了。去药圃看看上游，别急着把苗拔掉。”');
 if(a.id==='checkwater')journal(s,'进水沟被蛇蜕和枯苇堵住，浑水从沉船底下涌来。赤背大蛇盘在排水口，受惊便喷毒；先把身上的毒解掉，它就追不到人。清渠除蛇已开放。');
 if(a.id==='thanks')journal(s,'新采的泽兰摆上药桌，安道全闻了闻：“这批能用了。每日送四份来，再添两份药草，我煎一罐药引。”收下泽兰 4、安道全信物 2、解毒丹 2；建好配药间即可煎药。谢礼只取一次。');
 const t=TASKS[a.id];for(const [id,n]of Object.entries(t.items||{}))s.inventory[id]-=n;mark(x,t.flag);
 if(a.id==='meet'){knowHero(s,'andaoquan','known',d);journal(s,'安道全挽起袖口：“老冯采药时被蛇咬了。先清出外头的水路，再给我一粒解毒丹；没有成药，六份药草、两块粗布也能救急。”');}
 if(t.flag==='rescued')journal(s,'安道全替冯伯敷药裹伤。老人缓过气，指着苇丛：“药圃在那边。清开水沟，苗还能救。”泽兰药圃已标在图上。');
 if(a.id==='tend')journal(s,'枯苇被捞出水沟，你用木料扎好护栏。水退了，药苗露了出来。之后芦苇泽派遣每批泽兰额外 +1；此前暂存不追补。');
 if(a.id==='invite'){
  if(s.heroes.andaoquan.status==='owned')journal(s,'安道全收好药箱：“我回寨配药，你们进泽时记得带解毒丹。”这段委托已完成，不重复发放人物或信物。');
  else{ownHero(s,'andaoquan',d);journal(s,'安道全背起药箱：“寨里有人受伤，总得有人照看。我随你回去。”未消耗招贤令。');}
  journal(s,'配药间建成后，芦苇泽每批药草 +1，金疮膏配方少用泽兰 1 份。');
 }
 if(a.id==='cache'){for(const id of ['medicinal_extract','jiedudan'])s.inventory[id]=(s.inventory[id]||0)+2;journal(s,'小药箱里还有浓制药引 2、解毒丹 2，已收好。这箱药只取一次。');}
}
export function finishMarsh(s,b){
 const x=s.exploration?.marsh;if(!x?.pending)return;
 const id=x.pending.node,n=MARSH_NODES[id];
 requireRule(b.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===marshRoute(id,x.pending.approach),'芦苇泽战斗与记录不符。');
 if(b.outcome==='victory'){mark(x,'won_'+id);if(id==='nest'&&x.pending.approach!=='reedvenom')journal(s,'蛇群退入水中。安道全留下的药箱还在，带回草庐便能交还。船尾另有一只小药箱。');}
 x.pending=null;
}

export function marshDecoctQuote(s){const r=MARSH_DECOCT;return {reason:!s.camp?'先建立寨子。':s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run?'先结束交战或行程。':!marshHas(s,'return_paid')?'先清渠除蛇，回草庐交还泽兰。':!s.exploration?.buildings.includes('clinic')?'先建好配药间。':(s.daily.counters.marsh_decoct||0)>=1?'今日已煎过一罐，明日再来。':(s.daily.counters.craft_medicinal_extract||0)>=WORKSHOP_RECIPES.medicinal_extract.limit?'今日煎药加工次数已用完。':(s.inventory[r.output]||0)>=10000000?'浓制药引库存已满。':s.player.silver<r.silver?'需要碎银 20。':Object.entries(r.items).some(([id,n])=>(s.inventory[id]||0)<n)?'需要泽兰 4、药草 2。':''};}
export function marshDecoct(s){const q=marshDecoctQuote(s);requireRule(!q.reason,q.reason);for(const [id,n]of Object.entries(MARSH_DECOCT.items))s.inventory[id]-=n;s.player.silver-=MARSH_DECOCT.silver;s.inventory.medicinal_extract=(s.inventory.medicinal_extract||0)+1;s.daily.counters.marsh_decoct=1;s.daily.counters.craft_medicinal_extract=(s.daily.counters.craft_medicinal_extract||0)+1;journal(s,'安道全滤去药渣，把药引装进小罐。泽兰 4、药草 2、碎银 20 已用去，得到浓制药引 1；今日只煎这一罐。');}
