export function batchButtons(id,kind,btn){return `<div class="actions batch-actions">${[5,10].map(count=>btn('批量'+count+'次 · 先预览',{type:'ui_batchPreview',kind,id,count},'secondary')).join('')}</div>`;}
export function batchDialog(q,a,esc,btn){
  const note={experience:'按上方数量赠送经验丹，达到满级即停；最后一颗按整颗使用。',feed:'按上方数量喂养，亲密达到 100 即停；最后一份草料按整份使用。',manual:'每册消耗两张残页，只抄录这位好汉的专属招式书。',buy:'按上方数量与总价结清；招贤令仍受每日三张限购约束。'}[a.kind];
  const limit=q.count&&q.reason.includes('等级上限')?'本次数量用完后达到人物等级上限':q.count&&q.reason==='亲密已满'?'本次数量用完后亲密达到 100':q.reason;
  return `<dialog id="batch-preview" aria-labelledby="batch-title"><p class="kicker">办理前确认</p><h2 id="batch-title" tabindex="-1">${esc(q.title)}</h2><p>计划 ${a.count} 次，当前可办理 <b>${q.count}</b> 次。</p>${limit?`<p class="note">${esc(limit)}${q.count?'；本次已减少数量。':''}</p>`:''}<div class="batch-changes">${q.rows.map(r=>`<p><span>${esc(r.name)}</span><b>${esc(r.value)}</b></p>`).join('')}</div><p class="note">${esc(note)}</p><div class="actions">${btn('确认办理 '+q.count+' 次',{type:'batchApply',kind:a.kind,id:a.id,count:q.count,expected:q.signature},'primary',!q.count)}${btn('取消',{type:'ui_batchCancel'},'secondary')}</div></dialog>`;
}
