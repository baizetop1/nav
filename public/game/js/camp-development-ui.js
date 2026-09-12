import { helperSummary } from './helpers-ui.js?v=0.15.0';
import { DUTIES, dutyQuote, steward, stewardship, CAMP_GOALS, goalClaimed, goalReady, RAID_INTEL, equipmentPool } from './camp-development.js?v=0.15.0';
const resource={wood:'木材',food:'粮草',silver:'碎银'};
const quality={1:'凡品',2:'良品',3:'珍品'};
export function goalBoard(s,d,btn){
  const pending=CAMP_GOALS.filter(g=>!goalClaimed(s,g)),current=pending.find(g=>goalReady(s,g))||pending[0];
  const card=g=>`<article class="camp-goal ${goalClaimed(s,g)?'goal-done':''}"><div class="goal-heading"><h3>${g.name}</h3><span class="badge">${goalClaimed(s,g)?'已领酬劳':goalReady(s,g)?'可领取':'进行中'}</span></div><ul>${g.requirements.map(([label,test])=>`<li class="${test(s)?'requirement-done':''}">${test(s)?'已成':'尚待'} · ${label}</li>`).join('')}</ul><p class="note">奖励：${[...Object.entries(resource).filter(([key])=>g.reward[key]).map(([key,name])=>name+' '+g.reward[key]),...Object.entries(g.reward.items||{}).map(([id,n])=>d.by.items[id].name+' '+n)].join(' · ')}</p>${btn(goalClaimed(s,g)?'酬劳已领':'领取建寨酬劳',{type:'campClaim',id:g.id},'secondary',goalClaimed(s,g)||!goalReady(s,g))}</article>`;
  return `<section class="camp-goals" id="camp-goals"><div class="goal-heading"><h2>建寨志</h2><span>${CAMP_GOALS.length-pending.length} / ${CAMP_GOALS.length} 已完成</span></div>${current?card(current):'<p>寨中已有根基。继续培养好汉，挑战江湖副本、搜寻装备与坐骑。</p>'}<details data-fold="camp-goals"><summary>查看全部建寨目标</summary>${CAMP_GOALS.filter(g=>g!==current).map(card).join('')}</details></section>`;
}
export function dutyBoard(s,d,btn,portrait){
  const id=steward(s),h=id&&d.by.heroes[id];
  return `<section class="camp-duties"><h2>今日寨务</h2>${helperSummary(s)}<div class="steward-strip">${h?portrait(h,true):''}<div><b>${h?h.name+'主持寨务':'乡人各自操持'}</b><p class="note">${h?resource[stewardship(id)]+'产出 +20% · 每次经营本人获得 25 历练':'可在好汉页委派一位主事，增加其擅长物资的产出。'}</p></div><button class="text-action" data-view="heroes">${h?'更换主事':'委派好汉'}</button></div><div class="duty-grid">${Object.entries(DUTIES).map(([mode,m])=>{const q=dutyQuote(s,mode);return `<article class="duty-card"><h3>${m.name}</h3><p class="note">${m.description}</p><p class="duty-yield">${Object.entries(q).map(([key,n])=>`<span>${resource[key]} <b>+${n}</b></span>`).join('')}</p>${btn('安排寨务 · 5 体力',{type:'campWork',id:mode},'secondary',s.player.stamina<5)}</article>`;}).join('')}</div><p class="note">任选一项经营一日，以上为本次实际产出。经营日不加速体力恢复；主事仍可随队出征。</p></section>`;
}
export function heroStewardCard(s,d,h,btn){
  if(!s.camp||s.heroes[h.id].status!=='owned')return '';
  const assigned=steward(s)===h.id,v=s.heroes[h.id],cap=v.level>=d.config.balance.heroLevelCap,need=20+v.level*15;
  return `<section class="hero-duty"><p><b>${assigned?'寨务主事':'内务所长'}</b> · ${resource[stewardship(h.id)]}增产 20%</p><div class="hero-exp"><label for="hero-exp-${h.id}">${cap?'已达本卷等级上限':'距下一级还需 '+Math.max(0,need-v.exp)+' 历练'}</label><progress id="hero-exp-${h.id}" max="${need}" value="${cap?need:v.exp}"></progress></div>${btn(assigned?'卸任寨务主事':'委派为寨务主事',{type:'campSteward',id:assigned?null:h.id},'secondary',s.affairs?.mission?.hero===h.id)}<p class="note">主持经营每次获得 25 历练。委派新主事会替换现任。</p></section>`;
}
export function raidIntel(s,d,id){
  const i=RAID_INTEL[id],active=s.camp.tactic===i.tactic;
  return `<div class="raid-intel"><p>${i.text}</p><p class="note">${i.bonus}</p><b class="${active?'intel-active':'intel-pending'}">${active?'当前军令获得地形加成':'可调整上方军令应对敌情'}</b></div>`;
}
export function equipmentLoot(d,tier){
  const t=Math.min(3,tier),pool=equipmentPool(d,t);
  return `<details class="loot-pool"><summary>装备搜获 · ${quality[t]} · 25%</summary><p class="note">胜利结算时，25% 概率从以下装备等概率获得一件，无保底：${pool.map(e=>e.name).join('、')}。未获得的概率为 75%；可重复掉落，装备满 200 件时折为碎铁。</p></details>`;
}
