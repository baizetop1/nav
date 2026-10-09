import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fresh,d} from './shuihu-opening-flow-selfcheck.mjs';
import {guideEnabled,guideKey,guidance} from '../public/game/js/onboarding.js';
const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
fs.mkdirSync('artifacts/guidance',{recursive:true});
const idle=p=>p.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
const snapshot=p=>p.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
async function setup(s,width,height){const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());s=structuredClone(s);s.clock=Date.now();s.lastRegen=s.clock;await page.clock.setFixedTime(s.clock);await context.addInitScript(raw=>{if(!localStorage.getItem('guidance-test')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','2');localStorage.setItem('guidance-test','1');}},JSON.stringify(s));await page.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');await page.locator('.camp-dashboard').waitFor();return {context,page,errors};}
async function located(page){await page.locator('[data-guide-locate]').click();await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-guide-target'));const target=page.locator('[data-guide-target]:focus');assert.ok(await target.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);}),'located target fits viewport');return target;}
try{
 for(const [width,height]of [[320,568],[390,844],[1440,1000]]){
  const {context,page,errors}=await setup(fresh(),width,height);let checkedReload=false,actions=[];
  for(let n=0;n<35;n++){
   const s=await snapshot(page);if(s.progress.flags.tiger_complete)break;
   if(s.battle){
    if(!s.battle.outcome&&s.battleSkillMode==='manual'){await (await located(page)).click();await idle(page);continue;}
    if(s.battle.outcome){await page.locator('#battle-outcome [data-battle-receipt=skip]').click();await idle(page);continue;}
    if((await page.locator('.battle-state').innerText()).includes('暂停')){await (await located(page)).click();await idle(page);if((await page.locator('.battle-state').innerText()).includes('暂停'))continue;}
    await page.locator('#battle-outcome[open]').waitFor({timeout:90000});await page.locator('#battle-outcome [data-battle-receipt=skip]').click();await idle(page);continue;
   }
   if(await page.locator('#sortie-preview[open]').count()){const button=page.locator('#sortie-preview button[data-command]').filter({hasText:'确认配置并出征'});await button.click();await idle(page);continue;}
   if(await page.locator('[data-reward-close]').count()){await page.locator('[data-reward-close]').click();continue;}
   if(s.progress.flags.tracks_found&&!checkedReload){await page.reload();await page.locator('.camp-dashboard').waitFor();assert.ok((await snapshot(page)).progress.flags.tracks_found);checkedReload=true;}
   const before=await snapshot(page),button=await located(page);assert.deepEqual(await snapshot(page),before,'locating is read only');actions.push(JSON.parse(await button.getAttribute('data-command')));await button.click();await idle(page);
   await page.screenshot({path:'artifacts/guidance/step-'+width+'-'+n+'.png'});
  }
  const done=await snapshot(page);assert.equal(done.progress.flags.tiger_complete,true,'guided actions finish first story');assert.ok(checkedReload);assert.ok(actions.some(a=>a.type==='mapAction'&&a.id==='tracks'));assert.ok(actions.some(a=>a.type==='mapAction'&&a.id==='follow'));assert.equal(done.inventory.wusong_token,1);
  if(await page.locator('[data-reward-close]').count())await page.locator('[data-reward-close]').click();
  await page.locator('button[data-view=camp]').first().click();await idle(page);const before=await snapshot(page);await page.locator('[data-guide-toggle]').click();assert.equal(await page.locator('[data-guide-step]').count(),0);await page.reload();await page.locator('.camp-dashboard').waitFor();assert.equal(await page.locator('[data-guide-step]').count(),0);assert.equal(await page.locator('[data-guide-target]').count(),0);assert.deepEqual(await snapshot(page),before);await page.locator('[data-guide-toggle]').click();assert.equal(await page.locator('[data-guide-step=home]').count(),1);assert.deepEqual(errors,[]);await context.close();console.log('Guidance PASS',width,height,'real mainline actions, locate/read-only, footprints reload, combat/settlement/next story, collapse/re-enable');
 }
 const old=fresh();old.heroes.baisheng.level=20;assert.equal(guideEnabled(old,null),false);assert.notEqual(guideKey(old,1),guideKey(old,2));const {context,page,errors}=await setup(old,390,844);assert.equal(await page.locator('[data-guide-step]').count(),0);const before=await snapshot(page);await page.locator('[data-guide-toggle]').click();await located(page);assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);await context.close();console.log('Guidance PASS old saves opt in without progress reset, preference isolated by save');
}finally{await browser.close();}
