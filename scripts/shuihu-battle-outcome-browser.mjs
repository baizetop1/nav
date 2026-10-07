import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {terminal} from './shuihu-battle-outcome-selfcheck.mjs';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../artifacts/battle-outcome/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const snapshot=page=>page.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
async function setup(initial,width=390,height=844){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());
 initial.clock=Date.now();initial.lastRegen=initial.clock;await page.clock.setFixedTime(initial.clock);
 await context.addInitScript(raw=>{if(!localStorage.getItem('outcome-seeded')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('outcome-seeded','1');}},JSON.stringify(initial));
 await page.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');
 return {context,page,errors};
}
const idle=page=>page.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
async function fit(page){
 const dialog=page.locator('#battle-outcome[open]');await dialog.waitFor();
 assert.ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.height<=260&&e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'compact dialog fits');
 for(const button of await dialog.locator('button').all())assert.ok(await button.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),'both actions visible');
 assert.equal(await dialog.locator('.screen-pager').count(),0);
}
try{
 for(const [width,height] of [[320,568],[390,844],[1280,900],[568,320]])for(const outcome of ['victory','defeat','retreat']){
  const {context,page,errors}=await setup(terminal(outcome),width,height);await fit(page);
  await page.keyboard.press('Escape');await fit(page);
  await page.reload();await fit(page);
  await page.screenshot({path:fileURLToPath(new URL(`${outcome}-${width}.png`,out))});
  const before=await snapshot(page),expected=act(before,'finishBattle');
  await page.locator('[data-battle-receipt="skip"]').evaluate(e=>{e.click();e.click();});await idle(page);
  await page.waitForFunction(()=>!document.querySelector('#battle-outcome'));
  assert.equal(await page.locator('#reward-result[open]').count(),0,'quick action skips receipt');
  const after=await snapshot(page);assert.equal(after.battle,null);assert.deepEqual(after.inventory,expected.inventory);assert.equal(after.player.silver,expected.player.silver);
  await page.reload();await page.locator('#main').waitFor();assert.equal(await page.locator('#battle-outcome').count(),0);
  assert.deepEqual((await snapshot(page)).inventory,after.inventory);assert.deepEqual(errors,[]);
  console.log(`Outcome browser PASS ${outcome} ${width}x${height}: automatic modal, visible actions, reload and single settlement.`);await context.close();
 }
 for(const outcome of ['victory','defeat']){
  const {context,page,errors}=await setup(terminal(outcome));await fit(page);
  await page.locator('[data-battle-receipt="review"]').click();await idle(page);
  const receipt=page.locator('#reward-result[open]');await receipt.waitFor();assert.equal(await receipt.locator('[data-dialog-tab="review"]').getAttribute('aria-selected'),'true');
  assert.equal((await snapshot(page)).battle,null);await receipt.locator('[data-dialog-tab="rewards"]').click();await receipt.locator('[data-reward-close]').click();
  assert.equal(await page.locator('#battle-outcome').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 // Exercise the actual battle timer, rather than only loading a completed battle.
 {
  const {context,page,errors}=await setup(act(fixture(532,30),'campRaid',{id:'woods'}));
  await page.locator('button[data-command*="ui_battle"]').first().waitFor({state:'attached'});
  const resume=page.getByRole('button',{name:'继续交战',exact:true});await resume.click();
  await page.locator('#battle-outcome[open]').waitFor({timeout:30000});await fit(page);assert.deepEqual(errors,[]);await context.close();
 }
 // A failed disk write must show the existing unsaved-progress warning.
 {
  const {context,page,errors}=await setup(terminal());await fit(page);
  await page.evaluate(async()=>{const {SlotStore}=await import('./js/slots.js?v=0.68.0');SlotStore.prototype.write=async()=>{throw Error('test storage full');};});
  await page.locator('[data-battle-receipt="skip"]').click();await idle(page);
  await page.locator('#reward-result[open]').waitFor();assert.match(await page.locator('#reward-result').innerText(),/本机暂未保存/);
  assert.ok((await snapshot(page)).battle?.outcome,'saved terminal battle remains recoverable');assert.deepEqual(errors,[]);await context.close();
 }
 // A conflicting tab keeps the saved result untouched and permits recovery.
 {
  const {context,page,errors}=await setup(terminal());await fit(page);const before=await snapshot(page);
  await page.evaluate(async()=>{const {SlotStore}=await import('./js/slots.js?v=0.68.0');const {SaveConflict}=await import('./js/save.js?v=0.68.0');SlotStore.prototype.write=async()=>{throw new SaveConflict('test conflicting tab');};});
  await page.locator('[data-battle-receipt="skip"]').click();await idle(page);
  assert.equal(await page.locator('#battle-outcome[open],#reward-result[open]').count(),0);
  assert.deepEqual((await snapshot(page)).inventory,before.inventory);assert.ok((await snapshot(page)).battle?.outcome);
  assert.match(await page.locator('body').innerText(),/test conflicting tab/);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Outcome browser PASS: optional review, live battle timer, failed-save warning and conflict recovery.');
}catch(e){for(const context of browser.contexts())for(const p of context.pages()){await p.screenshot({path:fileURLToPath(new URL('failure.png',out))});console.error((await p.locator('body').innerText()).slice(-4500));}throw e;}finally{await browser.close();}
