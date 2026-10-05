import fs from 'node:fs';
import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {battleOutcomeDialog} from '../public/game/js/battle-outcome-ui.js';
import {rewardDialog} from '../public/game/js/rewards-ui.js';
export function terminal(outcome='victory'){
 let base=fixture(531,outcome==='defeat'?1:30);if(outcome==='defeat')base.team=['baisheng'];
 let s=act(base,'campRaid',{id:outcome==='defeat'?'fort':'woods'});
 if(outcome==='retreat')return act(s,'battleRetreat');
 for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);
 assert.equal(s.battle.outcome,outcome);return s;
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const outcome of ['victory','defeat','retreat']){
 const s=terminal(outcome),original=structuredClone(s),html=battleOutcomeDialog(s.battle,esc);
 assert.equal((html.match(/data-command=/g)||[]).length,2);
 assert.ok(html.includes(outcome==='victory'?'战斗胜利':outcome==='defeat'?'战斗失败':'已撤出战斗'));
 assert.deepEqual(s,original,'presentation must not settle or roll rewards');
 const next=act(s,'finishBattle');assert.equal(next.battle,null);assert.throws(()=>act(next,'finishBattle'));
}
assert.equal(battleOutcomeDialog(null,esc),'');assert.equal(battleOutcomeDialog({outcome:null},esc),'');
const review=rewardDialog([],esc,{review:'review-content',initialTab:'review'});
assert.match(review,/data-dialog-tab="review"/);assert.match(review,/aria-selected="true" data-dialog-tab="review"/);
assert.match(review,/data-dialog-panel="rewards" hidden/);assert.match(review,/data-dialog-panel="review" >review-content/);
assert.ok(rewardDialog([],esc,{initialTab:'review'}).includes('本次没有新增物品'));
console.log('Battle outcome PASS: victory/defeat/retreat, read-only presentation, one settlement, review default/fallback.');
