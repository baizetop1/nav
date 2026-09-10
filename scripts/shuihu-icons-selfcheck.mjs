import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {icon,actionIcon} from '../public/game/js/icons.js';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
const state=newGame(data,Date.now(),12345),tabs={map:'江湖',heroes:'好汉',bag:'行囊',recruit:'招贤',quests:'差事',chronicle:'梁山志',save:'存档'};
for(const name of [...Object.keys(tabs),'forge','battle','shield','scheme','event','move','back','search','clock','energy','coins','medal','ticket','medicine','craft','gift','download','upload','restore','check','close','trash']){
  const svg=icon(name);assert.ok(svg.startsWith('<svg '));assert.ok(svg.endsWith('</svg>'));assert.ok(svg.includes('data-icon="'+name+'"'));
  for(const attr of ['aria-hidden="true"','focusable="false"','viewBox="0 0 24 24"','stroke="currentColor"'])assert.ok(svg.includes(attr));
  assert.ok(!/<(?:script|image|foreignObject)\b|\b(?:href|on\w+)=/.test(svg),'Only local decorative geometry');
}
for(const bad of [null,undefined,{},'missing','constructor','__proto__','"><script>alert(1)</script>'])assert.equal(icon(bad),'');
assert.equal(actionIcon({type:'unknown'}),'');assert.equal(actionIcon({type:'constructor'}),'');assert.equal(actionIcon({type:'turn',id:'constructor'}),'');
for(const [command,name] of [[{type:'recruit'},'recruit'],[{type:'ui_export'},'download'],[{type:'ui_import'},'upload'],[{type:'turn',id:'attack'},'battle'],[{type:'turn',id:'guard'},'shield'],[{type:'turn',id:'retreat'},'back']])assert.equal(actionIcon(command),name);
for(const view of [...Object.keys(tabs),'forge']){
  const html=render({state,data,view,status:'已保存到本机'}),nav=html.match(/<nav class="tabs"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<svg /g)||[]).length,7);assert.ok(!nav.includes('tab-no'));
  for(const [id,label] of Object.entries(tabs))assert.ok(nav.includes('data-icon="'+id+'"')&&nav.includes('<span>'+label+'</span>'));
  const heading=html.match(/<h1 class="page-title">[\s\S]*?<\/h1>/)[0];assert.ok(heading.includes('data-icon="'+view+'"'));
  for(const match of html.matchAll(/<button\b[^>]*data-command="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)){
    const cmd=JSON.parse(match[1].replaceAll('&quot;','"')),storyDoor=match[0].includes('class="story-door"');
    const expected=storyDoor?{tavern:'event',office:'quests',gate:'map'}[cmd.id]:actionIcon(cmd);
    if(storyDoor){assert.equal(cmd.type,'move');assert.ok(expected,'Story exits keep their specific local icons');}
    if(expected)assert.ok(match[2].includes('data-icon="'+expected+'"'));
    assert.ok(match[2].includes('<span>'),'Text labels stay present');
  }
}
console.log('Shuihu icons: local SVG allowlist, decorative accessibility, seven labelled tabs, page headings, action mapping, safe unknowns and unchanged command payloads passed.');
