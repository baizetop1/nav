import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fresh,completed,d,act} from './shuihu-opening-flow-selfcheck.mjs';
import {campShortcuts,campDashboard} from '../public/game/js/folio-ui.js';
import {afterBattleNext} from '../public/game/js/opening-ui.js';
import {dutyQuote} from '../public/game/js/camp-development.js';
import {storyObjective} from '../public/game/js/story-guide.js';
import {esc} from '../public/game/js/ui.js';
const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
fs.mkdirSync('artifacts/onboarding',{recursive:true});
const idle=p=>p.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
const snapshot=p=>p.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
const inFrame=el=>el.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);});
async function reach(page,el){const jump=page.locator('#main > .screen-pager input');if(await jump.count()){await jump.fill('1');await jump.press('Enter');}for(let i=0;i<25;i++){if(await inFrame(el))return;await page.locator('#main > .screen-pager [data-screen-next]').click();}throw Error('unreachable');}
async function clickCommand(page,type,id){const all=page.locator('button[data-command]'),index=await all.evaluateAll((els,{type,id})=>els.findIndex(e=>{const a=JSON.parse(e.dataset.command);return a.type===type&&(id===undefined||a.id===id)&&e.getBoundingClientRect().width>0;}),{type,id});assert.ok(index>=0,type);const button=all.nth(index);await reach(page,button);await button.click();await idle(page);}
// A recorded defeat must never send players back to a lesson they have mastered.
const defeat={context:{type:'camp',id:'woods'},outcome:'defeat',metrics:{reason:'team',heroes:{baisheng:{skills:0}}}};
const trained=structuredClone(completed);trained.lastBattle=defeat;
assert.equal(afterBattleNext(trained,defeat,d,null).command.id,'formation');
const partial=fresh();partial.lessons={version:1,completed:['heal']};assert.match(afterBattleNext(partial,defeat,d,null).title,/截住蓄势/);assert.doesNotMatch(afterBattleNext(partial,defeat,d,null).title,/及时照应/);
for(const initial of [fresh(),trained]){const before=JSON.stringify(initial),html=campDashboard(initial,d,esc,label=>label,'全部');assert.ok(html.indexOf('data-mainline')<html.indexOf('camp-support'));assert.equal(JSON.stringify(initial),before);}
try{for(const [width,height]of [[320,568],[360,640],[390,844],[1440,1000]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());
 const initial=fresh();initial.clock=Date.now();initial.lastRegen=initial.clock;await page.clock.setFixedTime(initial.clock);
 await context.addInitScript(raw=>{if(!localStorage.getItem('onboarding-check')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('onboarding-check','1');}},JSON.stringify(initial));
 await page.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');await page.locator('.camp-dashboard').waitFor();
 const main=page.locator('.folio-next[data-mainline]');assert.match(await main.innerText(),/主线|景阳冈/);await page.screenshot({path:'artifacts/onboarding/guide-'+width+'.png'});assert.ok(await inFrame(main.locator('button')),'main story must be on the first screen');assert.equal(await page.locator('.folio-shortcuts button').count(),3);
 await page.screenshot({path:'artifacts/onboarding/home-'+width+'.png'});
 const goal=storyObjective(initial,d);await main.locator('button').click();await idle(page);if(goal.map)assert.equal((await snapshot(page)).location,goal.map);assert.ok(await page.locator('.journey-scene,.story-guide').count());
 await page.locator('button[data-view=camp]').first().click();await idle(page);await clickCommand(page,'ui_section','duties');assert.match(await page.locator('.camp-duties').innerText(),/采集物资/);
 const before=await snapshot(page),quote=dutyQuote(before,'wood');await clickCommand(page,'campWork','wood');const after=await snapshot(page);assert.equal(after.player.stamina,before.player.stamina-5);assert.equal(after.camp.wood,before.camp.wood+quote.wood);assert.equal(after.camp.food,before.camp.food+quote.food);assert.equal(after.player.silver,before.player.silver+quote.silver);
 if(await page.locator('[data-reward-close]').count())await page.locator('[data-reward-close]').click();await page.reload();await page.locator('.camp-dashboard').waitFor();assert.equal((await snapshot(page)).camp.wood,after.camp.wood);
 await page.locator('button[data-view=menu]').first().click();if(await page.locator('[data-menu-group-tab=camp]').isVisible())await page.locator('[data-menu-group-tab=camp]').click();const gather=page.locator('#function-menu [data-menu-section=duties]');assert.ok(await inFrame(gather));await gather.click();await idle(page);assert.match(await page.locator('.camp-duties').innerText(),/采集物资/);assert.deepEqual(errors,[]);
 await context.close();console.log('Onboarding browser PASS',width,height,'first-screen main story, destination, fixed gathering, exact 5 stamina/rewards, persisted reload, menu');
 }
 // Existing camp saves retain the expanded shortcuts even before their first tiger fight.
 let veteran=fresh();veteran=act(veteran,'campBuild',{id:'hall'});assert.equal(campShortcuts(veteran).length,6);
 console.log('Onboarding PASS completed-lesson recommendation and existing-camp access');
}finally{await browser.close();}
