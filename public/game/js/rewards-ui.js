import { CORPS, corpsRank } from './development.js?v=0.15.0';
import { HELPERS, hasHelper } from './helpers.js?v=0.15.0';
import { qualityOf, QUALITIES } from './quality.js?v=0.15.0';
// Derive the visible receipt from a completed transaction, never from a second roll.
export function gains(before,after,data){
  const rows=[];const add=(name,n)=>{if(n>0)rows.push({name,amount:n});};
  for(const [id,name] of Object.entries({silver:'碎银',merit:'功勋',prestige:'威望',stamina:'体力'}))add(name,after.player[id]-before.player[id]);
  for(const [id,n] of Object.entries(after.inventory))add(data.by.items[id]?.name||id,n-(before.inventory[id]||0));
  for(const [id,name] of Object.entries({wood:'木材',food:'粮草',troops:'乡勇归队'}))add(name,(after.camp?.[id]||0)-(before.camp?.[id]||0));
  for(const h of data.heroes){const a=after.heroes[h.id],b=before.heroes[h.id];if(a.status==='owned'&&b.status!=='owned')rows.push({name:h.name+' · 正式入寨',amount:1});else if(a.level>b.level)rows.push({name:h.name+' · 升至 '+a.level+'级',amount:a.level-b.level});}
  for(const h of data.heroes){const a=after.heroes[h.id],b=before.heroes[h.id];if(a.status==='owned'&&b.status==='owned'){const total=v=>(v.level-1)*20+15*(v.level-1)*v.level/2+v.exp;add(h.name+' · 历练',total(a)-total(b));}}
  for(const e of after.equipment)if(!before.equipment.some(old=>old.uid===e.uid))rows.push({name:data.by.equipments[e.item].quality+' · '+data.by.equipments[e.item].name,amount:1});
  for(const [id,m] of Object.entries(after.growth?.mounts||{}))if(!before.growth?.mounts[id])rows.push({name:data.by.heroes[id].mount.name+' · 坐骑入厩',amount:1});
  for(const [id,m] of Object.entries(after.growth?.mounts||{})){const old=before.growth?.mounts[id];if(old){add(data.by.heroes[id].mount.name+' · 亲密',m.intimacy-old.intimacy);if(m.rank>old.rank)rows.push({name:data.by.heroes[id].mount.name+' · 升至 '+m.rank+' 阶',amount:m.rank-old.rank});}}
  for(const [id,level] of Object.entries(after.growth?.skills||{}))add(data.by.skills[id].name+' · 招式等级',level-(before.growth?.skills[id]||1));
  for(const h of data.heroes)if(qualityOf(after.heroes[h.id])>qualityOf(before.heroes[h.id]))rows.push({name:h.name+' · 升至'+QUALITIES[qualityOf(after.heroes[h.id])].name+'品',amount:1});
  for(const h of HELPERS)if(hasHelper(after,h.id)&&!hasHelper(before,h.id))rows.push({name:h.role+" · "+h.name+"入寨",amount:1});
  for(const h of data.heroes)if(corpsRank(after,h.id)>corpsRank(before,h.id))rows.push({name:CORPS[h.id].name+' · 升至 '+corpsRank(after,h.id)+' 阶',amount:1});
  return rows;
}
export function rewardDialog(rows,esc,{saved=true,emptyVictory=false,dungeonVictory=false,battleSummary=null}={}){return `<dialog id="reward-result" aria-labelledby="reward-title"><p class="kicker">本次所得</p><h2 id="reward-title" tabindex="-1">${battleSummary||emptyVictory?'战斗结算':'此番收获'}</h2>${battleSummary?`<section class="battle-receipt"><p>${esc(battleSummary.outcome==='victory'?'得胜回寨':'此次收兵，下次再战')}</p>${battleSummary.troops?`<p>乡勇 ${battleSummary.troops} 人随行 · ${battleSummary.troops-battleSummary.wounded} 人安然归营 · 伤兵 ${battleSummary.wounded} 人</p><p class="note">伤兵可回寨到医馆治疗。</p>`:'<p class="note">英雄作战，无随行乡勇。</p>'}</section>`:''}<div class="reward-grid">${rows.map(r=>`<article><span>${esc(r.name)}</span><b>+${r.amount}</b></article>`).join('')||'<p>本次没有新增物品。</p>'}</div><p class="note">${saved?'结果已保存到本机。':'本机暂未保存，请到存档页导出进度。'}</p>${dungeonVictory?'<p class="note">副本坐骑契每张独立 20% 概率，无保底；本次未出现即未掉落。</p>':''}<button type="button" class="primary" data-reward-close>收好，继续</button></dialog>`;}
