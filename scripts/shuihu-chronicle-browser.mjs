import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture as baseFixture,d} from './shuihu-campaign-fixtures.mjs';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {CHRONICLES,FORGE_STEPS} from '../public/game/js/chronicle-data.js';
import {chronicleRecord} from '../public/game/js/chronicle.js';
import {openRouteRewards,routeBalance} from '../public/game/js/journey-rewards.js';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const origin=new URL(gameURL).origin;
const output=new URL('../artifacts/chronicle/',import.meta.url);
const sizes=[[320,568],[390,844],[1440,1000]];
const regions=Object.keys(CHRONICLES);
const moduleVersions=new Set();
fs.mkdirSync(output,{recursive:true});

function fixture(kind='story'){
  const state=baseFixture(81,40);
  state.clock=Date.now();
  state.lastRegen=state.clock;
  state.camp.buildings.hall=5;
  state.progress.flags.camp_goal_foundation=true;
  state.camp.food=100000;
  state.camp.wood=10000;
  state.player.silver=10000;
  state.player.stamina=100;
  state.inventory.iron=1000;
  state.inventory.recruit_order=2;
  state.inventory.material_choice=2;
  state.inventory.immortal_seal=1;
  const record=chronicleRecord(state);
  if(kind==='ready'){
    state.realm.journey.best.forest=3;
    record.routes.forest.choices=['shelter','watch'];
    record.active={kind:'story',region:'forest',chapter:2,choice:'shelter',ready:true};
  }
  if(kind==='mature'){
    const rewards=openRouteRewards(state);
    for(const region of regions){
      state.realm.journey.best[region]=3;
      record.routes[region]={choices:['shelter','watch','shelter'],patrol:2,forged:0};
      rewards.earned[region]=100;
      state.equipment.push({uid:'eq_'+state.nextEquipment++,item:CHRONICLES[region].equipment,plus:0,hero:null});
    }
  }
  const clean=gameSnapshot(state,d);
  const imported=importSave(exportSave(clean,{id:1,name:'商路行记浏览器回归'},d),d).state;
  assert.deepEqual(imported,clean,kind+' fixture must survive export/import validation');
  return imported;
}

function wallet(state){
  return {silver:state.player.silver,stamina:state.player.stamina,food:state.camp.food,wood:state.camp.wood,inventory:structuredClone(state.inventory),equipment:structuredClone(state.equipment)};
}
const record=state=>state.realm.journey.chronicle;

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
    if(!localStorage.getItem('chronicle-browser')){
      localStorage.setItem('baize_shuihu_save',raw);
      localStorage.setItem('chronicle-browser','1');
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

async function openChronicle(test,viaSelect=false){
  const {page}=test;
  await page.locator('button[data-view="menu"]:visible').first().click();
  await page.locator('#function-menu[open]').waitFor();
  const category=page.locator('#function-menu [data-menu-group-tab="journey"]');
  if(await category.isVisible())await category.click();
  await page.locator('#function-menu button[data-view="realm"][data-menu-section="journey"]').click();
  await idle(page);
  if(viaSelect&&await page.locator('select[data-section-view="realm"]:visible').count()){
    const select=page.locator('select[data-section-view="realm"]:visible').first();
    await reach(test,select);
    await select.selectOption('chronicles');
    await idle(page);
  }else{
    const open=page.locator('.chronicle-banner button');
    await reach(test,open);
    await open.click();
    await idle(page);
  }
  assert.equal(await page.locator('[data-page-section="realm:chronicles"]').count(),1);
  await fit(test);
}

async function reload(test){
  await test.page.reload();
  await test.page.locator('#main').waitFor();
  await idle(test.page);
  assert.deepEqual(test.errors,[],'reload and import validation');
}

async function closeReward(test){
  const close=test.page.locator('#reward-result[open] [data-reward-close]');
  if(await close.count()){
    await reach(test,close);
    await close.click();
    await test.page.locator('#reward-result[open]').waitFor({state:'hidden'});
    await idle(test.page);
  }
}

async function verifyChapterPagination(test,region){
  const {page}=test;
  const prose=page.locator('.chronicle-story > .prose');
  assert.equal(await prose.textContent(),CHRONICLES[region].chapters[0].intro,'chapter prose remains complete');
  const jump=page.locator('#main > .screen-pager input');
  const count=await jump.count()?Number(await jump.getAttribute('max')):1;
  const seen=new Set();
  let required=[],first;
  for(let pageIndex=0;pageIndex<count;pageIndex++){
    if(await jump.count()){await jump.fill(String(pageIndex+1));await jump.press('Enter');}
    await idle(page);
    const detail=await page.evaluate(()=>{
      const host=document.querySelector('#main'),windowBox=(host.querySelector('.screen-window')||host).getBoundingClientRect();
      const inside=r=>r.width>0&&r.left>=windowBox.left-1&&r.right<=windowBox.right+1&&r.top>=windowBox.top-1&&r.bottom<=windowBox.bottom+1;
      const paragraph=document.querySelector('.chronicle-story > .prose'),walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);
      const visible=[],required=[],lines=new Set();let node,index=0;
      while(node=walker.nextNode())for(let offset=0;offset<node.length;offset++,index++){
        if(/\s/.test(node.data[offset]))continue;
        required.push(index);
        const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+1);
        const rect=range.getBoundingClientRect();
        if(inside(rect)){visible.push(index);lines.add(Math.round(rect.top));}
      }
      const title=document.createRange();title.selectNodeContents(document.querySelector('.chronicle-story h2'));
      const titleBox=title.getBoundingClientRect(),kicker=document.querySelector('.chronicle-story > .kicker').getBoundingClientRect();
      const sameLine=titleBox.top<kicker.bottom&&titleBox.bottom>kicker.top;
      return {visible,required,lines:lines.size,titleVisible:[...title.getClientRects()].every(inside),headingCollision:sameLine&&titleBox.right>kicker.left-1};
    });
    for(const index of detail.visible)seen.add(index);
    required=detail.required;
    if(pageIndex===0)first=detail;
  }
  assert.ok(first.titleVisible,'chapter title appears on the first content page');
  assert.equal(first.headingCollision,false,'chapter number does not overlap its title');
  assert.ok(first.visible.length>=20,'first page contains the opening prose');
  if(test.width<=900)assert.ok(first.lines>=2,'mobile first page shows at least two complete prose lines');
  assert.ok(required.every(index=>seen.has(index)),'all prose characters remain reachable across pages');
  if(await jump.count()){await jump.fill('1');await jump.press('Enter');}
  await idle(page);
}


async function runStory(test){
  await openChronicle(test);
  for(const region of regions){
    await clickCommand(test,'ui_chronicleRegion',{id:region},{scope:'.chronicle-tabs'});
    assert.equal(await test.page.locator('.chronicle-story h2').innerText(),CHRONICLES[region].chapters[0].title);
    await verifyChapterPagination(test,region);
    for(const choice of ['shelter','watch']){
      const accept=await command(test,'chronicleAccept',{region,choice});
      await reach(test,accept);
      assert.equal(await accept.isDisabled(),false);
    }
    await fit(test);
  }
  await clickCommand(test,'ui_chronicleRegion',{id:'forest'},{scope:'.chronicle-tabs'});
  await screenshot(test,'story-intro');
  const firstChoice=await command(test,'chronicleAccept',{region:'forest',choice:'shelter'});
  await reach(test,firstChoice);
  await screenshot(test,'story-choices');
  const before=await snapshot(test.page);
  await clickCommand(test,'chronicleAccept',{region:'forest',choice:'shelter'});
  const accepted=await snapshot(test.page);
  assert.deepEqual(wallet(accepted),wallet(before),'accepting a commission does not charge resources');
  assert.deepEqual(record(accepted).active,{kind:'story',region:'forest',chapter:0,choice:'shelter',ready:false});
  assert.match(await test.page.locator('.chronicle-story').textContent(),/启程消耗：体力.*粮草/);
  await reach(test,await command(test,'ui_section',{view:'realm',id:'planning'},'.chronicle-story'));
  await reach(test,await command(test,'ui_section',{view:'realm',id:'journey'},'.chronicle-story'));
  await screenshot(test,'story-accepted');
  await reload(test);
  assert.deepEqual(record(await snapshot(test.page)),record(accepted),'accepted commission persists through reload');
  await openChronicle(test,true);
  await clickCommand(test,'journeyStart',{region:'forest',tier:1,goal:'camp'});
  const started=await snapshot(test.page);
  assert.equal(started.realm.trek.journey.goal,'camp');
  assert.equal(started.realm.trek.journey.region,'forest');
  assert.deepEqual(started.realm.trek.journey.chronicle,{kind:'story',region:'forest',chapter:0,choice:'shelter'});
  assert.equal(started.realm.trek.journey.offers.length,3);
  assert.equal(await test.page.locator('.chronicle-run').count(),1);
  for(const id of started.realm.trek.journey.offers)await reach(test,await command(test,'journeyChoice',{id}));
  await screenshot(test,'story-journey-offers');
  const boon=started.realm.trek.journey.offers[0];
  await clickCommand(test,'journeyChoice',{id:boon});
  const chosen=await snapshot(test.page);
  assert.deepEqual(chosen.realm.trek.journey.boons,[boon]);
  assert.deepEqual(chosen.realm.trek.journey.offers,[]);
  await reload(test);
  assert.deepEqual((await snapshot(test.page)).realm.trek.journey,chosen.realm.trek.journey,'bound journey and chosen tactic persist');
  await test.page.locator('button[data-view="menu"]:visible').first().click();
  const category=test.page.locator('#function-menu [data-menu-group-tab="journey"]');
  if(await category.isVisible())await category.click();
  await test.page.locator('#function-menu button[data-view="realm"][data-menu-section="journey"]').click();
  await idle(test.page);
  await clickCommand(test,'journeyReturn');
  await closeReward(test);
  await openChronicle(test);
  const cancelling=await snapshot(test.page);
  await clickCommand(test,'chronicleCancel');
  const cancelled=await snapshot(test.page);
  assert.equal(record(cancelled).active,null);
  assert.deepEqual(wallet(cancelled),wallet(cancelling),'cancelling does not charge or award materials');
  await fit(test);
  console.log('Chronicle story PASS '+test.width+'x'+test.height+': all routes and choices reachable, accept without debit, reload, real target-bound journey, tactic selection, return and cancellation.');
}

async function runReady(test){
  await openChronicle(test);
  const before=await snapshot(test.page);
  const chapter=CHRONICLES.forest.chapters[2];
  assert.match(await test.page.locator('.chronicle-story').innerText(),/委托已办妥/);
  await reach(test,await command(test,'chronicleBuild'));
  await screenshot(test,'project-ready');
  await test.page.evaluate(()=>{window.__chronicleReceipt=null;window.__chronicleObserver=new MutationObserver(()=>{const dialog=document.querySelector('#reward-result[open]');if(dialog)window.__chronicleReceipt=[...dialog.querySelectorAll('.reward-grid article')].map(row=>({name:row.querySelector('span').textContent,amount:row.querySelector('b').textContent}));});window.__chronicleObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});});
  await clickCommand(test,'chronicleBuild',{}, {double:true});
  await test.page.waitForFunction(()=>window.__chronicleReceipt!==null);
  const built=await snapshot(test.page);
  assert.deepEqual(record(built).routes.forest.choices,['shelter','watch','shelter']);
  assert.equal(record(built).active,null);
  for(const [id,n]of Object.entries(chapter.cost)){
    const have=state=>id==='silver'?state.player.silver:['wood','food'].includes(id)?state.camp[id]:state.inventory[id]||0;
    assert.equal(have(before)-have(built),n,id+' charged exactly once');
  }
  for(const [id,n]of Object.entries(chapter.reward))assert.equal((built.inventory[id]||0)-(before.inventory[id]||0),n,id+' awarded exactly once');
  const receipt=await test.page.evaluate(()=>{window.__chronicleObserver.disconnect();return window.__chronicleReceipt;});
  for(const [id,n]of Object.entries(chapter.reward))assert.deepEqual(receipt.filter(row=>row.name===d.by.items[id].name),[{name:d.by.items[id].name,amount:'+'+n}],id+' appears once in the receipt');
  assert.deepEqual(receipt.filter(row=>row.name===CHRONICLES.forest.project+' · 工程'),[{name:CHRONICLES.forest.project+' · 工程',amount:'+1'}],'the project itself advances once');
  await screenshot(test,'project-rewards');
  await closeReward(test);
  assert.equal(await test.page.locator('button[data-command*="chronicleBuild"]').count(),0,'completed project cannot be built again');
  await reload(test);
  const reloaded=await snapshot(test.page);
  assert.deepEqual(wallet(reloaded),wallet(built),'reload does not repeat construction costs or rewards');
  assert.deepEqual(record(reloaded),record(built));
  await openChronicle(test,true);
  assert.match(await test.page.locator('.chronicle-story h2').innerText(),/商路巡守/);
  await fit(test);
  console.log('Chronicle project PASS '+test.width+'x'+test.height+': validated ready fixture, rapid double-click charges and rewards once, one receipt, completed state persists.');
}

async function runMature(test){
  await openChronicle(test,true);
  for(const region of regions){
    await clickCommand(test,'ui_chronicleRegion',{id:region},{scope:'.chronicle-tabs'});
    assert.match(await test.page.locator('.chronicle-forge h2').innerText(),/0\/3/);
    const forge=await command(test,'chronicleForge',{region});
    await reach(test,forge);
    assert.equal(await forge.isDisabled(),false);
    await reach(test,await command(test,'chroniclePatrol',{region,rank:3}));
    await fit(test);
  }
  await clickCommand(test,'ui_chronicleRegion',{id:'forest'},{scope:'.chronicle-tabs'});
  const ranks=test.page.locator('[data-fold="chronicle-patrol-forest"] > summary');
  await reach(test,ranks);
  await ranks.click();
  await idle(test.page);
  const rankButtons=test.page.locator('.chronicle-ranks button');
  assert.equal(await rankButtons.count(),8);
  for(let rank=1;rank<=8;rank++){
    const button=rankButtons.nth(rank-1);
    await reach(test,button);
    assert.equal(await button.isDisabled(),rank>3,'patrol unlock for rank '+rank);
  }
  await reach(test,ranks);
  await ranks.click();
  await idle(test.page);
  await reach(test,await command(test,'chronicleForge',{region:'forest'}));
  await screenshot(test,'mature-forge');
  const before=await snapshot(test.page),step=FORGE_STEPS[0];
  await clickCommand(test,'chronicleForge',{region:'forest'});
  await test.page.locator('#reward-result[open]').waitFor();
  const forged=await snapshot(test.page);
  assert.equal(record(forged).routes.forest.forged,1);
  assert.equal(before.player.silver-forged.player.silver,step.silver);
  assert.equal(before.inventory.iron-forged.inventory.iron,step.iron);
  assert.equal(routeBalance(before,'forest')-routeBalance(forged,'forest'),step.marks);
  assert.deepEqual(forged.equipment,before.equipment,'blueprint refinement does not replace gear or alter strengthening');
  await screenshot(test,'mature-forge-rewards');
  await closeReward(test);
  assert.match(await test.page.locator('.chronicle-forge h2').innerText(),/1\/3/);
  assert.equal(await (await command(test,'chronicleForge',{region:'forest'})).isDisabled(),true,'next refinement requires patrol rank four');
  await reload(test);
  assert.deepEqual(record(await snapshot(test.page)),record(forged),'forged blueprint persists');
  await openChronicle(test);
  const patrolBefore=await snapshot(test.page);
  await clickCommand(test,'chroniclePatrol',{region:'forest',rank:3});
  const patrolling=await snapshot(test.page);
  assert.deepEqual(record(patrolling).active,{kind:'patrol',region:'forest',rank:3});
  assert.deepEqual(wallet(patrolling),wallet(patrolBefore),'preparing patrol does not charge resources');
  await reach(test,await command(test,'journeyStart',{region:'forest',tier:3,goal:'arms'}));
  assert.match(await test.page.locator('.chronicle-story').textContent(),/本阶敌军倍率：气血.*攻击.*防御/);
  await screenshot(test,'mature-patrol');
  await clickCommand(test,'journeyStart',{region:'forest',tier:3,goal:'arms'});
  const started=await snapshot(test.page);
  assert.deepEqual(started.realm.trek.journey.chronicle,{kind:'patrol',region:'forest',rank:3});
  assert.equal(started.realm.trek.journey.tier,3);
  await clickCommand(test,'journeyChoice',{id:started.realm.trek.journey.offers[0]});
  await fit(test);
  console.log('Chronicle mature PASS '+test.width+'x'+test.height+': three route blueprints, eight reachable patrol ranks, real refinement debit and reload, rank-three patrol captured by real journey.');
}

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const widths=(process.env.SHUIHU_CHRONICLE_WIDTHS||process.env.SHUIHU_CHRONICLE_WIDTH||'').split(',').filter(Boolean).map(Number);
  const scopes=(process.env.SHUIHU_CHRONICLE_SCOPE||'all').split(',');
  assert.ok(scopes.every(scope=>['all','story','ready','mature'].includes(scope)));
  for(const [width,height] of sizes.filter(([width])=>!widths.length||widths.includes(width))){
    for(const kind of ['story','ready','mature'].filter(kind=>scopes.includes('all')||scopes.includes(kind))){
      console.log('Chronicle checking '+kind+' '+width+'x'+height);
      const test=await scene(width,height,kind);
      try{await ({story:runStory,ready:runReady,mature:runMature}[kind])(test);}
      catch(error){
        await test.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'x'+height+'.png',output))}).catch(()=>{});
        throw error;
      }finally{await test.context.close();}
    }
  }
  console.log('Chronicle module cache tags observed: '+[...moduleVersions].sort().join(', '));
}finally{await browser.close();}
