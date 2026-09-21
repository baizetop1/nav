import {PERSONAL} from './expansion-data.js?v=0.44.0';
// Derive progress from the real battle and retained report; no duplicate counters.
export function personalProgress(b){
 if(b?.context?.type!=='realm'||b.context.kind!=='personal')return null;
 const id=b.context.id,m=PERSONAL[id];if(!m)return null;const rows=[],hero=b.team.find(u=>u.id===id),stats=b.metrics?.heroes[id]||{};
 const add=(text,done)=>rows.push({text,done:!!done});
 add('击败全部敌人',b.outcome==='victory');add('任务人物仍在阵中',hero?.hp>0);
 if(m.allAlive)add('全员存活',b.team.every(u=>u.hp>0));
 if(m.seconds)add('用时 '+(b.elapsed/1000).toFixed(1)+' / '+m.seconds+' 秒',b.elapsed<=m.seconds*1000);
 for(const [key,label]of [['healing','本人有效治疗'],['taken','本人实际承伤'],['skills','本人主动施招']])if(m[key])add(label+' '+(stats[key]||0)+' / '+m[key],(stats[key]||0)>=m[key]);
 if(m.noMedicine)add('战斗药品使用 '+(b.metrics?.medicineUses||0)+' 次',b.metrics?.medicineUses===0);
 return {name:m.name,rows,complete:rows.every(r=>r.done)};
}
export function personalProgressPanel(b,esc){const p=personalProgress(b);return p?'<section class="personal-objectives"><h3>'+esc(p.name)+' · 专属目标</h3><p class="note">'+p.rows.map(r=>(r.done?'✓ ':'○ ')+esc(r.text)).join(' · ')+'</p>'+(b.outcome?'<p>'+ (p.complete?(b.at===undefined?'专属目标达成，收获战果后领取一次性强化。':'本战专属目标已达成，首次结算时发放奖励与强化。'):'本次未达标：'+p.rows.filter(r=>!r.done).map(r=>esc(r.text)).join('；'))+'</p>':'')+'</section>':'';}
