import { isExternal, isWanderer } from './roster.js?v=0.83.0';
import { requireRule } from './utils.js?v=0.83.0';
// Draw rarity is a family, separate from the historical aptitude field in hero data.
export const recruitStar=h=>!isExternal(h)?5:isWanderer(h)?h.star:4;
const CHINA_OFFSET=8*3600000;
const rotate=(values,start,size)=>Array.from({length:Math.min(size,values.length)},(_,i)=>values[(start+i)%values.length]);
function monthParts(now){const date=new Date(now+CHINA_OFFSET);requireRule(Number.isFinite(date.getTime()),'招贤日期无效。');return {year:date.getUTCFullYear(),month:date.getUTCMonth(),day:date.getUTCDate()};}
function periodBanner(d,year,month,slot){
 const monthNumber=year*12+month,monthDays=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const first=slot*10+1,last=slot===2?monthDays:slot*10+10;
 const startAt=Date.UTC(year,month,first)-CHINA_OFFSET,endAt=Date.UTC(year,month,last+1)-CHINA_OFFSET;
 const canon=d.heroes.filter(h=>!isExternal(h)).sort((a,b)=>a.seat-b.seat);
 const external=d.heroes.filter(h=>isExternal(h)&&!isWanderer(h));
 const byStar={5:rotate(canon,(month*9+slot*3)%canon.length,3),4:rotate(external,(monthNumber*3+slot*2)%external.length,2)};
 for(const star of [1,2,3]){const pool=d.heroes.filter(h=>isWanderer(h)&&recruitStar(h)===star);byStar[star]=rotate(pool,(monthNumber*12+slot*4)%pool.length,4);}
 requireRule([1,2,3,4,5].every(star=>byStar[star].length),'本期招贤人物配置不完整。');
 const period=year+'-'+String(month+1).padStart(2,'0'),heroes=[5,4,3,2,1].flatMap(star=>byStar[star]);
 return {id:period+'-'+(slot+1),period,slot,startAt,endAt,dateLabel:(month+1)+'月'+first+'日—'+last+'日',title:['江湖来客','聚义相逢','英雄赴约'][slot],heroes,headliners:byStar[5],byStar};
}
// The reducer has already synchronized this saved clock. Never read Date.now here:
// offline APK, browser and Worker replay must choose the same dated pool.
export function recruitmentBanner(d,now){const {year,month,day}=monthParts(now);return periodBanner(d,year,month,day<=10?0:day<=20?1:2);}
export function recruitmentSchedule(d,now){const {year,month}=monthParts(now);return [0,1,2].map(slot=>periodBanner(d,year,month,slot));}
export const featuredRecruitHeroes=(s,d)=>recruitmentBanner(d,s.clock).heroes;
