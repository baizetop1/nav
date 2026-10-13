import {lifePlace,lifePeople,talkQuote,jobQuote} from './camp-life.js?v=0.83.0';
import {CAMP_PEOPLE} from './camp-life-data.js?v=0.83.0';
import {targetQuote} from './development.js?v=0.83.0';
import {collectionQuote} from './production.js?v=0.83.0';
import {dayKey} from './utils.js?v=0.83.0';
const page=(id,extra={})=>({type:'ui_section',view:'camp',id,...extra});
export function returnPlan(s,d){const day=Math.max(1,Math.floor((Date.parse(dayKey(s.clock))-Date.parse(dayKey(s.startedAt)))/86400000)+1),rows=[],add=(id,title,text,command)=>rows.push({id,title,text,command});
 const goal=s.development?.goal;if(goal){const q=targetQuote(s,d);if(q)add('goal',q.name||q.title||'继续上回的目标',q.next?.text||q.note||q.reason||'先把上回选的事办完。',q.done&&q.completeCommand?q.completeCommand:{type:'ui_goalDetails'});}
 const bank=Object.entries(s.idleDispatch?.bank||{}).filter(([,n])=>n>0);if(bank.length)add('idle','采集材料到了',bank.map(([id,n])=>d.by.items[id].name+' '+n).join('、'),page('idle'));
 if(!collectionQuote(s).reason)add('production','寨仓有新收成','先收进仓，再看这次营建还缺什么。',page('production'));
 const talk=lifePeople(s).find(id=>!talkQuote(s,id).reason);if(talk)add('person',d.by.heroes[talk].name+'在'+lifePlace(s,talk),'有件近来的小事想与你说。',page('life',{lifeTab:'people',lifeHero:talk,lifeMode:'talk'}));
 if(s.camp?.wounded)add('wounded',s.camp.wounded+' 名伤兵待治','治好后再归队。阵亡人数不会因治疗减少。',page('troops'));
 if(day>=7&&s.exploration?.crossRegion?.flags.includes('delivered'))add('revisit','回去看看旧路','换一套阵容重访：先查敌情，再选打断、解毒或护阵。',{type:'ui_section',view:'trials',id:'special'});
 else if(day>=3)add('friend','看看下一位故人','已有地区的人物委托、重访和营建都记在这里。',page('exploreGoals'));
 const job=lifePeople(s).find(id=>!jobQuote(s,id).reason);if(job)add('job','顺手帮个忙',d.by.heroes[job].name+'：'+CAMP_PEOPLE[job].job+'。',page('life',{lifeHero:job,lifeTab:'people',lifeMode:'job'}));
 if(!rows.length)add('explore','接着上回走过的路','先看地图上的人物与材料，再决定这一趟去哪里。',page('exploreGoals'));
 return {day,stage:day<3?'安顿人手':day<7?'访人备战':'旧地新事',rows};
}
