import {QUALITIES,promotionQuote} from './quality.js?v=0.84.0';
import {SPECIAL_DUNGEONS} from './special-dungeons-data.js?v=0.84.0';
const paths=[
 '<rect x="8" y="8" width="40" height="40" rx="9"/><path d="M13 20v-7h7M36 13h7v7M43 36v7h-7M20 43h-7v-7"/>',
 '<path d="M28 4L48 16v24L28 52 8 40V16z"/><path d="M14 28c0-8 6-15 14-18M42 28c0 8-6 15-14 18"/>',
 '<circle cx="28" cy="28" r="19"/><circle cx="28" cy="28" r="23"/><path d="M28 1v4M28 51v4M1 28h4M51 28h4M9 9l3 3M44 44l3 3M9 47l3-3M44 12l3-3"/>'
];
export function qualityEmblem(value,options={}){
 const q=Number.isInteger(value)&&value>=0&&value<=2?value:0,name=QUALITIES[q].name,size=options.size==='large'?' quality-emblem-large':'',locked=options.reached===false?' quality-emblem-locked':'';
 return '<span class="quality-emblem quality-emblem-'+q+size+locked+'" aria-label="'+name+'品"><svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">'+paths[q]+'</svg><b>'+name+'</b></span>';
}
export function qualitySteps(current){return '<div class="promotion-quality-path" aria-label="品阶成长">'+QUALITIES.map((q,i)=>'<span class="promotion-quality-stage '+(i===current?'is-current':'')+'">'+qualityEmblem(i,{size:'large',reached:i<=current})+'<small>'+q.name+'品'+(i===current?' · 当前':'')+'</small></span>').join('<i aria-hidden="true">›</i>')+'</div>';}
export function promotionCorePanel(s,d,heroId,esc,btn){
 const q=promotionQuote(s,heroId),core=q.core;if(!core)return '';
 const owned=s.inventory[core.item]||0;
 return '<section class="promotion-core-card"><div><small>本人核心材料</small><b>'+esc(core.name)+'</b><span class="'+(owned>=core.required?'is-ready':'')+'">'+owned+' / '+core.required+'</span></div><p>'+core.special.map(id=>SPECIAL_DUNGEONS[id].name).join('、')+'可寻得；追踪后定向掉落，不要求本人上阵。</p><div class="promotion-core-actions">'+btn('核心材料来源',{type:'ui_sources',id:core.item,amount:core.required},'secondary')+btn('追踪本人升品',{type:'goalSet',kind:'promotion',id:heroId},'secondary',!!(s.battle||s.scheme||s.event))+'</div></section>';
}
