// This optional extension is separate from the strict campLife schema so old
// local saves, imports and Worker snapshots retain all of their prior fields.
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const keys=(v,list)=>object(v)&&Object.keys(v).sort().join(',')===list.split(' ').sort().join(',');
export const hasCampWork=s=>s.campWork!==undefined;
export function validateCampWork(s,check){
 const x=s.campWork;if(x===undefined)return;
 check(keys(x,'version clinic')&&x.version===1&&!!s.camp,'寨内工作');
 const c=x.clinic;
 check(keys(c,'hero enabled auto lastAt carry budget treated spent revision'),'医馆工作字段');
 check((c.hero===null||typeof c.hero==='string'&&s.heroes[c.hero]?.status==='owned')&&typeof c.enabled==='boolean'&&typeof c.auto==='boolean','医馆坐诊安排');
 check(integer(c.revision,Number.MAX_SAFE_INTEGER)&&integer(c.lastAt,s.clock)&&integer(c.carry,1799999)&&integer(c.treated),'医馆工作进度');
 for(const bag of [c.budget,c.spent])check(keys(bag,'herb cloth food')&&Object.values(bag).every(n=>integer(n)),'医馆物资预算');
 // A previously assigned hero can be away or hold an old conflicting post.
 // Keep their budget and treatment progress intact; the work engine pauses it.
}
export function campWorkPreserved(a,b){
 const x=a.campWork?.clinic,y=b?.campWork?.clinic;if(!x)return true;
 if(!y||!y.budget||!y.spent||y.revision<x.revision||y.lastAt<x.lastAt||y.treated<x.treated||Object.keys(x.spent).some(k=>y.spent[k]<x.spent[k]))return false;
 // The revision advances on every material work/configuration change. At the
 // same revision even an idle budget or unfinished cycle must remain intact.
 return y.revision>x.revision||(['hero','enabled','auto','lastAt','carry','treated'].every(k=>x[k]===y[k])&&['herb','cloth','food'].every(k=>x.budget[k]===y.budget[k]&&x.spent[k]===y.spent[k]));
}
