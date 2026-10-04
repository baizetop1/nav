import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture,d,act} from './shuihu-campaign-fixtures.mjs';
import {completeLateRoute} from './shuihu-late-mainline-selfcheck.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {finishSpecial} from '../public/game/js/special-dungeons.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out=new URL('../artifacts/endgame/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const completed=completeLateRoute().s;
try{for(const [width,height] of [[320,568],[390,844],[1280,900]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());
 const initial=act(structuredClone(completed),'realmOpen');initial.clock=Date.now();initial.lastRegen=initial.clock;initial.player.silver=10000;initial.expansion??={version:1,recipes:[],personal:{},combos:{},run:null,diplomacy:{},coopClaims:{}};initial.expansion.personal.linchong=true;initial.specialDungeons={version:1,clears:{mine_1:5,marsh_1:5,ruins_1:5},last:{id:'ruins',tier:1,outcome:'victory',at:initial.clock,drops:[]}};
 let pending=act(initial,'specialStart',{id:'minechief',tier:1});for(let i=0;i<180&&!pending.battle.outcome;i++)advanceBattle(pending,d,1000);assert.equal(pending.battle.outcome,'victory');let seed=1;for(;seed<10000;seed++){const test=structuredClone(pending);test.rng=seed;finishSpecial(test,d,test.battle);if(test.equipment.length>pending.equipment.length)break;}assert.ok(seed<10000);pending.rng=seed;

 await page.clock.setFixedTime(initial.clock);
 await context.addInitScript(raw=>{if(!localStorage.getItem('forge-expansion-test')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('supply-categories-test','1');}},JSON.stringify(pending));
 await page.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');await page.locator('button[data-view="camp"]').first().waitFor();
 const idle=()=>page.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
 const reach=async el=>{await el.waitFor({state:'attached'});const host=await el.evaluate(e=>e.closest('dialog')?'dialog[open] .dialog-body':'#main'),pager=page.locator(host+' > .screen-pager'),jump=pager.locator('input');if(await jump.count()){await jump.fill('1');await jump.press('Enter');}for(let i=0;i<65;i++){if(await el.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return r.width>0&&r.height>0&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);}))return;const next=pager.locator('[data-screen-next]');if(!await next.count()||await next.isDisabled())break;await next.click();}throw Error('unreachable '+await el.textContent());};
 const cmd=async(type,extra={})=>{const index=await page.locator('button[data-command]').evaluateAll((els,{type,extra})=>els.findIndex(e=>{const c=JSON.parse(e.dataset.command);return (!document.querySelector('dialog[open]')||!!e.closest('dialog[open]'))&&e.getBoundingClientRect().width&&c.type===type&&Object.entries(extra).every(([k,v])=>c[k]===v);}),{type,extra});assert.ok(index>=0,type+' '+JSON.stringify(extra));const el=page.locator('button[data-command]').nth(index);await reach(el);await el.click();await idle();};
 const closeReward=async()=>{const close=page.locator('dialog#reward-result[open] [data-reward-close]');if(await close.count()){await reach(close);await close.click();await idle();}};
 const section=async(view,id)=>{await closeReward();let nav=page.locator('button[data-view="'+view+'"]:visible').first();if(!await nav.count()){await page.locator('button[data-view="menu"]:visible').first().click();const group=await page.locator('#function-menu [data-view="'+view+'"]').first().evaluate(e=>e.closest('[data-menu-group]').dataset.menuGroup);const tab=page.locator('[data-menu-group-tab="'+group+'"]');if(await tab.isVisible())await tab.click();nav=page.locator('#function-menu button[data-view="'+view+'"]:visible').first();}await reach(nav);await nav.click();const select=page.locator('select[data-section-view="'+view+'"]:visible').first();if(await select.count()){await reach(select);await select.selectOption(id);}else await cmd('ui_section',{view,id});await idle();};
 const snapshot=()=>page.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
 const fit=async()=>{assert.ok(await page.locator('#main').evaluate(e=>(innerWidth>900||e.scrollHeight<=e.clientHeight+1)&&e.scrollWidth<=e.clientWidth+1),'main overflow');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'viewport overflow');const modal=page.locator('dialog[open]');if(await modal.count())assert.ok(await modal.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'dialog overflow');assert.deepEqual(errors,[]);};
 const search=async query=>{const input=page.locator('#inventory-query');await reach(input);await input.fill(query);await cmd('ui_inventoryFilter');};
 const shot=async name=>page.screenshot({path:fileURLToPath(new URL(name+'-'+width+'.png',out))});


 await cmd('finishBattle');await fit();await page.locator('#reward-result [data-dialog-tab="loot"]').click();await fit();await shot('loot');
 const compare=page.locator('[data-reward-action*="ui_lootCompare"]');await reach(compare);await compare.click();await idle();assert.match(await page.locator('.equipment-comparison').innerText(),/守炉重锤/);await fit();await shot('compare');await cmd('ui_compareClose');const equip=(await snapshot()).equipment.find(e=>e.item==='furnace_hammer');await cmd('equipLock',{id:equip.uid,locked:true});assert.equal((await snapshot()).equipment.find(e=>e.uid===equip.uid).locked,true);
 await section('trials','special');await cmd('ui_specialView',{id:'minechief'});assert.match(await page.locator('[data-page-section="trials:special"]').innerText(),/炉底密窟/);await fit();await shot('hidden');
 await cmd('ui_specialView',{id:'minechief',tab:'drops'});await fit();
 await section('trials','replays');const picker=page.locator('#replay-mission');await reach(picker);await picker.selectOption('v12_sea_first');assert.match(await page.locator('[data-page-section="trials:replays"]').innerText(),/另外的去路/);await fit();await shot('replay');
 await cmd('replayStart',{id:'v12_sea_first',tier:1});assert.equal(await page.locator('#sortie-preview[open]').count(),1);assert.match(await page.locator('#sortie-preview').innerText(),/回顾不耗体力/);await fit();await shot('replay-prep');await cmd('ui_sortieCancel');
 await section('heroes','tasks');const hero=page.locator('#section-hero');await reach(hero);await hero.selectOption('linchong');
 await cmd('personalStyle',{id:'linchong',style:'guard'});assert.equal((await snapshot()).expansion.styles.linchong,'guard');await fit();await shot('style');
 const saved=await snapshot();await page.reload();await page.locator('button[data-view="camp"]').first().waitFor();const loaded=await snapshot();assert.deepEqual(loaded.expansion.styles,saved.expansion.styles);assert.equal(loaded.equipment.find(e=>e.uid===equip.uid).locked,true);assert.deepEqual(errors,[]);
 console.log('Endgame browser PASS '+width+'x'+height+': actual exclusive drop, compare, lock, hidden-area navigation, alternate-ending selection, replay preparation, style choice and reload, no overflow.');await context.close();

}}finally{await browser.close();}
