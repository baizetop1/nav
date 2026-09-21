import {campaignQuote,startCampaign,planCampaign,campaignBattle,recordCampaignBattle,finishCampaign} from './journey-campaign.js?v=0.44.0';
import {campaignRoutes} from './journey-campaign-data.js?v=0.44.0';
import {awardRouteMarks,routeRewardAction} from './journey-rewards.js?v=0.44.0';
import {initializeJourneyCombat} from './journey-combat.js?v=0.44.0';
import {journeyConsequences,journeyTradeCost,JOURNEYS,JOURNEY_TIERS,JOURNEY_GOALS,BOONS,boonPool,journeyGoalReward,journeyModifiers} from './journey-data.js?v=0.44.0';
import {startBattle,attackInterval} from './battle.js?v=0.44.0';import {attachTroops} from './camp.js?v=0.44.0';import {deployedTroops,heroCommand} from './logistics.js?v=0.44.0';import {affairReward} from './affairs.js?v=0.44.0';import {gainExp} from './hero.js?v=0.44.0';import {rotationCalendar} from './rotations.js?v=0.44.0';import {requireRule,hasOwn,random,count,journal} from './utils.js?v=0.44.0';
export function journeyQuote(s,region,tier,options={}){const m=JOURNEYS[region],q=JOURNEY_TIERS[tier],food=15+Math.ceil(deployedTroops(s)/3);const reason=!hasOwn(JOURNEYS,region)||!Number.isInteger(tier)||!hasOwn(JOURNEY_TIERS,tier)?'请选择有效路线和难度':!s.camp||s.camp.buildings.hall<2?'聚义厅达到 2 级开放':s.realm?.trek||s.expansion?.run||s.battle||s.scheme||s.event?'先结束正在进行的远征或战局':!s.team.length?'先安排出阵好汉':Math.max(...s.team.map(id=>s.heroes[id].level))<q.level?'队中至少一人达到 '+q.level+' 级':tier>1&&(s.realm?.journey?.best[region]||0)<tier-1?'先完成本路线上一难度':s.camp.mode==='army'&&!deployedTroops(s)?'先募兵或改为英雄独行':s.player.stamina<q.stamina?'体力不足':s.camp.food<food?'粮草不足':'';const pack=campaignQuote(s,{region,tier,...options});return {reason:reason||pack.reason||(s.camp?.food<food+(pack.cost?.food||0)?'粮草不足以同时支付启程与备战。':''),food,stamina:q?.stamina||0};}
function offer(s){const j=s.realm.trek.journey,pool=boonPool(s).filter(id=>!j.boons.includes(id));j.offers=[];if(s.realm.trek.node===5)return;while(pool.length&&j.offers.length<3)j.offers.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);}
export function journeyFood(s){const t=s.realm.trek,ids=t.team.filter(id=>t.hp[id]>0),troops=Math.min(deployedTroops(s),ids.reduce((n,id)=>n+heroCommand(s,id),0));return {troops,food:Math.ceil((5+Math.ceil(troops/5))*(t.journey.boons.includes('forager')?.7:1)*(t.journey.campaign?.preparation==='guide'?.8:1))};}
function finishNode(s){s.realm.trek.node++;offer(s);}
function awardJourney(s,d,complete){const t=s.realm.trek,j=t.journey,record=s.realm.journey,f=complete?1:.5,old=record.best[j.region]||0;affairReward(s,{silver:Math.floor(t.loot.silver*f),items:Object.fromEntries(Object.entries(t.loot).filter(([k])=>k!=='silver').map(([k,n])=>[k,Math.floor(n*f)]).filter(([,n])=>n))},d);
 if(complete){record.best[j.region]=Math.max(old,j.tier);awardRouteMarks(s,j.region,j.tier);affairReward(s,journeyGoalReward(j.goal,j.tier),d);if(j.tier>old){record.best[j.region]=j.tier;affairReward(s,{items:{material_choice:1}},d);}const period=rotationCalendar(s.clock).period;if(record.weekly.period!==period)record.weekly={period,tickets:0};if(record.weekly.tickets<3){record.weekly.tickets++;affairReward(s,{items:{recruit_order:1}},d);}count(s,'trek_wins');count(s,'journey_wins');}
 const campaign=finishCampaign(s,d,j,complete);record.last={...(campaign?{campaign}:{}),...(j.rules===2?{rules:2,decisions:[...j.decisions]}:{}),region:j.region,tier:j.tier,goal:j.goal,complete,boons:[...j.boons]};
 journal(s,'【游历归寨】'+JOURNEYS[j.region].name+' · '+JOURNEY_TIERS[j.tier].name+(complete?'走通；暂存所得与定向物资已入库。':'收队；带回暂存所得一半，已扣补给与阵亡不会撤销。')+(complete&&old===0?'发现新战法：'+JOURNEYS[j.region].discoveries.map(id=>BOONS[id].name).join('、')+'，下一趟可能遇到。':'')+(complete&&j.tier>old&&j.tier<3?'下一难度已开放。':''));s.realm.trek=null;
}
export function journeyAction(s,d,a){
 if(['journeyTarget','journeyExchange','journeyPlan'].includes(a.type)){requireRule(s.realm,'先建寨并开启山河经营。');s.realm.journey??={version:1,best:{},weekly:{period:rotationCalendar(s.clock).period,tickets:0},last:null};if(a.type==='journeyPlan')planCampaign(s,a);else routeRewardAction(s,d,a);return;}
 if(a.type==='journeyStart'){
  const q=journeyQuote(s,a.region,a.tier,a);requireRule(!q.reason,q.reason);requireRule(hasOwn(JOURNEY_GOALS,a.goal),'先选择本趟想带回的物资。');requireRule(s.realm,'先开启山河经营。');
  const pack=campaignQuote(s,a);requireRule(!pack.reason,pack.reason);requireRule(s.camp.food>=q.food+(pack.cost.food||0),'粮草不足以同时支付启程与备战。');s.player.stamina-=q.stamina;s.camp.food-=q.food;s.realm.journey??={version:1,best:{},weekly:{period:rotationCalendar(s.clock).period,tickets:0},last:null};
  s.realm.journey.rules=2;const campaign=startCampaign(s,a);
  s.realm.trek={team:[...s.team],node:0,route:[['fight','event'],['fight','camp'],['elite','trade'],random(s)<.5?['fight','camp']:['elite','cache'],['boss']],hp:Object.fromEntries(s.team.map(id=>[id,10000])),loot:{silver:0,iron:0,cloth:0,martial_pages:0},journey:{campaign,version:1,rules:2,decisions:[],region:a.region,tier:a.tier,goal:a.goal,boons:[],offers:[],path:[]}};s.realm.trek.route=campaignRoutes(campaign.itinerary,s.realm.trek.route[3]);offer(s);journal(s,'【游历启程】'+JOURNEYS[a.region].name+'，先选一项战法。路线与待选战法会保存，重载不会重抽。');return;
 }
 const t=s.realm?.trek,j=t?.journey;requireRule(j,'当前没有正在进行的江湖游历。');
 if(a.type==='journeyReturn'){awardJourney(s,d,t.node===5);return;}
 if(a.type==='journeyChoice'){requireRule(j.offers.includes(a.id)&&!j.boons.includes(a.id),'请选择本次显示的一项战法。');j.boons.push(a.id);j.offers=[];journal(s,'【游历战法】'+BOONS[a.id].name+'：'+BOONS[a.id].text+' 仅本趟生效。');return;}
 requireRule(a.type==='journeyNode'&&!j.offers.length&&t.node<5&&t.route[t.node].includes(a.kind),'先选择战法，再选择当前路口。');requireRule(Object.values(t.hp).some(v=>v>0),'全队已退阵，请收队。');
 if(['fight','elite','boss'].includes(a.kind)){
  const {troops,food}=journeyFood(s);requireRule(s.camp.food>=food,'本段战斗需要粮草 '+food+'。');requireRule(s.camp.mode==='solo'||troops>0,'已无可战士兵，请收队补员。');s.camp.food-=food;
  const m=JOURNEYS[j.region],q=JOURNEY_TIERS[j.tier],scale=q.scale*(a.kind==='boss'?1.6:a.kind==='elite'?1.45:1+t.node*.12);
  const enemies=[...(a.kind==='fight'?m.enemies:m.boss)];if(journeyConsequences(j).pursuit)enemies.push('bandit');
  startBattle(s,d,{enemies,scale,context:{type:'realm',kind:'trek',id:'journey_'+j.region,tier:t.node+1,terrain:m.terrain}});attachTroops(s,troops);
  const b=s.battle,mod=journeyModifiers(j.boons,m.terrain);b.journey={version:1,region:j.region,tier:j.tier,kind:a.kind,boons:[...j.boons]};
  for(const u of b.team){u.attack=Math.round(u.attack*mod.attack);u.defense=Math.round(u.defense*mod.defense);u.maxHp=Math.round(u.maxHp*mod.hp);u.speed=Math.round(u.speed*mod.speed);u.nextAttackAt=attackInterval(u);u.rage=Math.min(100,u.rage+mod.rage);u.hp=t.hp[u.id]>0?Math.max(1,Math.floor(u.maxHp*t.hp[u.id]/10000)):0;}
  initializeJourneyCombat(b,j);campaignBattle(b,j);
  b.log.push('【本趟战法】'+j.boons.map(id=>BOONS[id].name).join('、')+'；离开本趟后失效。');return;
 }
 if(a.kind==='camp'){requireRule(['rest','forage'].includes(a.choice),'选择休整或采粮。');if(a.choice==='rest'){requireRule(s.camp.food>=15,'休整需要粮草 15。');s.camp.food-=15;for(const id of t.team)if(t.hp[id]>0)t.hp[id]=Math.min(10000,t.hp[id]+3000);}else s.camp.food=Math.min(10000000,s.camp.food+20);}
 if(a.kind==='trade'){requireRule(['buy','pass'].includes(a.choice),'选择采买或离开。');if(a.choice==='buy'){const cost=journeyTradeCost(j);requireRule(s.player.silver>=cost,'采买需要碎银 '+cost+'。');s.player.silver-=cost;t.loot.cloth+=3*j.tier;t.loot.martial_pages+=2*j.tier;}}
 if(a.kind==='event'){requireRule(['rescue','search'].includes(a.choice),'选择护送或探路。');if(a.choice==='rescue'){requireRule(s.camp.food>=15,'护送需要粮草 15。');s.camp.food-=15;t.loot.cloth+=2*j.tier;t.loot.martial_pages+=2*j.tier;}else {for(const id of t.team)if(t.hp[id]>0)t.hp[id]=Math.max(1,t.hp[id]-1500);t.loot.silver+=80*j.tier;t.loot.iron+=2*j.tier;}}
 if(a.kind==='cache'){requireRule(['arms','practice'].includes(a.choice),'选择一份货栈物资。');if(a.choice==='arms')t.loot.iron+=4*j.tier;else t.loot.martial_pages+=5*j.tier;}
 if(j.rules===2)j.decisions.push(a.kind+':'+a.choice);j.path.push(a.kind);finishNode(s);journal(s,'【路口抉择】已走 '+t.node+' / 5 段。请选择新战法，再继续前行；物资仍暂存。');
}
export function finishJourney(s,b,d){const t=s.realm?.trek,j=t?.journey;requireRule(j&&b.journey&&b.context.tier===t.node+1,'游历战斗次序不匹配。');recordCampaignBattle(j,b);for(const u of b.team)t.hp[u.id]=Math.floor(u.hp/u.maxHp*10000);if(b.outcome!=='victory'){awardJourney(s,d,false);return;}
 const kind=b.journey.kind,mult=(j.boons.includes('spoils')?1.5:1)*(b.journey.consequence==='pursuit'?1.2:1),base=kind==='fight'?80:kind==='elite'?150:180;t.loot.silver+=Math.floor(base*j.tier*mult);t.loot.iron+=Math.floor((kind==='fight'?2:4)*j.tier*mult);
 const heal=journeyModifiers(j.boons,JOURNEYS[j.region].terrain).heal+(s.realm.equipped==='compass'?500:0)+(j.campaign?.preparation==='medicine'?800:0);for(const id of t.team)if(t.hp[id]>0)t.hp[id]=Math.min(10000,t.hp[id]+heal);
 for(const u of b.team)gainExp(s,u.id,(kind==='fight'?70:110)*j.tier,d);if(j.rules===2)j.decisions.push(kind);j.path.push(kind);finishNode(s);journal(s,'【游历得胜】历练经验已获得，战利品暂存；'+(t.node===5?'已走通路线，可以回寨领取定向物资。':'新战法等待选择。'));
}
