import { HELPERS, hiredHelpers, hasHelper, helperActive, helperQuote, helperBonus } from './helpers.js?v=0.9.0';

export function helpersBoard(s,btn){
  return `<section class="helpers-board location"><div class="helpers-heading"><h2>乡里招募</h2><span>${hiredHelpers(s).length} / ${HELPERS.length} 位入寨</span></div><p class="note">一些有手艺的小人物，也能把寨子过好。花碎银一次招入，自动操持本职，无需招贤令。乡里帮手单独收录，不占 108 将席位，不进入英雄编队或升品。</p><div class="helpers-grid">${HELPERS.map(h=>{
    const hired=hasHelper(s,h.id),reason=helperQuote(s,h),active=helperActive(s,h);
    return `<article class="helper-card ${hired?'helper-hired':''}" data-helper="${h.id}"><div class="helper-identity"><span class="helper-role">${h.role}</span><h3>${h.name}</h3></div><p class="helper-story">${h.story}</p><p class="helper-effect">${h.effect}</p><p class="note">${h.building?'建成'+h.buildingName+'生效':'入寨即生效'} · 聚义厅 ${h.hall} 级</p>${hired?`<p class="helper-status">${active?'已上工':'已入寨 · 等待'+h.buildingName}</p>`:btn(reason||`招入寨中 · ${h.price} 银`,{type:'campHireHelper',id:h.id},'secondary',!!reason)}</article>`;
  }).join('')}</div></section>`;
}
export function helperSummary(s){
  const hired=hiredHelpers(s),bonus=helperBonus(s),labels={wood:'木材',food:'粮草',silver:'碎银'};
  return `<div class="helper-summary"><b>乡里帮手 · ${hired.length} 位</b><p class="note">${hired.length?hired.map(h=>h.name+(helperActive(s,h)?'':'（待建'+h.buildingName+'）')).join('、'):'樵夫、农户等乡人可来寨中帮忙。'}</p>${hired.length?`<p class="note">每次经营额外：${Object.entries(labels).filter(([key])=>bonus[key]).map(([key,name])=>name+' +'+bonus[key]).join('、')||'暂无'}。${bonus.heal?'治疗人数上限 +'+bonus.heal+'。':''}产出已计入下方预览。</p>`:''}<button type="button" class="text-action" data-view="recruit">招募乡里帮手</button></div>`;
}
