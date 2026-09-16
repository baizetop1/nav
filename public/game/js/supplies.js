import {expansion} from './expansion-state.js?v=0.29.0';
import {rotationCalendar} from './rotations.js?v=0.29.3';
import {requireRule,count,journal} from './utils.js?v=0.29.0';
import {grant} from './item.js?v=0.29.3';
export function supplyOffers(s){const c=s.camp,cal=rotationCalendar(s.clock),tier=s.campaign?.weekly[cal.period]?.tier||0;return [
{id:'daily',name:'每日勤勉荐书',period:cal.date,cost:0,reward:{items:{recruit_order:1,recruit_shard:2,ration:1}},reason:!c?'先建立寨子':s.daily.counters.supply_daily?'今日已领取':!(s.daily.counters.campWork>=1&&s.daily.counters.battleWin>=1)?'今日经营一次并取得一场胜利':''},
{id:'week',name:'本期周本军功兑换',period:cal.period,cost:120,reward:{items:{spirit_essence:2,strength_charm:1}},reason:!c?'先建立寨子':c.supply?.week===cal.period?'本期已兑换':c.buildings.hall<3||tier<2?'聚义厅 3 级，本期周本通关 2 层':s.player.merit<120?'需要功勋 120':''},
{id:'month',name:'每月聚义酬劳',period:cal.date.slice(0,7),cost:300,reward:{items:{immortal_seal:1,recruit_order:2}},reason:!c?'先建立寨子':c.supply?.month===cal.date.slice(0,7)?'本月已兑换':c.buildings.hall<4||tier<3?'聚义厅 4 级，本期周本通关 3 层':s.player.merit<300?'需要功勋 300':''}
];}
export function claimSupply(s,d,id){const q=supplyOffers(s).find(q=>q.id===id);requireRule(q&&!q.reason,q?.reason||'没有这项悬赏');s.player.merit-=q.cost;if(id==='daily')count(s,'supply_daily');else{ s.camp.supply??={};s.camp.supply[id]=q.period;}expansion(s);grant(s,q.reward,d);journal(s,'【寨中悬赏】'+q.name+'已领取'+(q.cost?'，功勋 -'+q.cost:'')+'。');}
export function supplyBoard(s,d,btn){return '<section class="camp-overview" id="supply-board"><h2>寨中悬赏 · 有限补给</h2><p class="note">每日按北京时间刷新；周本每月四期，每期兑换一次；月赏每月一次。重复刷低级战不会增加领取次数。</p>'+supplyOffers(s).map(q=>'<article class="card"><h3>'+q.name+'</h3><p>'+Object.entries(q.reward.items).map(([id,n])=>d.by.items[id].name+' ×'+n).join(' · ')+'</p><p class="note">'+(q.cost?'消耗功勋 '+q.cost:'完成当日经营与胜利，无额外消耗')+' · '+q.period+'</p>'+(q.reason?'<p class="note">'+q.reason+'</p>':'')+btn('领取补给',{type:'campSupply',id:q.id},'secondary',!!q.reason)+'</article>').join('')+'</section>';}
