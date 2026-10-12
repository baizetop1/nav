import {revisitThreat} from './region-revisit-combat.js?v=0.82.2';
import {skillReason,battleItemQuote} from './battle.js?v=0.82.2';
export function bossThreat(b){
 if(!b||b.outcome)return null;const u=b.enemy.filter(u=>u.hp>0&&u.boss).sort((a,c)=>(a.boss.pendingAt||a.boss.readyAt)-(c.boss.pendingAt||c.boss.readyAt))[0];if(!u)return null;
 const special=b.tactics&&b.context.type==='special'&&u===b.enemy[0]?(revisitThreat(b)||{mountainhold:b.context.route==='convoy'?['截尾夹击','夹击最后一位同伴。先击倒最末位的绕后伏兵，或打断头目；固守使本招额外减伤 50%。']:b.context.route==='highpath'?['高处突刺','绕行避开盾阵，但敌人出手更快；保护前排，可打断或固守。']:['盾阵重击','蓄势三秒内用破甲招式或守炉重锤除去护阵，可阻止重击并使头目破甲 6 秒；也可打断。'],waterfort:['回流撞船',b.context.route==='moored'?'已系缆：浪击减轻 20%、保住怒气；固守还能再减伤 60%，也可打断。':'立即固守：本招额外减伤 60%、保住怒气；也可打断。'],minechief:b.context.route==='orecart'?['矿料补给',b.enemy.at(-1)?.hp>0?'先击倒最末位运料匪，或打断头目；否则头目恢复 10% 气血、全敌护阵 20% 六秒。':'运料匪已倒下：回血与护阵停止，头目每次蓄势后破甲六秒。']:['重锤扫阵','护阵减轻直接伤害，或用打断截住。'],marshnest:b.context.route==='reedvenom'?['追毒','蓄势时全队中短毒，三秒后向仍中毒的人追加两跳重毒（每跳 6% 最大气血）。先解毒可躲开；固守使重毒减半，打断阻止追加，已中的毒仍需处理。']:['全队毒雾','优先打断；中毒后用解毒或净化。'],ruinsvault:['全队治疗','优先打断，或集火头目使其退阵。'],forestcamp:b.context.route==='cutbell'||b.enemy[1]?.hp<=0?['独力挥斩','警铃或传令已断，只会攻击前排一人；仍可打断。']:['号令齐射','先击倒第二位的传令哨，或用打断截住全队攻击。']}[b.context.route==='warbell'?'ruinsvault':b.context.id]):null;
 const info=special||{tiger:['虎啸扑阵','全队受击，可固守或打断。'],chief:['敌方护阵','可打断；护阵后可用破甲招式。'],raider:['绕后重击','保护最后一位同伴，可固守或打断。']}[u.boss.kind]||['首领招式','可用已解锁的打断招式截住；详细机制见敌情。'];
 return {enemy:u,pending:!!u.boss.pendingAt,seconds:Math.max(0,((u.boss.pendingAt||u.boss.readyAt)-b.elapsed)/1000),title:info[0],advice:info[1]};
}
export function battleThreatPanel(b,d,btn,esc,stopped,canResume=false,state){
 const q=bossThreat(b);if(!q)return '';const medicine=state&&['jiedudan','xing_shen_san'].find(id=>!battleItemQuote(state,d,id).reason),skills=b.team.filter(u=>u.hp>0).flatMap(u=>u.skills.map(id=>({u,k:d.by.skills[id]}))).filter(x=>x.k.type!=='passive'&&x.k.training?.profile==='interrupt'),ready=skills.find(x=>!skillReason(b,x.u,x.k)),reason=ready?'可立即打断':skills.length?skills.map(x=>x.u.name+'：'+skillReason(b,x.u,x.k)).join('；'):'本队没有已解锁的打断招式',actions=[];
 const add=(label,command,disabled=false)=>actions.push(btn(label,command,'secondary',stopped||disabled));
 if(medicine)add('解毒 · '+d.by.items[medicine].name,{type:'battleItem',id:medicine});
 if(q.pending){if(ready)add('打断 · '+ready.u.name,{type:'battleSkill',hero:ready.u.id,id:ready.k.id});
 const route=b.context.route,tail=b.enemy.at(-1),focus={bellbreak:'集火摇钟人',crossfire:'集火后队弩手',medicineboat:'集火后队弩手',orecart:'集火运料匪',convoy:'集火绕后伏兵'}[route];if(focus&&tail?.hp>0)add(focus,{type:'battleOrder',kind:'focus',target:tail.id});
 if(b.context.id==='forestcamp'&&route!=='cutbell'&&b.enemy[1]?.hp>0)add(route==='crossfire'?'集火前哨弩手':'集火传令哨',{type:'battleOrder',kind:'focus',target:b.enemy[1].id});
 add('集火头目',{type:'battleOrder',kind:'focus',target:q.enemy.id});add('收势固守',{type:'battleOrder',kind:'stance',value:'guard'},b.orders?.stance==='guard'||(b.orders?.readyAt||0)>b.elapsed);
 }
 return '<section class="battle-threat" aria-label="首领动向"><strong>'+esc(q.enemy.name)+' · '+esc(q.title)+'</strong><p class="threat-countdown">'+(q.pending?'正在蓄势 · ':'下次蓄势还有 ')+q.seconds.toFixed(1)+' 秒</p>'+(actions.length?'<div class="actions">'+actions.join('')+'</div>':'')+'<details><summary>应对方法</summary><p class="note">'+esc(q.advice)+'</p>'+(q.pending?'<p class="note">'+esc(reason)+'</p>':'')+'</details></section>';
}
