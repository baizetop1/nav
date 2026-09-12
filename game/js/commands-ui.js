import { freshOrders, equipmentMatches } from './commands.js?v=0.15.0';

export function ordersPanel(s,d,btn,esc,locked){
 const b=s.battle;if(b.rules!==2)return '';
 const o=b.orders||freshOrders(),disabled=locked||!!b.outcome,focus=b.enemy.find(u=>u.id===o.focus&&u.hp>0);
 const reserveHeroes=b.team.filter(u=>u.hp>0&&u.skills.some(id=>d.by.skills[id].type!=='passive'&&d.by.skills[id].training?.profile==='interrupt'));
 const command=(label,params,active,blocked=false)=>`<button type="button" class="secondary" aria-pressed="${active}" data-command="${esc(JSON.stringify({type:'battleOrder',...params}))}" ${disabled||blocked?'disabled':''}>${label}</button>`;
 return `<section class="battle-orders" aria-label="阵前指挥"><h2 class="subhead">阵前指挥</h2>
 <p class="note">集火：${esc(focus?.name||'自由迎敌')} · 攻守：${o.stance==='guard'?'收势固守':'正常攻守'}</p>
 <div class="actions" role="group" aria-label="集火目标">${command('自由迎敌',{kind:'focus',target:null},!focus)}${b.enemy.filter(u=>u.hp>0).map(u=>command('集火 '+esc(u.name),{kind:'focus',target:u.id},focus?.id===u.id)).join('')}</div>
 <div class="actions" role="group" aria-label="攻守安排">${[['balanced','正常攻守'],['guard','收势固守']].map(([value,label])=>command(label,{kind:'stance',value},o.stance===value,o.stance===value||o.readyAt>b.elapsed)).join('')}${o.readyAt>b.elapsed?`<span class="meta">调整间隔 ${Math.ceil((o.readyAt-b.elapsed)/1000)} 秒</span>`:''}</div>
 <div class="actions">${command(o.reserve?'已保留打断招式':'保留打断招式',{kind:'reserve',value:!o.reserve},o.reserve)}</div>
 <p class="meta">固守：输出与承伤均 −20% · ${o.reserve?reserveHeroes.length?reserveHeroes.map(u=>esc(u.name)).join('、')+'留招':'暂无已解锁打断的好汉':'自动技能照常'}</p>
 <details data-fold="battle-orders-help"><summary>查看军令规则</summary><p class="note">集火影响普攻和常规单体招式；嘲讽优先，追击后排等专属招式保留原目标。固守使双方对彼此的直接伤害都减少 20%，切换间隔 3 秒；持续伤害与治疗不变。</p>
 <p class="note">留招仅影响自动技能：${reserveHeroes.length?reserveHeroes.map(u=>esc(u.name)).join('、')+'留怒等待首领蓄势，只自动使用打断招式。':'当前阵容未解锁打断招式，暂无可留招者。'}手动施招仍可随时决定。</p></details></section>`;
}
export function equipmentFilters(s,d,filter,btn,esc){
 const options=(id,label,rows)=>`<label>${label}<select id="gear-${id}">${rows.map(([v,t])=>`<option value="${esc(v)}" ${(filter[id]||'all')===v?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 const count=s.equipment.filter(e=>equipmentMatches(e,d,filter)).length;
 return `<section class="equipment-tools" aria-label="装备筛选"><h2 class="subhead">整理装备 · ${count} / ${s.equipment.length}</h2><div class="gear-filters"><label>名称<input id="gear-query" maxlength="30" value="${esc(filter.query||'')}" placeholder="搜索装备"></label>
 ${options('type','部位',[['all','全部部位'],...Array.from(new Set(d.equipments.map(m=>m.type))).map(v=>[v,({weapon:'武器',armor:'衣甲',accessory:'饰物'})[v]||v])])}
 ${options('quality','品质',[['all','全部品质'],...Array.from(new Set(d.equipments.map(m=>m.quality))).map(v=>[v,v])])}
 ${options('state','状态',[['all','全部状态'],['worn','已穿戴'],['bag','行囊中'],['locked','已锁定'],['free','可分解']])}</div>
 <div class="actions">${btn('筛选装备',{type:'ui_gearFilter'},'secondary')}${btn('清除筛选',{type:'ui_gearReset'},'text-action')}</div><p class="note">锁定可防止分解，仍能穿戴和强化。筛选只改变显示。</p>${count?'':'<p role="status">没有符合条件的装备，可清除筛选查看全部。</p>'}</section>`;
}
export function recruitBatchDialog(results,data,esc,portrait){
 const counts=kind=>results.filter(r=>r.kind===kind).length;
 return `<dialog id="recruit-result" class="recruit-result recruit-batch" aria-labelledby="recruit-result-title" aria-describedby="recruit-result-description"><button type="button" class="result-close" data-result-action="close" aria-label="关闭招贤结果">×</button>
 <p class="kicker">招贤馆 · 十封来信</p><h2 id="recruit-result-title" tabindex="-1">十连招贤结果</h2><p id="recruit-result-description">入寨 ${counts('joined')} 位 · 故友来访 ${counts('duplicate')} 次 · 英雄传闻 ${counts('clue')} 次。已消耗普通招贤令 ×10。</p>
 <div class="recruit-batch-grid">${results.map(r=>{const h=data.by.heroes[r.hero];return `<article class="card batch-draw">${portrait(h,true)}<p class="meta">第 ${r.number} 次 · ${'★'.repeat(h.star)}</p><h3>${esc(h.name)}</h3><p>${({joined:'好汉入寨',duplicate:'故友来访',clue:'传闻，尚未入寨'})[r.kind]}</p><p class="meta">${r.tokens?'信物 ×'+r.tokens+(r.merit?' · 功勋 +'+r.merit:''):r.inTeam?'已补入出阵队伍':'可到好汉页编队'}</p></article>`;}).join('')}</div>
 <p class="note">十连逐次使用普通招贤规则，共享原有保底；传闻需先在江湖相识。结果按抽取顺序展示。</p><p id="recruit-result-save" class="note"></p><div class="actions"><button type="button" class="primary" data-result-action="close">收下十封来信</button><button type="button" class="secondary" data-result-action="heroes">查看好汉</button></div></dialog>`;
}
