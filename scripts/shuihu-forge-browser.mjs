import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture,d} from './shuihu-campaign-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out=new URL('../artifacts/forge/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
try{for(const [width,height] of [[320,568],[390,844],[1280,900]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('https://save.baizeone.top/**',r=>r.abort());
 const initial=fixture(163,30);initial.clock=Date.now();initial.lastRegen=initial.clock;initial.player.silver=10000;initial.inventory.scrap_iron=30;initial.inventory.tiger_bone=2;initial.inventory.tempered_steel=30;initial.inventory.wood=30;initial.inventory.iron=30;initial.inventory.dark_iron=0;initial.inventory.blueprint=0;
 await page.clock.setFixedTime(initial.clock);
 await context.addInitScript(raw=>{if(!localStorage.getItem('forge-expansion-test')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('supply-categories-test','1');}},JSON.stringify(initial));
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

 await section('forge','craft');await fit();await shot('catalog');
 const card=page.locator('[data-forge-model="bastion_spear"]');const details=card.locator('summary');await reach(details);await details.click();
 await cmd('ui_recipeSource',{id:'dark_iron'});assert.equal(await page.locator('[data-recipe]').first().getAttribute('data-recipe'),'dark_iron');
 await cmd('provisionUnlock',{id:'dark_iron'});for(let i=0;i<3;i++){await cmd('provisionCraft',{id:'dark_iron'});await closeReward();}assert.equal((await snapshot()).inventory.dark_iron,3);
 await section('forge','craft');await reach(card.locator('summary'));if(!await card.locator('details').getAttribute('open'))await card.locator('summary').click();
 await cmd('ui_recipeSource',{id:'blueprint'});await cmd('provisionUnlock',{id:'blueprint'});await cmd('provisionCraft',{id:'blueprint'});await closeReward();
 await section('forge','craft');const before=await snapshot();await cmd('craftEquip',{id:'bastion_spear'});await closeReward();const crafted=await snapshot();assert.equal(before.player.silver-crafted.player.silver,240);assert.equal(crafted.inventory.blueprint,0);assert.equal(crafted.inventory.dark_iron,0);const eq=crafted.equipment.find(e=>e.item==='bastion_spear');assert.ok(eq);
 await section('forge','equipment');const holder=page.locator('#holder-'+eq.uid);await reach(holder);await holder.selectOption('linchong');await cmd('ui_equip',{id:eq.uid});assert.match(await page.locator('.equipment-comparison').innerText(),/拒马枪/);await cmd('equip',{id:eq.uid,hero:'linchong'});await cmd('equipLock',{id:eq.uid,locked:true});await fit();await shot('equipped');
 await section('forge','craft');await reach(card.locator('summary'));await card.locator('summary').click();await cmd('ui_specialView',{id:'mine'});assert.equal(await page.locator('[data-page-section="trials:special"]').count(),1);await fit();await shot('source');
 const saved=await snapshot();await page.reload();await page.locator('button[data-view="camp"]').first().waitFor();const loaded=await snapshot();assert.deepEqual(loaded.equipment,saved.equipment);assert.deepEqual(loaded.expansion.recipes,saved.expansion.recipes);assert.deepEqual(errors,[]);
 console.log('Forge browser PASS '+width+'x'+height+': missing-material jump, actual material manufacture, craft, compare/equip/lock, dungeon source, reload, no overflow or runtime errors.');await context.close();
}}finally{await browser.close();}
