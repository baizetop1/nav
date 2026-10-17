import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture} from './shuihu-campaign-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||path.resolve('artifacts/browser-tools/node_modules/playwright'));
const browser=await chromium.launch({executablePath:process.env.SHUIHU_BROWSER_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1067/chrome-win/chrome.exe'),headless:true});
const out=process.env.SHUIHU_SOURCE_NAV_OUT||'artifacts/source-navigation',reports=[];
fs.mkdirSync(out,{recursive:true});
const idle=async p=>{await p.waitForFunction(()=>document.querySelector('#app')&&!document.querySelector('#app').hasAttribute('aria-busy'));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
async function command(p,type,extra={},scope='#app'){
 const els=p.locator(scope+' button[data-command]'),index=await els.evaluateAll((els,{type,extra})=>els.findIndex(el=>{const cmd=JSON.parse(el.dataset.command);return cmd.type===type&&Object.entries(extra).every(([k,v])=>cmd[k]===v)&&el.getClientRects().length;}),{type,extra});
 assert.ok(index>=0,'visible command '+type+' '+JSON.stringify(extra));const el=els.nth(index);await el.evaluate(e=>e.focus({preventScroll:true}));await idle(p);await el.click();await idle(p);
}
async function menu(p,group,selector){await p.locator('[data-view=menu]:visible').first().click();const tab=p.locator('[data-menu-group-tab='+group+']');if(await tab.isVisible())await tab.click();await p.locator('#function-menu '+selector).click();await idle(p);}
async function section(p,id){const select=p.locator('[data-section-view=bag]:visible');if(await select.count())await select.selectOption(id);else await command(p,'ui_section',{view:'bag',id});await idle(p);}
const inventoryState=p=>p.locator('.inventory-browser').evaluate(el=>({query:el.querySelector('input').value,page:el.querySelector('.inventory-pagination span').textContent,items:[...el.querySelectorAll('h3')].map(x=>x.textContent)}));
const fit=async p=>{const r=await p.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));assert.ok(r.x<=1&&r.y<=1,'no page scrolling');};
try{for(const size of [{width:320,height:568},{width:390,height:844},{width:1440,height:1000}]){
 const state=fixture();for(const id of ['wine','ration','vital_pill','camp_pack','medical_crate','smoke_pack','material_choice'])state.inventory[id]=1;
 const context=await browser.newContext({viewport:size}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await context.route('https://save.baizeone.top/**',r=>r.abort());await p.clock.setFixedTime(state.clock);
 await context.addInitScript(raw=>{if(!localStorage.getItem('source-nav-check')){const s=JSON.parse(raw);localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_guide:1:'+s.startedAt,'off');localStorage.setItem('source-nav-check','1');}},JSON.stringify(state));
 await p.goto(process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html');await p.locator('[data-exploration-home]').waitFor();await idle(p);
 // The reported failure: direct bag tab must preserve the inventory page.
 await menu(p,'other','[data-menu-section=supplies]');await command(p,'ui_inventoryPage',{page:1});let expected=await inventoryState(p);
 await section(p,'sources');await command(p,'ui_sourceReturn');assert.equal(await p.locator('#app').getAttribute('data-view'),'bag');assert.deepEqual(await inventoryState(p),expected);
 // Search also survives entry and return, including the mobile section dropdown.
 await p.locator('#inventory-query').fill('体力');await command(p,'ui_inventoryFilter');expected=await inventoryState(p);await section(p,'sources');await command(p,'ui_sourceReturn');assert.deepEqual(await inventoryState(p),expected);
 // Item detail -> sources -> detail -> same filtered inventory.
 await command(p,'ui_inventoryDetail',{id:'wine'});await command(p,'ui_sources',{id:'wine'},'#inventory-detail');assert.equal(await p.locator('[data-source-target]').getAttribute('data-source-target'),'wine');await command(p,'ui_sourceReturn');assert.equal(await p.locator('#inventory-detail[open]').count(),1);assert.match(await p.locator('#inventory-detail-title').innerText(),/村酒/);await p.locator('[data-inventory-close]').first().click();await idle(p);assert.deepEqual(await inventoryState(p),expected);
 // Source -> ingredient -> source -> route destination -> source -> caller.
 await section(p,'sources');await p.locator('#source-item').selectOption('bastion_spear');await command(p,'ui_sourceTab',{id:'cost'});await command(p,'ui_sources',{id:'blueprint'});await command(p,'ui_sourceReturn');assert.equal(await p.locator('[data-source-target]').getAttribute('data-source-target'),'bastion_spear');assert.equal(await p.locator('.source-cost').count(),1);
 await p.locator('#source-item').selectOption('iron');await p.locator('#source-route').selectOption('daily:ore');await command(p,'ui_sourceGo');assert.equal(await p.locator('#app').getAttribute('data-view'),'trials');await command(p,'ui_sourceReopen');assert.equal(await p.locator('[data-source-target]').getAttribute('data-source-target'),'iron');assert.equal(await p.locator('#source-route').inputValue(),'daily:ore');await command(p,'ui_sourceReturn');assert.deepEqual(await inventoryState(p),expected);
 // Menu source entry must capture the hero page before changing the current view.
 await menu(p,'heroes','[data-menu-section=quality]');await p.locator('#section-hero').selectOption('shiqian');await idle(p);await command(p,'ui_sources',{id:'core_shiqian'});await command(p,'ui_sourceReturn');assert.equal(await p.locator('#section-hero').inputValue(),'shiqian');assert.ok(await p.locator('.quality-panel').count());
 await menu(p,'other','[data-menu-section=sources]');await command(p,'ui_sourceReturn');assert.equal(await p.locator('#app').getAttribute('data-view'),'heroes');assert.equal(await p.locator('#section-hero').inputValue(),'shiqian');assert.ok(await p.locator('.quality-panel').count());
 // Changing slots must clear the old source route and its return context.
 await menu(p,'other','[data-menu-section=sources]');await p.locator('#source-item').selectOption('iron');await p.locator('#source-route').selectOption('daily:ore');await command(p,'ui_sourceGo');
 await p.evaluate(async()=>{const {SlotDatabase,emptySlot}=await import('./js/slots.js'),db=await SlotDatabase.open(indexedDB);try{const record=await db.read(1);await db.commit(2,0,()=>({...emptySlot(2),raw:record.raw}));}finally{db.db.close();}});
 await menu(p,'other','[data-menu-section=local]');const slots=p.locator('details[data-fold=slots]');await slots.locator('summary').click();await idle(p);await p.locator('#local-slot').selectOption('2');p.once('dialog',dialog=>dialog.accept());await command(p,'ui_slotSwitch');await p.locator('[data-exploration-home]').waitFor();await idle(p);assert.equal(await p.locator('[data-source-reopen]').count(),0,'no stale source route in the other slot');
 await menu(p,'other','[data-menu-section=supplies]');expected=await inventoryState(p);await section(p,'sources');await command(p,'ui_sourceReturn');assert.deepEqual(await inventoryState(p),expected);await fit(p);assert.deepEqual(errors,[]);
 await p.screenshot({path:out+'/returned-inventory-'+size.width+'x'+size.height+'.png'});reports.push({...size,cases:['bag-tab-page','inventory-filter','inventory-detail','nested-ingredient','source-route-reopen','promotion-hero','menu-entry','switch-slot-clears-navigation'],errors});await context.close();
 }
 fs.writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));console.log('Source navigation browser PASS: '+reports.length+' viewports; direct tabs, menu, detail, page/filter, ingredients, route/reopen, selected hero and slot isolation.');
}catch(e){for(const context of browser.contexts())for(const p of context.pages()){await p.screenshot({path:out+'/failure.png'});console.error((await p.locator('body').innerText()).slice(-5000));}throw e;}finally{await browser.close();}
