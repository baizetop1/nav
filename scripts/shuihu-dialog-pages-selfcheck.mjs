import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {sortieDialog} from '../public/game/js/sortie-ui.js';
import {rewardDialog} from '../public/game/js/rewards-ui.js';
import {esc} from '../public/game/js/ui.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const s=newGame(d,Date.now(),13);s.camp=freshCamp();s.camp.buildings.hall=5;s.camp.buildings.barracks=5;s.camp.food=1000;s.camp.troops=100;s.camp.deployment=100;s.camp.mode='army';s.team=['baisheng','ruanxiaoqi','shiqian'];for(const id of s.team)Object.assign(s.heroes[id],{status:'owned',level:25,exp:0});
const btn=(label,a,kind,disabled)=>'<button data-command="'+esc(JSON.stringify(a))+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>',a={type:'campRaid',id:'convoy'},before=JSON.stringify(s),q=prepareSortie(s,d,a);assert.equal(q.reason,'');
const html=sortieDialog(s,d,a,null,q,esc,btn);assert.equal(JSON.stringify(s),before);assert.equal((html.match(/role="tabpanel"/g)||[]).length,3);assert.match(html,/class="dialog-footer"/);assert.match(html,/id="sortie-panel-overview"[^>]*data-dialog-panel="overview" >/);assert.match(html,/id="sortie-panel-intel"[^>]*hidden/);for(const id of s.team)assert.ok(html.includes(d.by.heroes[id].name));for(const id of ['sortie-hero-0','sortie-hero-1','sortie-hero-2','sortie-mode','sortie-troops','sortie-tactic'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
const poor=structuredClone(s);poor.player.stamina=0;const bad=prepareSortie(poor,d,a);assert.ok(bad.reason);const invalid=sortieDialog(poor,d,a,null,bad,esc,btn);assert.ok(invalid.includes('id="sortie-feedback" role="status">'+esc(bad.reason)));assert.match(invalid,/ui_sortieConfirm[^>]+disabled/);
for(const n of [0,1,8,9,19]){const rows=Array.from({length:n},(_,i)=>({name:'奖励 '+i,amount:i+1})),receipt=rewardDialog(rows,esc,{battleSummary:{outcome:'victory',troops:100,wounded:2,fallen:1},review:'<p>已保存的复盘</p>'});assert.equal((receipt.match(/data-reward-sheet=/g)||[]).length,Math.max(1,Math.ceil(n/8)));assert.equal((receipt.match(/<article>/g)||[]).length,n);assert.match(receipt,/归营 <b>97/);assert.match(receipt,/id="receipt-panel-review"[^>]*hidden/);assert.ok(receipt.includes('data-reward-close'));for(const row of rows)assert.ok(receipt.includes(esc(row.name)));}
assert.ok(rewardDialog([{name:'<script>',amount:1}],esc).includes('&lt;script&gt;'));
console.log('Dialog pages PASS: immutable preview, three tabs, preserved controls, visible validation, eight-item pages, complete reward list, casualty counts and safe text.');
