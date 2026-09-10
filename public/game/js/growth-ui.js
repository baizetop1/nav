import { skillLevel, unlockReason, skillUpgradeQuote, mountQuote, trainedSkill } from './growth.js?v=0.4.1';
const attr={hp:'气血',attack:'攻击',defense:'防御',speed:'速度',strategy:'谋略'};
export function dungeonMountLoot(s,d,id,esc){
  const heroes=d.heroes.filter(h=>h.mount.dungeon===id);
  return heroes.length?`<p class="note mount-loot">坐骑契掉落：${heroes.map(h=>`${esc(h.name)} · ${esc(h.mount.name)}${s.growth?.mounts[h.id]?'（已领骑）':s.inventory[h.mount.contract]>0?'（已持契）':'（未获得时必得）'}`).join('；')}。胜利后领取战果获得；重复通关不重复掉契，养成材料照常给。</p>`:'';
}
function mountOrigin(s,d,h,esc){
  const dungeon=d.by.dungeons[h.mount.dungeon],places=[dungeon.map,...(dungeon.entrances||[]).map(e=>e.map)].map(id=>d.by.maps[id].name);
  return `<p class="note">来源：${esc(dungeon.name)} · 队中一人 ${dungeon.level} 级 · 体力 ${dungeon.cost} · 每日 ${dungeon.limit} 次。入口：${esc(places.join(' / '))}；需先完成该副本的前置剧情。${dungeon.kind==='scheme'?'此处是计策副本，计策成功后领取战果同样掉契。':''}</p>
    <p class="note">${esc(d.by.items[h.mount.contract].name)}：现有 ${s.inventory[h.mount.contract]||0} 张。未持契且未领骑时，通关结算必得；人物可不出阵、也可尚未入寨。领骑仅消耗坐骑契 1 张，不收碎银或驯骑凭记。</p>`;
}
export function stableMounts(s,d,esc,btn){
  const owned=d.heroes.filter(h=>s.heroes[h.id].status==='owned');
  return `<section class="location"><h2 class="subhead">副本寻骑 · 凭契入厩</h2><p>先通关对应历练副本，收取战果中的坐骑契，再来安置专属脚力。已有坐骑保留；驯骑凭记只用于升阶，不是坐骑契。</p>
    <details class="fold-section" data-fold="mount-drop-table"><summary>去哪个副本找坐骑</summary>${d.dungeons.map(x=>`<h3>${esc(x.name)} · ${x.level}级</h3>${dungeonMountLoot(s,d,x.id,esc)}`).join('')}</details>
    ${owned.length?owned.map(h=>{const m=s.growth?.mounts[h.id],q=mountQuote(s,h.id,'mountAdopt',d);return `<details class="fold-section" data-fold="stable-${h.id}"><summary>${esc(h.name)} · ${esc(h.mount.name)} · ${m?'已入厩':s.inventory[h.mount.contract]>0?'可凭契领骑':'待副本获得'}</summary>${m?`<p>已有 ${m.rank} 阶坐骑，亲密 ${m.intimacy}。到好汉详情继续喂养、升阶与骑乘。</p>`:mountOrigin(s,d,h,esc)+`<p class="note">${esc(q.reason||'坐骑契齐备，可直接领骑。')}</p>`+btn('凭契领骑',{type:'mountAdopt',id:h.id},'secondary',!!q.reason)}</details>`;}).join(''):'<p class="note">当前没有入寨好汉。可以先通关收集坐骑契，待对应好汉入寨后再凭契领骑。</p>'}</section>`;
}
export function growthSources(s,d,esc,btn){
  const drill=s.daily.counters.martialDrill||0;
  return `<details class="fold-section" data-fold="growth-sources"><summary>养成材料去哪里找 · 切磋 ${drill}/3</summary>
    <p>武学残页 ${s.inventory.martial_pages||0} · 精制草料 ${s.inventory.mount_feed||0} · 驯骑凭记 ${s.inventory.mount_token||0} · 经验丹 ${s.inventory.exp_pill||0}</p>
    <p class="note">切磋：郓城、马厩或演武场，耗 10 体力，每日 3 次；每次得残页 2、草料 1，第三次另得凭记 1。</p>
    ${btn('切磋研习 · 10 体力',{type:'martialDrill'},'secondary',!['yuncheng','stable','training'].includes(s.location)||drill>=3||s.player.stamina<10||!Object.values(s.heroes).some(h=>h.status==='owned'))}
    <p class="note">任意历练胜利：必得残页 3、草料 2、凭记 1（仍受原有体力、等级、每日次数限制）。三项每日差事各给残页 1；三项总酬劳另给凭记 1。经验丹与精铁可在城中行囊采买。</p>
    <p class="note">每 2 张残页，可在下方人物详情抄录 1 册其专属招式书。未入寨人物不能养成；战斗、计策和际遇中不能升级或换骑。</p>
    <p class="note">坐骑另需通关对应副本掉落的专属坐骑契，再到马厩领骑。切磋、每日差事和商店不会产出坐骑契；驯骑凭记仅用于坐骑升阶。</p>
    <p class="note">首领应对：虎王半血增攻并蓄势群击；匪首蓄势护阵；拦路头目蓄势突袭后位。预兆持续 2 秒，可用燕青打断或眩晕截住，也可用护阵、削弱和恢复扛过。首领受眩晕后会抗控 4 秒。</p>
    <p class="note">阵容取舍：前两位优先承接普通攻击，后位也可能被首领突袭；策士普攻按 60% 谋略计算，谋略伤害忽略 35% 防御。保护、恢复、控制与输出各有所长，不强制使用某一位五星人物。</p>
  </details>`;
}
export function heroGrowth(s,d,h,esc,btn){
  const owned=s.heroes[h.id].status==='owned',m=s.growth?.mounts[h.id];
  const price=cost=>[...(cost.silver?[`碎银 ${cost.silver}`]:[]),...Object.entries(cost.items||{}).map(([id,n])=>`${d.by.items[id].name} ${n}`)].join(' · ');
  const skills=h.skills.map(id=>{
    const skill=d.by.skills[id],level=skillLevel(s,id),reason=unlockReason(s,skill),q=skillUpgradeQuote(s,skill),effective=trainedSkill(skill,level),t=skill.training;
    const power=skill.effect.kind==='attribute'?`${attr[skill.effect.attribute]} +${(effective.effect.rate*100).toFixed(1)}%`:t.profile==='protect'?`自身减伤 ${(40*(1+.08*(level-1))).toFixed(1)}%`:`主效果 ${(effective.effect.rate*100).toFixed(0)}%`;
    return `<section class="growth-skill"><h3>${esc(skill.name)} <span class="badge">${({base:skill.type==='passive'?'本领':'基础招',advanced:'进阶招',bond:'人骑羁绊'})[t.tier]} · ${level}/5 级</span></h3>
      <p>${esc(skill.description)}</p><p class="meta">${esc(power)}${skill.cost?` · 怒气 ${skill.cost} · 调息 ${t.tier==='advanced'?7:5}秒`:''} · ${reason?'未生效：'+esc(reason):'已习得 · 生效中'}</p>
      <p class="note">解锁：${t.level}级 · ${esc(t.label)}。升级后数值效果每级增加基础值的 8%；主动招式的持续时间、怒气消耗不变。羁绊的流血、破甲、眩晕持续时间随等级增加，清除负面状态仍为一种。</p>
      ${owned&&level<5?`<p class="note">下一级消耗：${esc(price(q.cost))}。${q.reason?esc(q.reason)+'。':''}</p>${btn('升级「'+skill.name+'」',{type:'skillUpgrade',id},'secondary',!!q.reason)}`:''}
    </section>`;
  }).join('');
  const mountActions=owned?(m?['mountFeed','mountRank','mountRide']:['mountAdopt']).map(type=>{
    const q=mountQuote(s,h.id,type,d),label=({mountAdopt:'凭契领骑',mountFeed:'喂养 · 亲密 +10',mountRank:'坐骑升阶',mountRide:m?.riding?'下马步行':'骑乘同行'})[type];
    return `<div><p class="note">${type==='mountRide'?'切换无消耗':esc(price(q.cost))}${q.reason?' · '+esc(q.reason):''}</p>${btn(label,{type,id:h.id},'secondary',!!q.reason)}</div>`;
  }).join(''):'';
  return `${owned?`<p class="note">${h.name}专属招式书 ${s.inventory[h.id+'_manual']||0} 册 · 武学残页 ${s.inventory.martial_pages||0} 张</p>${btn('抄录专属招式书 · 残页 2',{type:'skillBook',id:h.id},'secondary',(s.inventory.martial_pages||0)<2)}`:''}
    <div class="growth-skills">${skills}</div>
    <details class="fold-section" data-fold="mount-${h.id}"><summary>专属坐骑 · ${esc(h.mount.name)} · ${m?m.rank+' 阶 / 亲密 '+m.intimacy:'尚未结缘'}</summary>
      ${mountOrigin(s,d,h,esc)}
      <p>${esc(h.mount.description)}</p><p class="note">${m?(m.riding?'骑乘中':'步行中')+'；':''}骑乘时每阶气血、攻击 +2%，速度 +2（最多 5 阶）。本人物 15 级、坐骑 3 阶、亲密 80 并骑乘，解锁第四招羁绊；每三次普攻触发一次。下马保留养成进度。</p>
      <p class="note">领骑：在郓城马厩。喂养、升阶与骑乘切换可在平时的人物页进行。升阶需当前阶数 ×20 的亲密；每阶消耗依次提高，无失败降阶。</p>${mountActions}
    </details>`;
}
