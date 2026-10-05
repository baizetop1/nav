import assert from 'node:assert/strict';
import {fixture,d,act,win} from './shuihu-campaign-fixtures.mjs';
import {campScene,woodlandReport,sceneReturn,SCENE_ART} from '../public/game/js/scenes.js';
import {scenePage} from '../public/game/js/scenes-ui.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import fs from 'node:fs';
let s=fixture(60,20);const before=structuredClone(s);
for(const place of ['gate','woods'])for(const topic of ['arrival','road','camp','tracks']){const m=campScene(s,{place,topic});assert.ok(m.text);assert.ok(Object.values(SCENE_ART).includes(m.art));}assert.deepEqual(s,before);
assert.equal(campScene(s).repaired,true);const low=structuredClone(s);low.camp.buildings.hall=1;low.camp.buildings.lumber=0;assert.equal(campScene(low).art,SCENE_ART.gate);
const away=structuredClone(s);away.affairs={mission:{hero:'baisheng'}};assert.notEqual(campScene(away).person,'baisheng');assert.equal(campScene(s,{place:'woods'}).person,null);
const q=prepareSortie(s,d,{type:'campRaid',id:'woods'});assert.equal(q.reason,'');assert.deepEqual(s,before);assert.equal(q.cost.food,campScene(s,{place:'woods'}).food);assert.equal(q.cost.stamina,8);
s=act(s,'campRaid',{id:'woods'});assert.match(campScene(s).reason,/结束/);s=win(s);assert.equal(woodlandReport(s).outcome,'victory');assert.match(campScene(s).text,/卸下|安顿|阵亡/);assert.equal(sceneReturn(s.lastBattle).command.type,'ui_scene');assert.deepEqual(importSave(exportSave(s,{id:1,name:'寨门'},d),d).state,s);
s=act(s,'campRaid',{id:'woods'});s=act(s,'battleRetreat');s=act(s,'finishBattle');assert.match(campScene(s).text,/回来了|伤兵/);assert.equal(campScene(s,{place:'woods',topic:'tracks'}).topic,'tracks');assert.deepEqual(gameSnapshot(s,d),s);
const injured=structuredClone(s);injured.camp.wounded=3;assert.match(campScene(injured).text,/3 个伤兵/);assert.equal(sceneReturn({context:{type:'special',id:'mine'}}),null);
const poor=structuredClone(s);poor.player.stamina=0;assert.match(campScene(poor,{place:'woods'}).reason,/体力/);
for(const path of Object.values(SCENE_ART)){const p=new URL('../public/game/'+path,import.meta.url);assert.ok(fs.statSync(p).size<450000);}
const esc=x=>String(x).replaceAll('<','&lt;'),html=scenePage(s,d,esc,()=>'',()=>'',{place:'gate'});assert.ok(html.includes('scene-visit'));assert.ok(!html.includes('undefined'));
console.log('Scenes PASS: read-only dialogue, owned/present NPCs, building variants, actual sortie costs, victory/retreat responses, return routing, save roundtrip and local optimized assets.');
