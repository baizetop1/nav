// A bounded display timeline, separate from gameplay/save data and cloud credentials.
const LIMIT=200;
const same=(a,b)=>a.key===b.key;
function additions(previous,next){
  for(let n=Math.min(previous.length,next.length);n>0;n--){
    if(previous.slice(-n).every((item,i)=>same(item,next[i])))return next.slice(n);
  }
  return next;
}
export class ActivityLog {
  constructor(){this.reset();}
  reset(){this.entries=[];this.previous={journal:[],battle:[],scheme:[]};this.sequence=0;this.feedback='';}
  observe(state,{available=true,feedback=''}={}){
    if(!available)return this.entries;
    const sources={
      journal:state.journal.map(e=>({key:JSON.stringify([e.at,e.text]),text:e.text,at:e.at,kind:'journey'})),
      battle:(state.battle?.log||[]).map(text=>({key:text,text,at:state.clock,kind:'battle'})),
      scheme:(state.scheme?.log||[]).map(text=>({key:text,text,at:state.clock,kind:'scheme'}))
    };
    for(const [source,next] of Object.entries(sources)){
      for(const entry of additions(this.previous[source],next))this.entries.push({...entry,id:++this.sequence});
      this.previous[source]=next;
    }
    if(feedback&&feedback!==this.feedback&&!state.journal.some(e=>e.text===feedback))this.entries.push({id:++this.sequence,text:feedback,at:state.clock,kind:'journey'});
    this.feedback=feedback;
    if(this.entries.length>LIMIT)this.entries.splice(0,this.entries.length-LIMIT);
    return this.entries;
  }
}
