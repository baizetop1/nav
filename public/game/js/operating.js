import { STATIONS, POSTS, stationYield, CYCLE } from './frontier.js?v=0.44.0';
export const FOCUSES={balanced:'均衡经营',farm:'粮草优先',lumber:'木材优先',workshop:'工坊优先'};
export const workFactor=(s,id)=>!s.frontier?.focus||s.frontier.focus==='balanced'?4:s.frontier.focus===id?6:3;
export const batchMinutes=(s,id)=>CYCLE/60000*4/workFactor(s,id);
export function staffingImpact(s,d,team){
 if(!s.frontier)return [];
 const next={...s,battle:{guest:false,team:team.map(id=>({id}))}},rows=[];
 for(const [id,row] of Object.entries(s.frontier.stations)){if(row.worker?.startsWith('hero:')&&team.includes(row.worker.slice(5)))rows.push({name:STATIONS[id].name,hero:d.by.heroes[row.worker.slice(5)].name,before:stationYield(s,d,id),after:stationYield(next,d,id)});}
 for(const [id,row] of Object.entries(s.frontier.posts))if(row.guard&&team.includes(row.guard))rows.push({name:POSTS[id].name,hero:d.by.heroes[row.guard].name,guard:true});
 return rows;
}
export function focusPanel(s,btn){return '<section class="focus-panel"><h3>经营侧重 · '+FOCUSES[s.frontier.focus||'balanced']+'</h3><p class="note">均衡：各处 30 分钟一批；侧重：所选处 20 分钟一批，其余 40 分钟一批。只影响调整后的生产速度，已产物资保留。各处暂存上限不变，离线最多计算八小时；工坊仍需原料加工。</p><div class="actions">'+Object.entries(FOCUSES).map(([id,name])=>btn(name,{type:'frontierFocus',id},'secondary',id===(s.frontier.focus||'balanced'))).join('')+'</div></section>';}
export function staffingPanel(s,d,team){const rows=staffingImpact(s,d,team);return rows.length?'<section class="staffing-impact"><h3>出征期间的留守变化</h3>'+rows.map(r=>'<p>'+r.hero+'离岗 · '+r.name+'：'+(r.guard?'暂失守将保护，沿用现有六小时补给缓冲。':'每批产出 '+r.before+' → '+r.after+'。')+'</p>').join('')+'<p class="note">收兵后恢复任职加成；不会扣回已产物资。</p></section>':'';}
