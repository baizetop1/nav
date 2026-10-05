import {fullLineupAdvice,roleReadiness,recommendLineups,combatCapabilities} from './lineup-model.js?v=0.64.0';
import {HERO_ROLES} from './hero-roles.js?v=0.64.0';
import {waterBattle} from './frontier-data.js?v=0.64.0';
// Read the quoted battle, not the saved team: unconfirmed formation changes must be reflected.
export function lineupAdvice(b,d){
 if(!b||b.guest)return [];
 const living=b.team.filter(u=>u.hp>0),ids=living.map(u=>u.id),skills=living.flatMap(u=>u.skills.map(id=>d.by.skills[id]).filter(Boolean)),has=id=>ids.includes(id),tips=[];
 const heal=living.some(u=>combatCapabilities(u,d,b).heal);
 const disrupt=living.some(u=>{const c=combatCapabilities(u,d,b);return c.control||c.armor;});
 if(has('linchong')&&b.team[0].id!=='linchong')tips.push('林冲在首位才有开场护阵，可到“整备”换位。');
 if(has('ruanxiaoqi'))tips.push(waterBattle(b)?'此地临水，阮小七开场能为全队护阵，掩护后排施招。':'此战在陆地，阮小七的护舟接阵无法生效。');
 if(has('wuyong'))tips.push(disrupt?'先对敌人施加破甲、削弱或眩晕，再让吴用攻击同一目标，可多打伤害。':'吴用需同伴先施加破甲、削弱或眩晕，队中还缺这样的人选。');
 if(has('luzhishen'))tips.push(heal?'鲁智深低血护阵后，可接上治疗。这项本领每战仅一次，无法救下已受致命伤的他。':'鲁智深每战只能在低血时护阵一次，队中还没有治疗招式，宜带些药。');
 if(has('huarong')&&(has('shiqian')||has('wusong')))tips.push('先手与收尾：花荣先压低高血目标；'+(has('shiqian')?'时迁追击半血以下目标；':'')+(has('wusong')?'武松在敌方只剩一人后增伤；':'')+'可配合集火军令安排攻击目标。');
 if(has('songjiang'))tips.push('治疗回怒：宋江需实际恢复气血才给受疗者回怒，满血时施招不会触发这项本领。');
 if(has('wusong')&&b.enemy.filter(u=>u.hp>0).length>1)tips.push('清场顺序：武松的独敌决胜尚未满足，先击败随从，剩一名敌人后普攻才有额外增伤。');
 return [...new Set([...tips,...fullLineupAdvice(b,d)])];
}
export function lineupPanel(b,d,esc){
 if(!b)return '<p class="note">此行无需交战。</p>';
 if(b.guest)return '<p class="note">此战由助阵人物出手，不借用本队的本领。</p>';
 const rows=b.team.map(u=>{const m=HERO_ROLES[u.id];return '<article class="lineup-role"><h3>'+esc(u.name)+' · '+(m?m.name:'既有招式与兵种')+'</h3><p class="note">'+(u.hp<=0?'已退阵，本次不能发挥本领。':m?m.text:'人物资料尚未载入。')+'</p>'+(roleReadiness(b,u,d)?'<p class="note role-readiness">'+esc(roleReadiness(b,u,d))+'</p>':'')+'</article>';}).join(''),tips=lineupAdvice(b,d);
 return '<section class="lineup-panel"><h3>本次搭配</h3><p class="note">根据本次阵容、招式和敌情列出。</p>'+rows+(tips.length?'<h3>配合建议</h3>'+tips.map(t=>'<p class="note">'+esc(t)+'</p>').join(''):'<p class="note">先确认谁承伤、谁恢复、谁打断，再结合敌情选择集火目标。</p>')+'</section>';
}

export function recommendedPanel(s,d,b,esc,btn,quote){const rows=recommendLineups(s,d,b);return '<details class="lineup-recommendations"><summary>推荐阵容</summary><p class="note">从已入寨好汉中选配，换好阵容后仍需确认出征。</p>'+rows.map(r=>{const q=quote(r.team);return '<article class="lineup-role"><h3>'+r.name+'</h3><p>'+r.team.map(id=>esc(d.by.heroes[id].name)+' '+s.heroes[id].level+'级').join(' · ')+'</p><p class="note">'+r.text+'</p>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'<p class="note">体力 '+q.cost.stamina+' · 粮草 '+q.cost.food+' · 实际带兵 '+(q.battle?.expedition?.troops||0)+' 人</p>')+btn('试用'+r.name,{type:'ui_sortieRecommend',team:r.team},'secondary',!!q.reason)+'</article>';}).join('')+(rows.length?'':'<p class="note">暂无合适的三人搭配，可到“整备”自行点将。</p>')+'</details>';}
