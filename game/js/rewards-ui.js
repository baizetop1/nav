// Derive the visible receipt from a completed transaction, never from a second roll.
export function gains(before,after,data){
  const rows=[];const add=(name,n)=>{if(n>0)rows.push({name,amount:n});};
  for(const [id,name] of Object.entries({silver:'碎银',merit:'功勋',prestige:'威望',stamina:'体力'}))add(name,after.player[id]-before.player[id]);
  for(const [id,n] of Object.entries(after.inventory))add(data.by.items[id]?.name||id,n-(before.inventory[id]||0));
  for(const [id,name] of Object.entries({wood:'木材',food:'粮草',troops:'乡勇归队'}))add(name,(after.camp?.[id]||0)-(before.camp?.[id]||0));
  for(const h of data.heroes){const a=after.heroes[h.id],b=before.heroes[h.id];if(a.status==='owned'&&b.status!=='owned')rows.push({name:h.name+' · 正式入寨',amount:1});else if(a.level>b.level)rows.push({name:h.name+' · 升至 '+a.level+'级',amount:a.level-b.level});}
  for(const e of after.equipment)if(!before.equipment.some(old=>old.uid===e.uid))rows.push({name:data.by.equipments[e.item].name,amount:1});
  for(const [id,m] of Object.entries(after.growth?.mounts||{}))if(!before.growth?.mounts[id])rows.push({name:data.by.heroes[id].mount.name+' · 坐骑入厩',amount:1});
  return rows;
}
export function rewardDialog(rows,esc,{saved=true,emptyVictory=false,dungeonVictory=false}={}){return `<dialog id="reward-result" aria-labelledby="reward-title"><p class="kicker">本次所得</p><h2 id="reward-title" tabindex="-1">${emptyVictory?'战斗结算':'此番收获'}</h2><div class="reward-grid">${rows.map(r=>`<article><span>${esc(r.name)}</span><b>+${r.amount}</b></article>`).join('')||'<p>本次没有新增物品。</p>'}</div><p class="note">${saved?'结果已保存到本机。':'本机暂未保存，请到存档页导出进度。'}</p>${dungeonVictory?'<p class="note">副本坐骑契每张独立 20% 概率，无保底；本次未出现即未掉落。</p>':''}<button type="button" class="primary" data-reward-close>收好，继续</button></dialog>`;}
