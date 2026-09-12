import { ARMS, heroArm, heroTrait, enemyArm, armFactor } from './martial.js?v=0.12.0';
import { CORPS } from './development.js?v=0.12.0';
export function traitCard(h){const [name,text]=heroTrait(h);return `<section class="martial-trait"><b>英雄专长 · ${ARMS[heroArm(h)].name} · ${name}</b><p class="note">${text} 特性在建寨后的非剧情战生效。</p></section>`;}
export function enemyIntel(s,d,ids,scale=1){
 const n=s.camp?.mode==='army'?Math.min(s.camp.troops,s.camp.deployment):0;
 return `<div class="enemy-intel"><b>敌情预览</b>${ids.map(id=>{const e=d.by.enemies[id],a=enemyArm(id);return `<p class="note">${e.name} · ${ARMS[a].name} · 气血 ${Math.round(e.attribute.hp*scale)} · 攻击 ${Math.round(e.attribute.attack*scale)} · 防御 ${Math.round(e.attribute.defense*scale)}</p><p class="note">${s.team.map((id,i)=>{const troops=Math.floor(n/s.team.length)+(i<n%s.team.length?1:0),arm=troops?CORPS[id].arm:heroArm(d.by.heroes[id]),f=armFactor(arm,a);return d.by.heroes[id].name+'：'+ARMS[arm].name+(f>1?'占优':f<1?'受克':'无克制');}).join(' · ')}</p>`;}).join('')}<p class="note">步军 → 弓军 → 骑军 → 步军。伤害占优 +20%、受克 -15%。带兵按每位好汉的专属部队分别计算；未分到乡勇时按英雄专长。</p></div>`;
}
