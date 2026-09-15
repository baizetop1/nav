import { promotionQuote } from './quality.js?v=0.28.0';
import { corpsQuote, targetQuote } from './development.js?v=0.28.0';
import { skillUpgradeQuote } from './growth.js?v=0.28.0';
import { chronicleQuote } from './hero-chronicles.js?v=0.28.0';
import { ELITES, elitePlan } from './elites.js?v=0.28.0';
import { collectionQuote, workshopQuote } from './production.js?v=0.28.0';
export function readyActions(s,d){if(!s.camp||s.battle||s.scheme||s.event)return [];const rows=[];for(const h of d.heroes.filter(h=>s.heroes[h.id].status==='owned')){
 const add=(kind,label)=>rows.push({kind,label,hero:h.id});
 if(!promotionQuote(s,h.id).reason)add('promotion',h.name+'可升品');
 if(!corpsQuote(s,h.id).reason)add('corps',h.name+'可练兵');
 const story=chronicleQuote(s,h.id);if(story&&!story.reason)add('story',h.name+'行记可结算');
 if(h.skills.some(id=>!skillUpgradeQuote(s,d.by.skills[id]).reason))add('skill',h.name+'招式可精进');
 }return rows;}
export function materialGaps(s,d){const q=targetQuote(s,d);if(!q?.cost)return [];const result=[];if((q.cost.silver||0)>s.player.silver)result.push({name:'碎银',missing:q.cost.silver-s.player.silver});for(const [id,n] of Object.entries(q.cost.items||{}))if(n>(s.inventory[id]||0))result.push({id,name:d.by.items[id].name,missing:n-(s.inventory[id]||0)});return result;}
export function readinessPanel(s,d,btn){
 const rows=readyActions(s,d),gaps=materialGaps(s,d),busy=!!(s.battle||s.scheme||s.event),elites=Object.entries(ELITES).filter(([id])=>!elitePlan(s,id).reason),show=list=>list.map(r=>btn(r.label,{type:'ui_readyHero',id:r.hero,kind:r.kind},'secondary')).join('');
 return '<section class="camp-overview"><h2>培养与远征待办</h2><p class="note">只列当前条件已满足的养成事项；点击查看对应人物，仍由你确认消耗。多项操作可能共用材料，办理后重新计算。</p><div class="actions">'+show(rows.slice(0,4))+'</div>'+(rows.length>4?'<details data-fold="ready-more"><summary>其余 '+(rows.length-4)+' 项可办养成</summary><div class="actions">'+show(rows.slice(4))+'</div></details>':!rows.length?'<p class="note">暂时没有可立即升级的项目，可查看人物培养预算或追踪材料。</p>':'')+(gaps.length?'<h3>当前追踪目标的缺口</h3><p class="note">'+gaps.map(g=>g.name+'还缺 '+g.missing).join('、')+'</p>'+btn('查看目标与获取途径',{type:'ui_goalOpen'},'secondary',busy):'')+(elites.length?'<h3>可准备的精英远征</h3><div class="actions">'+elites.map(([id,m])=>btn(m.name,{type:'ui_eliteOpen',id},'secondary')).join('')+'</div>':'')+'</section>';
}
export const productionReady=s=>!collectionQuote(s).reason||!workshopQuote(s).reason;
