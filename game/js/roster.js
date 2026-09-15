import { hasOwn, requireRule } from './utils.js?v=0.26.0';
import { meets } from './map.js?v=0.26.0';
export const rosterVersion=d=>d.config.rosterVersion||3;
export const isExternal=h=>h.group==='external';
export const canonicalHeroes=d=>d.heroes.filter(h=>!isExternal(h));
export function externalInvitation(s,h){const c=h.obtain,price={silver:c.silver,items:{[c.token]:c.count}};const reason=s.heroes[h.id]?.status==='owned'?'已入寨':!['known','available'].includes(s.heroes[h.id]?.status)||!meets(s,c.condition)?'先完成这位人物的外传相识与委托':!s.camp||s.camp.buildings.hall<c.hall?'聚义厅须达到 '+c.hall+' 级':s.player.silver<c.silver?'碎银不足':(s.inventory[c.token]||0)<c.count?'人物信物不足':'';return {cost:price,reason};}
// Only exact historical dictionaries may gain newly introduced entries. Never repair a missing old hero.
export function migrateRoster(s,d){const current=rosterVersion(d),ids=Object.keys(s.heroes),matches=version=>{const expected=d.heroes.filter(h=>(h.introducedIn||1)<=version);return ids.length===expected.length&&expected.every(h=>hasOwn(s.heroes,h.id));};let from=s.rosterVersion;
 requireRule(from===undefined||Number.isInteger(from)&&from>=3&&from<=current,'不支持这个名册版本，请更新游戏。');
 if(from===undefined){from=[...new Set([2,3,...d.heroes.map(h=>h.introducedIn||1),current])].sort((a,b)=>b-a).find(matches);requireRule(from!==undefined,'旧存档好汉字典不完整，不能自动修补原有进度。');}
 else if(!matches(from)){requireRule(matches(current),'旧存档好汉字典不完整，不能自动修补原有进度。');from=current;}
 for(const h of d.heroes)if((h.introducedIn||1)>from)s.heroes[h.id]={status:'unknown',level:1,exp:0};s.rosterVersion=current;
}
