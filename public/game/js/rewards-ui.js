import {ROUTE_PRIZES,routeBalance} from './journey-rewards.js?v=0.44.0';
import {JOURNEYS,JOURNEY_TIERS,BOONS} from './journey-data.js?v=0.44.0';
import {dialogTabs,dialogPanel} from './dialog-pages.js?v=0.44.0';
import {COMBOS,PERSONAL} from './expansion-data.js?v=0.44.0';
import {RELICS,CHALLENGES} from './realm-data.js?v=0.44.0';
import { totalExperience } from './progression.js?v=0.44.0';
import { CORPS, corpsRank } from './development.js?v=0.44.0';
import { HELPERS, hasHelper } from './helpers.js?v=0.44.0';
import { qualityOf, QUALITIES } from './quality.js?v=0.44.0';
// Derive the visible receipt from a completed transaction, never from a second roll.
export function gains(before,after,data){
  const rows=[];const add=(name,n)=>{if(n>0)rows.push({name,amount:n});};
  for(const [key,name] of [['points','荐贤积分'],['tickets','迎贤荐书']])add(name,(after.recruit.support?.[key]||0)-(before.recruit.support?.[key]||0));
  for(const [id,name] of Object.entries({silver:'碎银',merit:'功勋',prestige:'威望',stamina:'体力'}))add(name,after.player[id]-before.player[id]);
  for(const [id,n] of Object.entries(after.inventory))add(data.by.items[id]?.name||id,n-(before.inventory[id]||0));
  for(const [id,name] of Object.entries({wood:'木材',food:'粮草',troops:'乡勇归队'}))add(name,(after.camp?.[id]||0)-(before.camp?.[id]||0));
  for(const h of data.heroes){const a=after.heroes[h.id],b=before.heroes[h.id];if(a.status==='owned'&&b.status!=='owned')rows.push({name:h.name+' · 正式入寨',amount:1});else if(a.level>b.level)rows.push({name:h.name+' · 升至 '+a.level+'级',amount:a.level-b.level});}
  for(const h of data.heroes){const a=after.heroes[h.id],b=before.heroes[h.id];if(a.status==='owned'&&b.status==='owned'){add(h.name+' · 历练',totalExperience(a)-totalExperience(b));}}
  for(const e of after.equipment)if(!before.equipment.some(old=>old.uid===e.uid))rows.push({name:data.by.equipments[e.item].quality+' · '+data.by.equipments[e.item].name,amount:1});
  for(const [id,m] of Object.entries(after.growth?.mounts||{}))if(!before.growth?.mounts[id])rows.push({name:data.by.heroes[id].mount.name+' · 坐骑入厩',amount:1});
  for(const [id,m] of Object.entries(after.growth?.mounts||{})){const old=before.growth?.mounts[id];if(old){add(data.by.heroes[id].mount.name+' · 亲密',m.intimacy-old.intimacy);if(m.rank>old.rank)rows.push({name:data.by.heroes[id].mount.name+' · 升至 '+m.rank+' 阶',amount:m.rank-old.rank});}}
  for(const [id,level] of Object.entries(after.growth?.skills||{}))add(data.by.skills[id].name+' · 招式等级',level-(before.growth?.skills[id]||1));
  for(const h of data.heroes)if(qualityOf(after.heroes[h.id])>qualityOf(before.heroes[h.id]))rows.push({name:h.name+' · 升至'+QUALITIES[qualityOf(after.heroes[h.id])].name+'品',amount:1});
  for(const h of HELPERS)if(hasHelper(after,h.id)&&!hasHelper(before,h.id))rows.push({name:h.role+" · "+h.name+"入寨",amount:1});
  for(const h of data.heroes)if(corpsRank(after,h.id)>corpsRank(before,h.id))rows.push({name:CORPS[h.id].name+' · 升至 '+corpsRank(after,h.id)+' 阶',amount:1});
  for(const id of after.realm?.relics||[])if(!before.realm?.relics.includes(id))add(RELICS[id].name+' · 军中藏品',1);for(const [id,m]of Object.entries(CHALLENGES))if(after.progress.flags['realm_badge_'+id]&&!before.progress.flags['realm_badge_'+id])add(m.name+' · 勋章',1);
  for(const [id,m]of Object.entries(COMBOS))if((after.expansion?.combos[id]||0)>=3&&(before.expansion?.combos[id]||0)<3)add(m.name+' · 合击解锁',1);for(const [id,m]of Object.entries(PERSONAL))if(after.expansion?.personal[id]&&!before.expansion?.personal[id])add(m.name+' · 本领强化',1);
  for(const [id,tier] of Object.entries(after.realm?.journey?.best||{})){const old=before.realm?.journey?.best[id]||0;if(tier>old){if(!old)for(const boon of JOURNEYS[id].discoveries)add(BOONS[boon].name+' · 新战法',1);if(tier<3)add(JOURNEYS[id].name+' · '+JOURNEY_TIERS[tier+1].name+'开放',1);}}
  for(const [id,m] of Object.entries(ROUTE_PRIZES))add(m.name,routeBalance(after,id)-routeBalance(before,id));
  return rows;
}
export function rewardDialog(rows,esc,{saved=true,emptyVictory=false,dungeonVictory=false,battleSummary=null,review='',growth='',loot='',next=null,lesson=false}={}){
 const pages=[];for(let i=0;i<Math.max(1,rows.length);i+=8)pages.push(rows.slice(i,i+8));
 const receipt=lesson?'<section class="battle-receipt"><b>'+(battleSummary?.outcome==='victory'?'演武目标完成':'本次演武已结束')+'</b><p class="note">自己的好汉、阵容和物资保持原样。演武不计入真实胜负，不发战利品。</p></section>':battleSummary?'<section class="battle-receipt"><b>'+esc(battleSummary.outcome==='victory'?(battleSummary.context?.id?.startsWith('journey_')?'此段得胜，继续前行':'得胜回寨'):'此次收兵，下次再战')+'</b>'+(battleSummary.troops?'<div class="receipt-counts">'+[['随行',battleSummary.troops],['归营',battleSummary.troops-battleSummary.wounded-(battleSummary.fallen||0)],['伤兵',battleSummary.wounded],['阵亡',battleSummary.fallen||0]].map(([k,v])=>'<span>'+k+' <b>'+v+'</b></span>').join('')+'</div><p class="note">伤兵可治疗；阵亡须重新募兵，不能复活。</p>':'<p class="note">英雄作战，无随行乡勇。</p>')+'</section>':'';
 const items=pages.map((page,i)=>'<div class="reward-grid" data-reward-sheet="'+i+'" '+(i?'hidden':'')+'>'+ (page.map(r=>'<article><span>'+esc(r.name)+'</span><b>+'+r.amount+'</b></article>').join('')||'<p>本次没有新增物品。</p>')+'</div>').join('')+(pages.length>1?'<nav class="reward-pager" aria-label="收获翻页"><button type="button" data-reward-page="-1" disabled>上一页</button><span data-reward-counter aria-live="polite">1 / '+pages.length+'</span><button type="button" data-reward-page="1">下一页</button></nav>':'');
 const body=receipt+(lesson?'':items)+(dungeonVictory?'<p class="note">坐骑契每张独立 20%，无保底；未出现即未掉落。</p>':'');
 const tabs={rewards:lesson?'演武结果':'本次收获',...(growth?{growth:'成长变化'}:{}),...(loot?{loot:'掉落明细'}:{}),...(review?{review:'战斗复盘'}:{})},tabbed=Object.keys(tabs).length>1;
 const nextButton=next?'<button type="button" class="secondary" data-reward-command="'+esc(JSON.stringify(next.command))+'">'+esc(next.label||'前往下一步')+'</button>':'';
 return '<dialog id="reward-result" class="compact-dialog" aria-labelledby="reward-title"><header class="dialog-header"><h2 id="reward-title" tabindex="-1">'+(lesson?'演武结算':battleSummary||emptyVictory?'战斗结算':'此番收获')+'</h2><span>'+(lesson?'无资源消耗':rows.length+' 项所得')+'</span></header>'+(tabbed?dialogTabs('receipt',tabs,'rewards'):'')+'<div class="dialog-body">'+(tabbed?dialogPanel('receipt','rewards',body,'rewards')+(growth?dialogPanel('receipt','growth',growth,'rewards'):'')+(loot?dialogPanel('receipt','loot',loot,'rewards'):'')+(review?dialogPanel('receipt','review',review,'rewards'):''):body)+'</div><footer class="dialog-footer">'+(next?'<p class="reward-next note"><b>下一步：'+esc(next.title)+'</b></p>':'')+'<p class="note">'+(saved?'结果已保存到本机。':'本机暂未保存，请到存档页导出进度。')+'</p><div class="actions">'+nextButton+'<button type="button" class="primary" data-reward-close>收好，继续</button></div></footer></dialog>';
}
