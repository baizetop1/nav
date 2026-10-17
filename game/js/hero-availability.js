// Legacy callers use away for their existing travel restrictions.
export const away=(s,id)=>s.idleDispatch?.mission?.hero===id||s.affairs?.mission?.hero===id||!!s.realm?.squad?.team.includes(id)||!!s.realm?.trek?.team.includes(id)||!!s.expansion?.run?.team.includes(id);
// Being selected for the main team is not an absence. Only actual trips and
// non-guest battles suspend a person's work; assignment is retained on return.
export function heroAbsence(s,id){
 if(!id)return '';
 if(s.idleDispatch?.mission?.hero===id)return '采集派遣';
 if(s.affairs?.mission?.hero===id)return '寨事外派';
 if(s.realm?.squad?.team?.includes(id))return '分队外派';
 if(s.realm?.trek?.team?.includes(id))return '远征途中';
 if(s.expansion?.run?.team?.includes(id))return '战役途中';
 if(s.adventure?.run?.team?.includes(id))return '连续探索';
 if(s.battle&&!s.battle.guest&&s.battle.team?.some(u=>u.id===id))return '正在出战';
 return '';
}
// Old saves may already contain overlapping jobs. Existing posts take priority
// over the new clinic, which pauses rather than discarding its worker or funds.
export function heroPosting(s,id,except=''){
 if(!id)return '';
 if(except!=='steward'&&s.progress?.flags?.['camp_steward_'+id])return '寨务任职';
 if(except!=='production'&&Object.values(s.frontier?.stations||{}).some(p=>p.worker==='hero:'+id))return '生产任职';
 if(except!=='guard'&&Object.values(s.frontier?.posts||{}).some(p=>p.guard===id))return '据点驻守';
 if(except!=='clinic'&&s.campWork?.clinic?.hero===id)return '医馆坐诊';
 return '';
}
export const heroPresent=(s,id)=>s.heroes?.[id]?.status==='owned'&&!heroAbsence(s,id);
