import {GRAIN_ROUTES,GRAIN_SCOUTS,GRAIN_INVESTMENTS,grainRoute,grainDelivery} from './grain-road-data.js?v=0.69.0';
import {requireRule,journal,count} from './utils.js?v=0.69.0';
import {startBattle} from './battle.js?v=0.69.0';
import {attachTroops} from './camp.js?v=0.69.0';
import {deployedTroops} from './logistics.js?v=0.69.0';
import {gainExp} from './hero.js?v=0.69.0';
const road=s=>s.grainRoad??={version:1,route:null,scout:null,won:false,attempts:0,investment:null,lastAt:0,last:null};
export function grainQuote(s,id){const m=GRAIN_ROUTES[id],n=deployedTroops(s),food=m?m.food+Math.ceil(n/4):0;return {troops:n,food,stamina:m?.stamina||0,reason:!m?'没有这条路线。':!s.camp?'先建立山寨。':s.grainRoad?.won?'粮路已经打通。':id==='scout'&&!s.grainRoad?.scout?'先派一位好汉探路。':!s.team.length?'先安排出阵好汉。':s.camp.mode==='army'&&!n?'先募兵，或在出征准备中改为独行。':s.player.stamina<m.stamina?'体力不足，出征需 '+m.stamina+' 点。':s.camp.food<food?'粮草不足，可先采集物资或减少随军人数。':''};}
function collect(s,partial=false){const q=grainDelivery(s),x=s.grainRoad;requireRule(partial||q.days>0,'粮队尚未到达，满一天后可收粮。');s.camp.food+=q.food;s.camp.wounded-=q.healed;s.camp.troops+=q.healed;if(q.days)x.lastAt=s.clock-(s.clock-x.lastAt)%86400000;return q;}
export function grainAction(s,d,a){requireRule(s.camp,'先建立山寨。');const x=road(s);
 if(a.type==='grainRoadScout'){
  requireRule(!x.won&&!x.scout,'粮路已通或已经探明，不必重复侦察。');const id=a.hero;
  requireRule(s.heroes[id]?.status==='owned'&&s.affairs?.mission?.hero!==id&&!s.realm?.squad?.team.includes(id),'请派一位在寨的好汉。');const cost=GRAIN_SCOUTS.includes(id)?2:4;requireRule(s.player.stamina>=cost,'探路需要 '+cost+' 点体力。');s.player.stamina-=cost;x.scout=id;journal(s,'【粮路探查】'+d.by.heroes[id].name+'查清了侧路。'+(GRAIN_SCOUTS.includes(id)?'熟悉山路，探路少用 2 点体力；绕袭时敌军再削弱 15%。':'侦察后可以避开寨门伏兵。'));return;
 }
 if(a.type==='grainRoadBattle'){
  const q=grainQuote(s,a.id);requireRule(!q.reason,q.reason);const m=GRAIN_ROUTES[a.id];s.player.stamina-=q.stamina;s.camp.food-=q.food;x.route=a.id;x.attempts++;
  startBattle(s,d,{enemies:m.enemy,scale:m.scale*(a.id==='scout'&&GRAIN_SCOUTS.includes(x.scout) ? .85 : 1),context:{type:'camp',id:m.id,terrain:m.terrain}});attachTroops(s,q.troops);journal(s,'【打通粮路】'+m.name+'，'+q.troops+' 人随军。');return;
 }
 requireRule(x.won,'先打通粮路。');
 if(a.type==='grainRoadCollect'){const q=collect(s);journal(s,'【粮路来车】粮草 +'+q.food+(q.healed?'，'+q.healed+' 名伤兵归队':'')+'。');count(s,'grain_deliveries');return;}
 if(a.type==='grainRoadInvest'){
  const m=GRAIN_INVESTMENTS[a.id];requireRule(m&&!x.investment,'请在粮仓和救护站中选择一项，建成后本战役不再更换。');requireRule(s.camp.wood>=m.wood&&s.player.silver>=m.silver,'需要木材 '+m.wood+'、碎银 '+m.silver+'。');const q=collect(s,true);s.camp.wood-=m.wood;s.player.silver-=m.silver;x.investment=a.id;x.lastAt=s.clock;journal(s,'【粮路营建】'+m.name+'已建成。'+m.text+(q.food?'建成前粮队已交付 '+q.food+' 粮草。':''));return;
 }
 throw Error('未知粮路行动。');
}
export function finishGrainRoad(s,d,b){const route=grainRoute(b.context.id);if(b.context.type!=='camp'||!route)return;const x=s.grainRoad;requireRule(x&&!x.won&&x.route===route,'粮路战役记录不一致。');const m=GRAIN_ROUTES[route],cargo=route==='escort'?b.depth.objective.integrity:100;
 x.last={route,outcome:b.outcome,cargo,wounded:s.lastBattle.wounded,fallen:s.lastBattle.fallen||0,troops:s.lastBattle.troops};
 if(b.outcome==='victory'){x.won=true;x.lastAt=s.clock;const food=route==='escort'?Math.floor(m.reward*(.5+cargo/200)):m.reward;s.camp.food+=food;for(const u of b.team)gainExp(s,u.id,120,d);count(s,'grain_road_wins');journal(s,'【粮路已通】'+m.result+'本次粮草 +'+food+'，每名参战好汉历练 +120。以后每日供粮 '+m.income+'，离线最多积存三天。');}
 else journal(s,'【粮路收兵】本次未打通，出征消耗与兵损已经结算。探路情报保留，可换一种办法；缺物资可采集，缺兵可改为独行。');
}
