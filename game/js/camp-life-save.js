import {CAMP_PEOPLE,CAMP_PROJECTS,LIFE_THRESHOLDS} from './camp-life-data.js?v=0.82.0';
import {regionBuilt} from './exploration-data.js?v=0.82.0';
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),integer=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
export const hasCampLife=s=>!!s.campLife||s.development?.ledger.some(r=>['gained','spent'].some(k=>['campWood','campFood'].some(id=>r[k]?.[id]>0)));
export function validateCampLife(s,check){const x=s.campLife,cs=s.daily?.counters||{};
 if(x!==undefined){check(obj(x)&&x.version===1&&Object.keys(x).sort().join(',')==='people,projects,version'&&obj(x.people)&&Array.isArray(x.projects),'寨中生活');check(!!s.camp,'寨中生活前置');check(new Set(x.projects).size===x.projects.length&&x.projects.every(id=>Object.hasOwn(CAMP_PROJECTS,id)&&regionBuilt(s,id)&&s.camp.buildings.hall>=2),'寨中添置');
 for(const [id,p]of Object.entries(x.people)){check(Object.hasOwn(CAMP_PEOPLE,id)&&s.heroes[id]?.status==='owned'&&obj(p)&&Object.keys(p).sort().join(',')==='jobs,lastWork,talks','寨中故人');check(integer(p.talks,1,3)&&integer(p.jobs,0,1000000)&&p.jobs>=LIFE_THRESHOLDS[p.talks-1],'故人小叙');check(p.jobs===0?p.lastWork==='':typeof p.lastWork==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.lastWork)&&!Number.isNaN(Date.parse(p.lastWork))&&p.lastWork<=s.daily.date,'故人办事日期');}}
 for(const [key,n]of Object.entries(cs).filter(([k])=>k.startsWith('life_')))check(['life_jobs','life_forge','life_clinic','life_lodge'].includes(key)&&integer(n,0,key==='life_jobs'?2:1)&&(!n||!!x&&(key==='life_jobs'||x.projects.includes(key.slice(5)))),'寨务当日次数');
 check(Object.values(x?.people||{}).filter(p=>p.lastWork===s.daily?.date).length===(cs.life_jobs||0),'寨务当日记录');
}
export function campLifePreserved(a,b){const x=a.campLife,y=b.campLife;if(x){if(!y||x.projects.some(id=>!y.projects.includes(id)))return false;for(const [id,p]of Object.entries(x.people)){const q=y.people[id];if(!q||q.talks<p.talks||q.jobs<p.jobs||q.lastWork<p.lastWork)return false;}}
 return !Object.entries(a.daily.counters).some(([k,n])=>k.startsWith('life_')&&n&&(b.daily.date<a.daily.date||b.daily.date===a.daily.date&&(b.daily.counters[k]||0)<n));
}
