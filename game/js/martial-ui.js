import { ARMS, heroArm, heroTrait, enemyArm, armFactor } from './martial.js?v=0.9.0';
export function traitCard(h){const [name,text]=heroTrait(h);return `<section class="martial-trait"><b>出战专长 · ${ARMS[heroArm(h)].name} · ${name}</b><p class="note">${text} 特性在建寨后的非剧情战生效。</p></section>`;}
export function enemyIntel(s,d,ids,scale=1){
  const arm=s.camp?.mode==='army'?(s.camp.arm||'infantry'):null;
  return `<div class="enemy-intel"><b>敌情预览</b>${ids.map(id=>{const e=d.by.enemies[id],a=enemyArm(id),factor=arm?armFactor(arm,a):1;return `<p class="note">${e.name} · ${ARMS[a].name} · 气血 ${Math.round(e.attribute.hp*scale)} · 攻击 ${Math.round(e.attribute.attack*scale)} · 防御 ${Math.round(e.attribute.defense*scale)}${arm?' · 当前兵种'+(factor>1?'占优':factor<1?'受克':'无克制'):''}</p>`;}).join('')}<p class="note">步军 → 弓军 → 骑军 → 步军。克制方向伤害 +20%，受克 -15%；独行时按各英雄专长计算。</p></div>`;
}
