import { ownHero } from './hero.js?v=0.44.0';
import { canonicalHeroes } from './roster.js?v=0.44.0';
import { grant } from './item.js?v=0.44.0';
import { requireRule, journal } from './utils.js?v=0.44.0';
export const SELECT_COST=[0,10,15,25,40,60];
export function recruitWeek(now){const d=new Date(now+8*3600000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function supportState(s){return s.recruit.support||{version:1,dry:0,tickets:0,points:0,claims:[],week:null};}
function ensure(s){return s.recruit.support??=supportState(s);}
export function supportWeek(s){const period=recruitWeek(s.clock),w=supportState(s).week;return w?.period===period?w:{period,work:0,wins:0,claimed:false};}
export function recordRecruitSupport(s,result){
 const p=ensure(s);if(result.kind!=='joined')p.points++;
 if(!result.target){p.dry=result.kind==='joined'?0:p.dry+1;if(p.dry>=10){p.dry=0;p.tickets++;journal(s,'【迎贤荐书】连续十次普通招贤未迎来新人，额外获得荐书一封，可自选尚未入寨的一至三星正册好汉。');}}
}
export function recordRecruitWeek(before,after){
 const work=Math.max(0,(after.stats.campWork||0)-(before.stats.campWork||0)),wins=Math.max(0,(after.stats.battleWin||0)-(before.stats.battleWin||0));
 if(!work&&!wins)return;const p=ensure(after),w={...supportWeek(after)};w.work=Math.min(3,w.work+work);w.wins=Math.min(5,w.wins+wins);p.week=w;
}
export function welcomeCandidates(s,d){return canonicalHeroes(d).filter(h=>h.star<=3&&s.heroes[h.id].status!=='owned');}
export function recruitOffers(s,d){const p=supportState(s),w=supportWeek(s);return [
 {id:'week',name:'每周访贤差事',amount:2,reason:w.claimed?'本周已领取':w.work<3||w.wins<5?'本周寨务经营 '+w.work+'/3 · 战斗胜利 '+w.wins+'/5':''},
 ...d.chapters.map(c=>({id:'chapter_'+c.id,name:'第 '+c.number+' 卷 · '+c.title,amount:2,reason:p.claims.includes('chapter_'+c.id)?'已领取':!s.progress.flags[c.completeFlag]?'完成本卷后领取':''})),
 ...d.dungeons.map(x=>({id:'first_'+x.id,name:x.name+' · 首通招贤酬劳',amount:1,reason:p.claims.includes('first_'+x.id)?'已领取':!s.progress.clears[x.id]?'首次通关后领取':''}))
 ];}
export function recruitSupportAction(s,d,a){
 if(a.type==='recruitSupply'){const q=recruitOffers(s,d).find(v=>v.id===a.id);requireRule(q&&!q.reason,q?.reason||'没有这项招贤补给。');const p=ensure(s);if(a.id==='week'){p.week={...supportWeek(s),claimed:true};}else p.claims.push(a.id);grant(s,{items:{recruit_order:q.amount}},d);journal(s,'【招贤补给】'+q.name+'：招贤令 +'+q.amount+'。');return;}
 const p=ensure(s);
 if(a.type==='recruitWelcomeConvert'){requireRule(p.tickets>0,'尚无迎贤荐书。');requireRule(!welcomeCandidates(s,d).length,'仍有未入寨的一至三星好汉，请先用荐书迎贤。');p.tickets--;p.points+=10;journal(s,'【荐书折换】低星正册已齐，荐书一封换为荐贤积分 10。');return;}
 const h=canonicalHeroes(d).find(h=>h.id===a.id);requireRule(h&&s.heroes[a.id].status!=='owned','请选择尚未入寨的正册好汉。');
 if(a.type==='recruitWelcome'){requireRule(p.tickets>0,'尚无迎贤荐书。');requireRule(h.star<=3,'迎贤荐书用于一至三星正册好汉。');p.tickets--;}
 else{requireRule(a.type==='recruitSelect','未知迎贤方式。');requireRule(['known','available'].includes(s.heroes[a.id].status),'先与这位好汉相识，再用积分相邀。');requireRule(p.points>=SELECT_COST[h.star],'荐贤积分不足。');p.points-=SELECT_COST[h.star];}
 ownHero(s,a.id,d);journal(s,'【确定迎贤】'+h.name+'应邀入寨；未消耗招贤令，不计抽取，也不改变星级保底。');
}
export function validateRecruitSupport(s,d,check){
 const p=s.recruit.support;if(p===undefined)return;
 const int=(n,max=10000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 check(p&&typeof p==='object'&&!Array.isArray(p)&&p.version===1,'招贤保障版本');
 check(int(p.dry,9)&&int(p.tickets,Math.floor(s.recruit.total/10))&&int(p.points,s.recruit.total*2),'招贤保障计数');
 const ids=new Set([...d.chapters.map(c=>'chapter_'+c.id),...d.dungeons.map(x=>'first_'+x.id)]);
 check(Array.isArray(p.claims)&&p.claims.length<=ids.size&&new Set(p.claims).size===p.claims.length&&p.claims.every(id=>ids.has(id)),'招贤补给领取记录');
 for(const id of p.claims){if(id.startsWith('chapter_'))check(!!s.progress.flags[d.chapters.find(c=>'chapter_'+c.id===id).completeFlag],'招贤章节酬劳条件');else check(s.progress.clears[id.slice(6)]>0,'招贤首通酬劳条件');}
 check(p.week===null||(p.week&&typeof p.week==='object'&&!Array.isArray(p.week)),'招贤周常');
 if(p.week){const w=p.week,t=Date.parse(w.period+'T00:00:00+08:00');check(/^\d{4}-\d{2}-\d{2}$/.test(w.period)&&Number.isFinite(t)&&recruitWeek(t)===w.period&&w.period<=recruitWeek(s.clock)&&int(w.work,3)&&int(w.wins,5)&&typeof w.claimed==='boolean'&&(!w.claimed||w.work===3&&w.wins===5),'招贤周常记录');}
}
