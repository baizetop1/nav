import {MOUNTAIN_NODES,mountainHas,mountainGate,mountainLinks,mountainRoute} from './mountain-data.js?v=0.82.1';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.82.1';
import {ensureGathering} from './gathering.js?v=0.82.1';
import {knowHero,ownHero} from './hero.js?v=0.82.1';
import {requireRule,journal} from './utils.js?v=0.82.1';
export function openMountain(s){return s.exploration.mountain??={version:1,position:'shelter',visited:['shelter'],flags:[],pending:null};}
export function mountainPath(s,target){
 if(mountainGate(s,target))return null;const start=s.exploration?.mountain?.position||'shelter',queue=[[start]],seen=new Set([start]);
 while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const next of mountainLinks(s,id))if(!seen.has(next)&&!mountainGate(s,next)){seen.add(next);queue.push([...path,next]);}}return null;
}
export function mountainFightQuote(s,id,approach='direct'){
 const n=Object.hasOwn(MOUNTAIN_NODES,id)?MOUNTAIN_NODES[id]:null;if(!n?.battle)return {reason:'这里没有可挑战的敌人。'};
 const q=specialPlan(s,n.battle,1,mountainRoute(id,approach));
 return {...q,reason:!['direct','highpath','convoy'].includes(approach)||['highpath','convoy'].includes(approach)&&id!=='hold'?'没有这条进攻路线。':s.exploration?.mountain?.position!==id?'先前往'+n.name+'。':mountainGate(s,id)||q.reason};
}
const TASKS={meet:{place:'shelter',flag:'met'},scout:{place:'pass',flag:'scouted'},survey:{place:'vein',flag:'surveyed',rewards:{copper_sand:4}},ladder:{place:'cliff',flag:'ladder',items:{copper_sand:3,wood:2}},cargo:{place:'hold',flag:'cargo',rewards:{grain:6,leather:2}},invite:{place:'shelter',flag:'invited'},return:{place:'shelter',flag:'return_met'},checkroad:{place:'pass',flag:'road_checked'},thanks:{place:'shelter',flag:'return_paid',rewards:{copper_sand:4,xiangchong_token:2,strength_charm:1}}};
export function mountainTask(s,id){
 const t=Object.hasOwn(TASKS,id)?TASKS[id]:null;if(!t)return '没有这件事。';if(mountainHas(s,t.flag))return '这件事已经办妥。';if(s.exploration?.mountain?.position!==t.place)return '先前往'+MOUNTAIN_NODES[t.place].name+'。';
 if(id==='return'&&!mountainHas(s,'invited'))return '先取回粮车，与项充回寨。';
 if(id==='checkroad'&&!mountainHas(s,'return_met'))return '先到歇棚读车夫留下的信。';
 if(id==='thanks'&&!mountainHas(s,'won_convoy'))return '先走通护粮回程，接应被截住的后车。';
 if(id==='scout'&&!mountainHas(s,'met'))return '先到歇棚与项充交谈。';
 if(['scout','survey'].includes(id)&&!mountainHas(s,'won_slope')&&!mountainHas(s,'won_pass'))return '先清出断车坡或乱石隘。';
 if(id==='ladder'&&!mountainHas(s,'scouted'))return '先跟项充查看隘口。';
 if(id==='cargo'&&!mountainHas(s,'won_hold'))return '先击败截粮头目。';
 if(id==='invite'&&!mountainHas(s,'cargo'))return '先把粮车交还车夫。';
 if(Object.entries(t.items||{}).some(([k,n])=>(s.inventory[k]||0)<n))return '需要赤铜砂 3、行囊木材 2。矿砂可在矿脉取得，木材可在行囊集市购买。';
 if(Object.entries(t.rewards||{}).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '材料库存已满，整理后再取。';return '';
}
export function mountainAction(s,d,a){const x=openMountain(s);
 if(a.type==='regionOpen')return;
 if(a.type==='regionMove'){const path=mountainPath(s,a.id);requireRule(path,'山路尚未走通。');x.position=a.id;for(const id of path)if(!x.visited.includes(id))x.visited.push(id);journal(s,'抵达断崖粮道 · '+MOUNTAIN_NODES[a.id].name+'。');return;}
 if(a.type==='regionBattle'){const approach=a.approach===undefined?'direct':a.approach,q=mountainFightQuote(s,a.id,approach);requireRule(!q.reason,q.reason);enterSpecial(s,d,{id:MOUNTAIN_NODES[a.id].battle,tier:1,route:mountainRoute(a.id,approach)});x.pending={node:a.id,approach};return;}
 requireRule(a.type==='regionDo','没有这项粮道事务。');const reason=mountainTask(s,a.id);requireRule(!reason,reason);const t=TASKS[a.id];
 if(a.id==='survey')ensureGathering(s);for(const [k,n]of Object.entries(t.items||{}))s.inventory[k]-=n;for(const [k,n]of Object.entries(t.rewards||{}))s.inventory[k]=(s.inventory[k]||0)+n;x.flags.push(t.flag);
 if(a.id==='return')journal(s,'车夫在信里写道：“头车过了，后车却不见了。白天走的，没遇上雨。我不敢再往前送粮，劳你去隘口看一眼。”');
 if(a.id==='checkroad')journal(s,'乱石后藏着几双草鞋，车辙旁的脚印分去了两边。项充蹲下摸了摸泥：“有人等后车过去才动手。你盯住头目，我守车尾。”护粮回程已开放，可重复挑战。');
 if(a.id==='thanks')journal(s,'最后一辆粮车拐下山道，棚里的锅还热着。车夫掀开锅盖：“先吃饭，钱的事容我慢慢还。”你收下赤铜砂 4、项充信物 2、强化符 1。这份谢礼只收一次。');
 if(a.id==='meet'){knowHero(s,'xiangchong','known',d);journal(s,'项充系紧布条：“他们用车板挡路，人都躲在后头。先清开坡口，我跟你上去看看。”');}
 if(a.id==='scout')journal(s,'项充指了指盾沿：“举盾以后，他得站住三息才刺得出枪。那时候破他的盾。”他又指向崖壁，栈道和截粮营已标在图上。');
 if(a.id==='survey')journal(s,'你挑出赤铜砂 4，在矿层两头做了记号。以后粮道派遣每批赤铜砂额外 +1，原有暂存不补发。');
 if(a.id==='ladder')journal(s,'山民铸好梯扣，你与项充换上两根横木。歇棚到栈道的近路已通；攻营时可从高处绕行，以后不再耗料。');
 if(a.id==='cargo')journal(s,'粮车陆续下了坡。车夫把粮草 6、熟皮 2 留在棚里：“这些给路上用。余下的，我得赶紧送去。”这份谢礼只收一次。');
 if(a.id==='invite'){
  if(s.heroes.xiangchong.status==='owned')journal(s,'项充背起团牌：“粮送到了，咱们回寨。”原有培养保留，不重复发人物或信物。');
  else{ownHero(s,'xiangchong',d);journal(s,'项充提起标枪：“我跟你走。有要守的地方，叫我一声。”他随你回寨，未消耗招贤令。');}
  journal(s,'矿砂炉建成后，项充教人照着旧带扣铸模：稳步束带少用赤铜砂 1，粮道派遣每批碎铁 +1。');
 }
}
export function finishMountain(s,b){const x=s.exploration?.mountain;if(!x?.pending)return;const {node,approach}=x.pending,n=MOUNTAIN_NODES[node];requireRule(b.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===mountainRoute(node,approach),'粮道战斗与记录不符。');if(b.outcome==='victory'){if(!x.flags.includes('won_'+node))x.flags.push('won_'+node);if(node==='hold'&&approach!=='convoy')journal(s,'头目丢下大盾逃走了。粮车还停在营门后，去找车夫一同赶回山下。');}x.pending=null;}
