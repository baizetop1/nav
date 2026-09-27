import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture as baseFixture,d} from './shuihu-campaign-fixtures.mjs';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {dispatch} from '../public/game/js/core.js';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialDropTable} from '../public/game/js/special-dungeons-data.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const origin=new URL(gameURL).origin,output=new URL('../artifacts/special-browser/',import.meta.url),moduleVersions=new Set();
fs.mkdirSync(output,{recursive:true});
function fixture(kind='fresh'){
 let state=baseFixture(7,40);state.clock=Date.now();state.lastRegen=state.clock;state.progress.flags.camp_goal_foundation=true;state.camp.mode='army';state.camp.deployment=85;state.camp.troops=100;state.development??={version:1,corps:{},presets:{},goal:null,ledger:[]};state.development.presets[1]={team:[...state.team],mode:'solo',deployment:50,tactic:state.camp.tactic};
 if(kind==='record')state.specialDungeons={version:1,clears:Object.fromEntries(Object.keys(SPECIAL_DUNGEONS).flatMap(id=>[1,2,3].map(tier=>[id+'_'+tier,2]))),last:{id:'mine',tier:3,outcome:'victory',at:state.clock,drops:specialDropTable('mine',3).map(r=>({kind:r.kind,id:r.id,count:r.min,stored:r.min}))}};
 state=dispatch(d,state,{type:'refresh'},state.clock);state.rng=11;
 const clean=gameSnapshot(state,d),restored=importSave(exportSave(clean,{id:1,name:'特殊副本浏览器回归'},d),d).state;assert.deepEqual(restored,clean);return restored;
}
function costs(s){return {stamina:s.player.stamina,silver:s.player.silver,food:s.camp.food,troops:s.camp.troops,wounded:s.camp.wounded,mode:s.camp.mode,deployment:s.camp.deployment,heroExp:Object.fromEntries(s.team.map(id=>[id,s.heroes[id].exp]))};}
async function idle(page){
  await page.waitForFunction(()=>document.getElementById('app')&&!document.getElementById('app').hasAttribute('aria-busy'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function scene(width,height,kind){
  const state=fixture(kind);
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    const url=new URL(response.url());
    if(url.origin!==origin||!url.pathname.includes('/game/'))return;
    if(response.status()>=400)errors.push('HTTP '+response.status()+' '+url.pathname);
    if(url.pathname.includes('/js/')&&url.pathname.endsWith('.js'))moduleVersions.add(url.searchParams.get('v')||'(unversioned)');
  });
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    return url.origin===origin?route.continue():route.abort('blockedbyclient');
  });
  await context.addInitScript(raw=>{
    if(!localStorage.getItem('special-browser')){
      localStorage.setItem('baize_shuihu_save',raw);
      localStorage.setItem('special-browser','1');
    }
  },JSON.stringify(state));
  await page.clock.setFixedTime(state.clock);
  await page.goto(gameURL);
  await page.locator('#main').waitFor();
  await idle(page);
  assert.deepEqual(errors,[],'initial module loading');
  return {context,page,errors,width,height,kind,state};
}

async function snapshot(page){
  return page.evaluate(async()=>{
    const {SlotDatabase}=await import('./js/slots.js');
    const database=await SlotDatabase.open(indexedDB);
    try{return JSON.parse((await database.read(1)).raw);}finally{database.db.close();}
  });
}

async function command(test,type,extra={},scope='#main'){
  const buttons=test.page.locator(scope+' button[data-command]');
  const index=await buttons.evaluateAll((elements,{type,extra})=>elements.findIndex(element=>{
    const value=JSON.parse(element.dataset.command);
    return value.type===type&&Object.entries(extra).every(([key,item])=>value[key]===item);
  }),{type,extra});
  assert.ok(index>=0,'missing command '+type+' '+JSON.stringify(extra));
  return buttons.nth(index);
}

async function reach(test,element){
  await element.waitFor({state:'attached'});
  const folds=await element.evaluate(e=>{
    const folds=[];
    for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!(e.tagName==='SUMMARY'&&p===e.parentElement))folds.push(p.dataset.fold);
    return folds.reverse();
  });
  for(const fold of folds){
    assert.ok(fold,'closed disclosure requires a stable data-fold');
    const summary=test.page.locator('[data-fold="'+fold+'"] > summary');
    await reach(test,summary);
    await summary.click();
    await idle(test.page);
  }
  const host=await element.evaluate(e=>e.closest('dialog')?'dialog[open] .dialog-body':'#main');
  const pager=test.page.locator(host+' > .screen-pager');
  const jump=pager.locator('input');
  if(await jump.count()){
    await jump.fill('1');
    await jump.press('Enter');
  }
  for(let attempt=0;attempt<80;attempt++){
    const bounds=await element.evaluate(e=>{
      const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();
      return {width:r.width,height:r.height,x:r.x,y:r.y,inside:r.width>0&&r.height>0&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1)};
    });
    if(bounds.inside){
      if(test.width>900)await element.scrollIntoViewIfNeeded();
      return;
    }
    const next=pager.locator('[data-screen-next]');
    if(!await next.count()||await next.isDisabled())throw Error('Unreachable control '+await element.textContent()+' '+JSON.stringify(bounds));
    await next.click();
  }
  throw Error('Pagination did not reach '+await element.textContent());
}

async function clickCommand(test,type,extra={},options={}){
  const element=await command(test,type,extra,options.scope||'#main');
  await reach(test,element);
  assert.equal(await element.isDisabled(),false,type+' must be available');
  await element.click({clickCount:options.double?2:1,delay:options.double?50:undefined});
  await idle(test.page);
  assert.deepEqual(test.errors,[],type);
}

async function fit(test){
  await idle(test.page);
  const measurements=await test.page.locator('#main').evaluate(e=>({
    scrollY:e.scrollHeight-e.clientHeight,scrollX:e.scrollWidth-e.clientWidth,
    documentY:document.documentElement.scrollHeight-innerHeight,documentX:document.documentElement.scrollWidth-innerWidth
  }));
  assert.ok(measurements.documentY<=1&&measurements.documentX<=1,'document overflow '+JSON.stringify(measurements));
  if(test.width<=900)assert.ok(measurements.scrollY<=1&&measurements.scrollX<=1,'mobile page must paginate without overflow '+JSON.stringify(measurements));
  assert.ok(await test.page.locator('.brand > .seal').evaluate(e=>{const box=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1);}), 'both header seal characters stay inside their frame');
  for(const modal of await test.page.locator('dialog[open]').all()){
    assert.ok(await modal.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1&&e.scrollHeight<=e.clientHeight+1;}),'dialog overflow');
  }
  assert.deepEqual(test.errors,[]);
}

async function screenshot(test,name){
  await fit(test);
  await test.page.screenshot({path:fileURLToPath(new URL(name+'-'+test.width+'x'+test.height+'.png',output))});
}


async function openSpecial(test){
 const p=test.page;await p.locator('button[data-view="menu"]:visible').first().click();await p.locator('#function-menu[open]').waitFor();const tab=p.locator('#function-menu [data-menu-group-tab="journey"]');if(await tab.isVisible())await tab.click();await p.locator('#function-menu [data-menu-section="special"]').click();await idle(p);assert.equal(await p.locator('[data-page-section="trials:special"]').count(),1);await fit(test);
}
async function reload(test){await test.page.reload();await test.page.locator('#main').waitFor();await idle(test.page);assert.deepEqual(test.errors,[]);}
async function select(test,change){for(const key of ['id','tier','tab','category'])if(Object.hasOwn(change,key)){const scope={id:'.special-tabs[aria-label="特殊副本"]',tier:'.special-tiers',tab:'.special-tabs[aria-label="副本信息"]',category:'.special-drop-filters'}[key];await clickCommand(test,'ui_specialView',{[key]:change[key]},{scope});}await fit(test);}
async function verifyDrops(test,id,tier){
 await select(test,{tab:'drops'});const expected=specialDropTable(id,tier),found=[];
 for(let page=0;page<Math.ceil(expected.length/3);page++){
  const rows=test.page.locator('.special-drop-list article');assert.ok(await rows.count()<=3);for(const row of await rows.all()){await reach(test,row);found.push((await row.locator('strong').innerText()).trim());const label=await row.locator('b').innerText();assert.match(label,/^\d+(\.\d+)?%$/);}
  const next=test.page.locator('.special-pager button').last();await reach(test,next);assert.equal(await next.isDisabled(),page===Math.ceil(expected.length/3)-1);if(page<Math.ceil(expected.length/3)-1){await next.click();await idle(test.page);await fit(test);}
 }
 assert.deepEqual(found,expected.map(r=>(r.kind==='equipment'?d.by.equipments:d.by.items)[r.id].name),'all table rows reachable in order');
 for(const category of ['medicine','equipment','material','all']){await select(test,{category});for(const row of await test.page.locator('.special-drop-list article').all())await reach(test,row);}
 await screenshot(test,'drops-'+id+'-'+tier);
}
async function browse(test){
 await openSpecial(test);
 for(const id of Object.keys(SPECIAL_DUNGEONS)){
  await select(test,{id});
  for(const tier of [1,2,3]){await select(test,{tier});await select(test,{tab:'overview'});const start=await command(test,'specialStart',{id,tier});await reach(test,start);assert.equal(await start.isDisabled(),test.kind!=='record'&&tier>1);await fit(test);}
  await select(test,{tier:1});await verifyDrops(test,id,1);await select(test,{tab:'overview'});
 }
 await select(test,{id:'mine',tier:1});await select(test,{tab:'overview'});const firstAction=await command(test,'specialStart',{id:'mine',tier:1});if(test.width<=900)assert.ok(await firstAction.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return !w||r.top>=w.top-1&&r.bottom<=w.bottom+1;}),'challenge is visible on the first mobile page');await screenshot(test,'overview');
 if(test.kind==='record'){
  await select(test,{tab:'record'});const count=specialDropTable('mine',3).length;let seen=0;
  for(let i=0;i<Math.ceil(count/4);i++){const rows=test.page.locator('.special-receipt-list li');seen+=await rows.count();for(const row of await rows.all())await reach(test,row);const next=test.page.locator('.special-pager button').last();await reach(test,next);if(i<Math.ceil(count/4)-1){await next.click();await idle(test.page);}}
  assert.equal(seen,count);await screenshot(test,'record');
 }
 console.log('Special navigation PASS '+test.width+'x'+test.height+' '+test.kind+': three dungeons, all difficulty gates, every drop row/category, reachable pagination, no page or dialog overflow.');
}
async function battle(test){
 const p=test.page;await select(test,{id:'mine',tier:1,tab:'overview'});const before=await snapshot(p);await clickCommand(test,'specialStart',{id:'mine',tier:1});await p.locator('#sortie-preview[open]').waitFor();await fit(test);
 assert.deepEqual(costs(await snapshot(p)),costs(before),'preview has no debit');assert.match(await p.locator('#sortie-preview').textContent(),/不耗体力与粮草/);
 await p.locator('#sortie-preview [data-dialog-tab="config"]').click();assert.equal(await p.locator('#sortie-mode').isDisabled(),true);assert.equal(await p.locator('#sortie-mode').inputValue(),'army');assert.equal(await p.locator('#sortie-troops').inputValue(),'85');const presets=p.locator('#sortie-preset');await reach(test,presets);await presets.selectOption('1');await clickCommand(test,'ui_sortiePreset',{}, {scope:'#sortie-preview'});await p.locator('#sortie-preview [data-dialog-tab="config"]').click();assert.equal(await p.locator('#sortie-mode').inputValue(),'army','solo preset keeps ordinary army mode');assert.equal(await p.locator('#sortie-troops').inputValue(),'85','preset keeps ordinary troop count');assert.deepEqual(costs(await snapshot(p)),costs(before),'using preset in preview does not debit or change camp');
 await p.locator('#sortie-preview [data-dialog-tab="overview"]').click();await screenshot(test,'prepare');await clickCommand(test,'ui_sortieConfirm',{}, {scope:'#sortie-preview'});
 const started=await snapshot(p);assert.equal(started.battle.context.type,'special');assert.equal(started.battle.expedition.troops,0);assert.deepEqual(costs(started),costs(before));
 await reload(test);assert.equal((await snapshot(p)).battle.context.type,'special','active battle survives reload');const pause=await command(test,'ui_battlePause');if((await pause.innerText()).includes('继续'))await clickCommand(test,'ui_battlePause');await clickCommand(test,'ui_battleSpeed',{speed:2});
 await p.waitForFunction(()=>{const e=document.querySelector('.battle-end button');return e&&!e.disabled;},{},{timeout:60000});await fit(test);
 await clickCommand(test,'finishBattle');await p.locator('#reward-result[open]').waitFor();await screenshot(test,'reward');const finished=await snapshot(p);assert.equal(finished.specialDungeons.last.outcome,'victory');assert.ok(finished.specialDungeons.last.drops.some(r=>r.kind==='item'),'seeded victory includes material loot');assert.ok(finished.specialDungeons.last.drops.some(r=>r.kind==='equipment'),'seeded victory includes equipment loot');assert.equal(finished.specialDungeons.clears.mine_1,1);assert.deepEqual(costs(finished),costs(before),'special battle grants no fixed silver/experience and charges no resource');assert.equal(finished.battle,null);console.log('Special actual loot '+JSON.stringify(finished.specialDungeons.last.drops));
 for(const row of finished.specialDungeons.last.drops){if(row.kind==='item')assert.equal((finished.inventory[row.id]||0)-(before.inventory[row.id]||0),row.stored);else assert.equal(finished.equipment.filter(e=>e.item===row.id).length-before.equipment.filter(e=>e.item===row.id).length,row.stored);}
 await p.locator('#reward-result [data-dialog-tab="loot"]').click();await fit(test);const retry=p.locator('#reward-result [data-reward-command]');assert.equal(await retry.innerText(),'再次挑战');await retry.click();await p.locator('#sortie-preview[open]').waitFor();await clickCommand(test,'ui_sortieConfirm',{}, {scope:'#sortie-preview'});await clickCommand(test,'battleRetreat');await clickCommand(test,'finishBattle');await p.locator('#reward-result[open]').waitFor();const retreated=await snapshot(p);assert.equal(retreated.specialDungeons.last.outcome,'retreat');assert.deepEqual(retreated.specialDungeons.last.drops,[]);assert.equal(retreated.specialDungeons.clears.mine_1,1);assert.deepEqual(costs(retreated),costs(before));
 const close=p.locator('#reward-result [data-reward-close]');await close.click();await reload(test);const reloaded=await snapshot(p);assert.deepEqual(reloaded.specialDungeons,retreated.specialDungeons);assert.deepEqual(reloaded.inventory,retreated.inventory);assert.deepEqual(reloaded.equipment,retreated.equipment);await openSpecial(test);await select(test,{tab:'record'});await screenshot(test,'retreat-record');
 console.log('Special battle PASS '+test.width+'x'+test.height+': real preview, active reload, zero-cost solo win, persisted random loot, retry, retreat, no duplicate drops on reload.');
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const widths=(process.env.SHUIHU_SPECIAL_WIDTHS||'').split(',').filter(Boolean).map(Number),sizes=[[320,568],[360,640],[390,844],[1280,900]].filter(([w])=>!widths.length||widths.includes(w));
 for(const [width,height] of sizes){if(width===320){const test=await scene(width,height,'fresh');try{await openSpecial(test);const start=await command(test,'specialStart',{id:'mine',tier:1});assert.ok(await start.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return !w||r.top>=w.top-1&&r.bottom<=w.bottom+1;}),'smallest phone shows challenge on first page');await screenshot(test,'overview');console.log('Special compact overview PASS 320x568: first-page challenge, zero-cost summary, no scrolling.');}finally{await test.context.close();}continue;}for(const kind of ['fresh','record']){console.log('Special checking '+kind+' '+width+'x'+height);const test=await scene(width,height,kind);try{await browse(test);if(kind==='fresh')await battle(test);}catch(e){await test.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await test.context.close();}}}
 console.log('Special module cache tags: '+[...moduleVersions].sort().join(', '));
}finally{await browser.close();}
