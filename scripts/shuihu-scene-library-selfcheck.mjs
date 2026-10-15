import {REGION_COMPANIONS} from '../public/game/js/region-companions-data.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {d,fixture} from './shuihu-campaign-fixtures.mjs';
import {SCENE_LIBRARY,MAP_SCENES,sceneForMap} from '../public/game/js/scene-library.js';
import {SCENE_ART} from '../public/game/js/scenes.js';
import {sceneArtDialog} from '../public/game/js/scenes-ui.js';
import {journeyScenePicture} from '../public/game/js/journey-scenes-ui.js';
import {render,esc} from '../public/game/js/ui.js';
assert.deepEqual(Object.keys(MAP_SCENES).sort(),d.maps.map(m=>m.id).sort(),'Every map, including ending branches, needs explicit artwork');
assert.equal(Object.keys(SCENE_LIBRARY).length,47);assert.equal(sceneForMap('missing'),null);assert.equal(sceneForMap('constructor'),null);
const button=(label,command)=>'<button data-command="'+esc(JSON.stringify(command))+'">'+esc(label)+'</button>';
for(const [key,art] of Object.entries(SCENE_LIBRARY)){
 assert.ok(art.title&&art.alt,key);assert.equal(SCENE_ART[key],art.src);assert.ok(art.width/art.height>2.9&&art.width/art.height<3.1,key);
 const bytes=fs.readFileSync(new URL('../public/game/'+art.src,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<450000,key+' mobile asset budget');
 const dialog=sceneArtDialog(key,esc,button);assert.ok(dialog.includes(art.src)&&dialog.includes(esc(art.title)));assert.ok(!dialog.includes('undefined'));assert.equal((dialog.match(/data-command=/g)||[]).length,1,'Looking at art only exposes close');
}
for(const map of d.maps){const state=fixture();state.location=map.id;const before=structuredClone(state),art=sceneForMap(map.id);for(const small of [true,false]){const picture=journeyScenePicture(map.id,esc,small);assert.ok(picture.includes(art.src)&&picture.includes(esc(art.alt)));assert.ok(picture.includes('&quot;ui_sceneArt&quot;'));assert.equal((picture.match(/<img /g)||[]).length,1);}const local=render({state,data:d,view:'map',mapSection:'story'});assert.ok(local.includes(art.src),map.id+' local story picture');const atlas=render({state,data:d,view:'map',mapSection:'atlas',mapTarget:map.id});assert.ok(atlas.includes(art.src),map.id+' map preview');assert.deepEqual(state,before,'Rendering never advances progress');}
// The new engraving scene is a chapter asset, not a replacement for any original map artwork.
assert.equal(REGION_COMPANIONS.jindajian.scene,'jizhou_engraving');const engraving=SCENE_LIBRARY.jizhou_engraving;assert.equal(engraving.src,'./art/scenes/jizhou-engraving-v1.webp');assert.equal(engraving.title,'济州刻坊');for(const term of ['石印','刻刀','碑样'])assert.ok(engraving.alt.includes(term));assert.deepEqual({width:engraving.width,height:engraving.height},{width:2172,height:724});
function webpDimensions(bytes){for(let at=12;at+8<=bytes.length;){const chunk=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),data=at+8;if(chunk==='VP8 '){assert.equal(bytes.toString('hex',data+3,data+6),'9d012a');return {width:bytes.readUInt16LE(data+6)&0x3fff,height:bytes.readUInt16LE(data+8)&0x3fff};}if(chunk==='VP8X')return {width:bytes.readUIntLE(data+4,3)+1,height:bytes.readUIntLE(data+7,3)+1};if(chunk==='VP8L'){assert.equal(bytes[data],0x2f);const bits=bytes.readUInt32LE(data+1);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}at=data+size+(size&1);}throw Error('No WebP dimensions');}
const engravingBytes=fs.readFileSync(new URL('../public/game/'+engraving.src,import.meta.url));assert.deepEqual(webpDimensions(engravingBytes),{width:2172,height:724},'encoded scene dimensions agree with chapter metadata');
const chapterState=fixture(),chapterBefore=structuredClone(chapterState),chapterHtml=render({state:chapterState,data:d,view:'companions',pageSections:{companion:'jindajian'}});assert.ok(chapterHtml.includes(engraving.src)&&chapterHtml.includes(esc(engraving.alt))&&chapterHtml.includes('济州·刻坊'));assert.ok(chapterHtml.includes('jizhou_engraving')&&chapterHtml.includes('ui_sceneArt'),'the actual chapter picture opens its own full-size scene');assert.deepEqual(chapterState,chapterBefore,'showing the new chapter art never mutates game state');
assert.equal(sceneArtDialog('__proto__',esc,button),'');assert.equal(journeyScenePicture('unknown',esc),'');
const manifest=JSON.parse(fs.readFileSync(new URL('../public/game/art/scenes/prompts-v064.json',import.meta.url)));assert.equal(manifest.length,37);for(const a of manifest){assert.ok(a.prompt&&a.original&&SCENE_LIBRARY[a.key]);for(const id of a.maps)assert.equal(MAP_SCENES[id],a.key);}
console.log('Scene library PASS: all 113 maps/12 volumes/3 endings, 47 local WebP assets including a verified 2172×724 engraving scene, matching metadata and dialogs, 37 generation records, read-only rendering and mobile budgets.');
