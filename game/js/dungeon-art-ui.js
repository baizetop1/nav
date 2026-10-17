import {SCENE_LIBRARY,MAP_SCENES} from './scene-library.js?v=0.91.0';

// Scene illustrations are shared with the journey pages. Mine/furnace and shrine/vault
// deliberately use the relevant workshop/shrine exterior until dedicated interiors exist.
export const DUNGEON_ART=Object.freeze({
 resource:Object.freeze({silver:'country_road',grain:'granary',timber:'timberyard',herbs:'herb_slope'}),
 daily:Object.freeze({ore:'workshop',manual:'drill_yard',stable:'stableyard'}),
 weekly:Object.freeze({siege:'stockade',convoy:'country_road',tide:'harbor',fortress:'field_camp'}),
 elite:Object.freeze({siege:'inner_court',convoy:'granary',tide:'reed_watch'}),
 story:Object.freeze({jingyanggang:'ridge',huangnigang:'huangni',yezhulin:'boar_wood',shanshenmiao:'snow_temple',zhujiazhuang:'stockade',chai_escort:'manor',qingzhou_patrol:'country_road',spirit_trial:'drill_yard',immortal_trial:'council'}),
 special:Object.freeze({mine:'workshop',minechief:'workshop',marsh:'reed_watch',marshnest:'shipyard',ruins:'ruined_shrine',ruinsvault:'ruined_shrine',forest:'country_road',forestcamp:'field_camp',water:'harbor',waterfort:'stockade',mountain:'mountain_pass',mountainhold:'field_camp',xunyangship:'shipyard',jizhouyard:'jizhou_engraving',nanshanstock:'stockade'})
});
const terrainScenes=Object.freeze({water:'harbor',mountain:'mountain_pass',forest:'boar_wood',land:'country_road'});
const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dungeonScene(kind,id,{map,terrain}={}){
 const explicit=DUNGEON_ART[kind]?.[id],mapped=MAP_SCENES[map],key=explicit||mapped||terrainScenes[terrain]||'field_camp';
 return {key,...SCENE_LIBRARY[key],related:!explicit&&!mapped||kind==='special'&&['mine','minechief','ruinsvault'].includes(id)};
}
export function dungeonArt(kind,id,options={}){
 const art=dungeonScene(kind,id,options);
 return '<img class="dungeon-thumb" data-dungeon-art="'+safe(kind+':'+id)+'" data-scene="'+art.key+'" src="'+safe(art.src)+'" alt="" width="76" height="38" loading="lazy" decoding="async">';
}
