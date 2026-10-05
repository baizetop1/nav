import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {advanceBattle} from '../public/game/js/battle.js';
import {completionFixtures} from './shuihu-completion-fixtures.mjs';import {fixture,act,d,win} from './shuihu-campaign-fixtures.mjs';import {pendingCompletion} from '../public/game/js/completion-ui.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out=new URL('../artifacts/completion/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const snapshot=page=>page.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
const idle=page=>page.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
async function setup(initial,width,height){const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());initial=structuredClone(initial);initial.clock=Date.now();initial.lastRegen=initial.clock;await page.clock.setFixedTime(initial.clock);await context.addInitScript(raw=>{if(!localStorage.getItem('completion-seeded')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('completion-seeded','1');}},JSON.stringify(initial));await page.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');await page.locator('button[data-view="camp"]').first().waitFor({state:'attached'});return {context,page,errors};}
async function fit(page,selector='#activity-outcome[open]'){const dialog=page.locator(selector);await dialog.waitFor();assert.ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height<=260&&e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'small prompt fits');for(const b of await dialog.locator('button').all())assert.ok(await b.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}));assert.equal(await page.locator('dialog[open]').count(),1,'one modal at a time');}
try{
 const fixtures=completionFixtures();
 for(const [width,height] of [[320,568],[1280,900]])for(const [name,initial]of Object.entries(fixtures))for(const details of [false,true]){
  const {context,page,errors}=await setup(initial,width,height);await fit(page);await page.reload();await fit(page);
  const before=await snapshot(page),q=pendingCompletion(before),expected=act(before,q.command.type);
  const button=page.locator('#activity-outcome button').nth(details?1:0);await button.evaluate(e=>{e.click();e.click();});await idle(page);
  if(details){await page.locator('#reward-result[open]').waitFor();assert.equal(await page.locator('dialog[open]').count(),1);if(['schemeSuccess','schemeFailure','squad'].includes(name))assert.equal(await page.locator('[data-dialog-tab="review"]').getAttribute('aria-selected'),'true');await page.locator('[data-reward-close]').click();}
  else assert.equal(await page.locator('#reward-result[open]').count(),0,'quick choice bypasses receipt');
  const after=await snapshot(page);assert.deepEqual(after.inventory,expected.inventory);assert.equal(after.player.silver,expected.player.silver);assert.equal(after.camp.fallen,expected.camp.fallen);assert.equal(pendingCompletion(after),null);
  await page.reload();await page.locator('#main').waitFor();assert.equal(await page.locator('#activity-outcome').count(),0);assert.deepEqual((await snapshot(page)).inventory,after.inventory);assert.deepEqual(errors,[]);
  console.log(`Completion browser PASS ${name} ${width} details=${details}`);await context.close();
 }
 // Settling the last real fight must reveal the route completion, never stack dialogs.
 for(const details of [false,true]){
  let initial=act(fixture(),'trekStart');for(let i=0;i<4;i++)initial=win(act(initial,'trekNode',{kind:'fight'}));initial=act(initial,'trekNode',{kind:'boss'});for(let n=0;n<180&&!initial.battle.outcome;n++)advanceBattle(initial,d,1000);assert.equal(initial.battle.outcome,'victory');
  const {context,page,errors}=await setup(initial,320,568);await page.locator('#battle-outcome[open]').waitFor();await page.locator('#battle-outcome button').nth(details?1:0).click();await idle(page);
  if(details){await page.locator('#reward-result[open]').waitFor();assert.equal(await page.locator('dialog[open]').count(),1);await page.locator('[data-reward-close]').click();}
  await fit(page);assert.match(await page.locator('#activity-outcome').innerText(),/远征完成/);await page.locator('#activity-outcome button').first().click();await idle(page);assert.equal((await snapshot(page)).realm.trek,null);assert.deepEqual(errors,[]);await context.close();
 }
 // Two ready jobs are presented in order, including when the first receipt is open.
 {
  const initial=structuredClone(fixtures.affair);initial.realm.squad=structuredClone(fixtures.squad.realm.squad);initial.realm.squad.team=['tanglong'];
  const {context,page,errors}=await setup(initial,320,568);await fit(page);assert.match(await page.locator('#activity-outcome').innerText(),/分队归来/);
  await page.locator('#activity-outcome button').nth(1).click();await idle(page);await page.locator('#reward-result[open]').waitFor();assert.equal(await page.locator('dialog[open]').count(),1);
  await page.locator('[data-reward-close]').click();await fit(page);assert.match(await page.locator('#activity-outcome').innerText(),/外派归来/);await page.locator('#activity-outcome button').first().click();await idle(page);assert.equal(pendingCompletion(await snapshot(page)),null);assert.deepEqual(errors,[]);await context.close();
 }
 // Ordinary claimed rewards open a compact saved receipt; details do not run the action again.
 {
  const {context,page,errors}=await setup(fixture(),320,568);await page.locator('#main').waitFor();
  const command=JSON.stringify({type:'campClaim',id:'foundation'});
  // Reach the existing camp-goal action via the camp section navigation.
  await page.getByRole('button',{name:'领取酬劳',exact:true}).waitFor();
  const claim=page.locator('button[data-command]').filter({hasText:'领取建寨酬劳'}).first();
  const found=await page.locator('button[data-command]').evaluateAll((els,c)=>{const el=els.find(e=>e.dataset.command===c);if(!el)return false;el.click();return true;},command);assert.ok(found,'existing claim button');await idle(page);
  await fit(page,'#reward-result.outcome-dialog[open]');const claimed=await snapshot(page);assert.ok(claimed.progress.flags.camp_goal_foundation);
  await page.screenshot({path:fileURLToPath(new URL('compact-receipt-320.png',out))});await page.locator('[data-receipt-details]').click();await page.locator('#reward-result:not(.outcome-dialog)[open]').waitFor();await page.locator('[data-reward-close]').click();assert.deepEqual((await snapshot(page)).inventory,claimed.inventory);assert.equal((await snapshot(page)).player.silver,claimed.player.silver);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Completion browser PASS: all outcomes, reload/double-click, serial prompts, compact receipt and read-only details.');
}catch(e){for(const context of browser.contexts())for(const p of context.pages()){await p.screenshot({path:fileURLToPath(new URL('failure.png',out))});console.error((await p.locator('body').innerText()).slice(-3500));}throw e;}finally{await browser.close();}
