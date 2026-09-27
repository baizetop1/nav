import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture,act,d} from './shuihu-campaign-fixtures.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../artifacts/menu/',import.meta.url);
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const groups=['journey','camp','heroes','other'];
const sizes=[[320,568],[360,640],[390,700],[390,701],[390,844],[844,390],[1440,1000]];
fs.mkdirSync(out,{recursive:true});

function initialState(){
  const state=fixture();
  state.clock=Date.now();
  state.lastRegen=state.clock;
  state.player.stamina=100;
  for(const item of d.items)state.inventory[item.id]=3;
  return state;
}

async function scene(width,height,state){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://save.baizeone.top/**',route=>route.abort());
  await context.addInitScript(raw=>{
    if(!localStorage.getItem('menu-regression')){
      localStorage.setItem('baize_shuihu_save',raw);
      localStorage.setItem('menu-regression','1');
    }
  },JSON.stringify(state));
  await page.goto(gameURL);
  await page.locator('#main').waitFor();
  await idle(page);
  return {context,page,errors,width,height};
}

async function idle(page){
  await page.waitForFunction(()=>document.querySelector('#app')&&!document.querySelector('#app').hasAttribute('aria-busy'));
}

async function reach(page,element){
  await element.waitFor({state:'attached'});
  const host=await element.evaluate(e=>e.closest('dialog')?'dialog[open] .dialog-body':'#main');
  const pager=page.locator(host+' > .screen-pager');
  const jump=pager.locator('input');
  if(await jump.count()){
    await jump.fill('1');
    await jump.press('Enter');
  }
  for(let attempt=0;attempt<60;attempt++){
    if(await element.evaluate(e=>{
      const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();
      return r.width>0&&r.height>0&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);
    }))return;
    const next=pager.locator('[data-screen-next]');
    if(!await next.count()||await next.isDisabled())break;
    await next.click();
  }
  await element.scrollIntoViewIfNeeded();
}

async function openMenu(test){
  await idle(test.page);
  await test.page.locator('button[data-view="menu"]:visible').first().click();
  await test.page.locator('dialog#function-menu[open]').waitFor();
  assert.equal(await test.page.locator('#function-menu').evaluate(e=>e instanceof HTMLDialogElement),true);
}

async function closeMenu(test,method='close'){
  const {page,width,height}=test;
  if(method==='escape')await page.keyboard.press('Escape');
  else if(method==='backdrop'){
    const box=await page.locator('#function-menu').boundingBox();
    const point=[[1,1],[width-1,1],[1,height-1],[width-1,height-1]].find(([x,y])=>x<box.x||x>box.x+box.width||y<box.y||y>box.y+box.height);
    assert.ok(point,'dialog must leave an exposed backdrop');
    await page.mouse.click(...point);
  }else await page.locator('#function-menu [data-menu-close]:visible').first().click();
  await page.locator('#function-menu[open]').waitFor({state:'hidden'});
  await idle(page);
}

async function showGroup(test,group){
  const tab=test.page.locator('#function-menu [data-menu-group-tab="'+group+'"]');
  if(await tab.isVisible())await tab.click();
  await test.page.locator('#function-menu .function-menu-group[data-menu-group="'+group+'"]').waitFor({state:'visible'});
}

async function menuFits(test){
  const {page,width,height,errors}=test;
  assert.equal(await page.locator('#function-menu .function-menu-heading > h2').count(),1,'menu title stays in its original heading');
  assert.equal(await page.locator('#function-menu .function-menu-heading > [data-menu-close]').count(),1,'close control shares the title heading');
  assert.equal(await page.locator('#function-menu :is(.dialog-body,.screen-pager)').count(),0,'grid menu bypasses generic dialog wrapping and pagination');
  const info=await page.locator('#function-menu').evaluate(e=>{
    const bounds=e.getBoundingClientRect();
    const title=e.querySelector('#function-menu-title')?.getBoundingClientRect();
    const close=e.querySelector('[data-menu-close]')?.getBoundingClientRect();
    const headingAligned=Boolean(title&&close&&Math.abs((title.top+title.bottom-close.top-close.bottom)/2)<=2&&close.left>=title.right);
    const visible=[...e.querySelectorAll('.function-menu-group')].filter(g=>g.getBoundingClientRect().width>0&&g.getBoundingClientRect().height>0);
    const clipped=[...e.querySelectorAll('button')].filter(b=>{
      const r=b.getBoundingClientRect();
      return r.width>0&&r.height>0&&(r.left<bounds.left-1||r.right>bounds.right+1||r.top<bounds.top-1||r.bottom>bounds.bottom+1);
    }).map(b=>b.textContent.trim());
    return {left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom,scrollX:e.scrollWidth-e.clientWidth,scrollY:e.scrollHeight-e.clientHeight,visible:visible.map(g=>g.dataset.menuGroup),clipped,headingAligned};
  });
  assert.ok(info.left>=0&&info.top>=0&&info.right<=width+1&&info.bottom<=height+1,'menu outside viewport: '+JSON.stringify(info));
  assert.ok(info.scrollX<=1&&info.scrollY<=1,'menu must fit without scrolling: '+JSON.stringify(info));
  assert.deepEqual(info.clipped,[],'menu buttons must be fully visible');
  assert.equal(info.headingAligned,true,'menu title and close button share one header row');
  const short=height<=700;
  assert.equal(await page.locator('#function-menu .function-menu-tabs').isVisible(),short,'category tabs follow the short-screen breakpoint');
  assert.equal(info.visible.length,short?1:4,'short screens display one category');
  assert.deepEqual(errors,[]);
}

async function screenshot(test,name){
  await test.page.screenshot({path:fileURLToPath(new URL(name+'-'+test.width+'x'+test.height+'.png',out))});
}

async function menuLinks(test){
  return test.page.locator('#function-menu .function-menu-group').evaluateAll(sections=>sections.flatMap(section=>[...section.querySelectorAll('button[data-view]')].map((button,index)=>({
    group:section.dataset.menuGroup,index,label:button.textContent.trim(),view:button.dataset.view,section:button.dataset.menuSection||'',map:button.dataset.menuMap||''
  }))));
}

async function navigate(test,link){
  await openMenu(test);
  await showGroup(test,link.group);
  const button=test.page.locator('#function-menu .function-menu-group[data-menu-group="'+link.group+'"] button[data-view]').nth(link.index);
  assert.equal(await button.isDisabled(),false,link.label+' should be available');
  await button.click();
  await test.page.locator('#function-menu[open]').waitFor({state:'hidden'});
  await idle(test.page);
  await test.page.waitForFunction(view=>document.querySelector('#main')?.dataset.screen===view,link.view);
  if(link.section){
    assert.equal(await test.page.locator('[data-page-section="'+link.view+':'+link.section+'"]').count(),1,link.label+' page section');
  }
  if(link.map){
    assert.equal(await test.page.locator('.journey-content').getAttribute('data-journey-section'),link.map,link.label+' journey section');
  }
  assert.deepEqual(test.errors,[],link.label);
}

async function checkAppearance(test){
  const {page,height}=test;
  const menuColors=[];
  for(const theme of ['paper','night']){
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    await openMenu(test);
    menuColors.push(await page.locator('#function-menu').evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})));
    for(const group of groups){
      await showGroup(test,group);
      await menuFits(test);
      if(height<=700||group===groups[0])await screenshot(test,'menu-'+theme+'-'+group);
    }
    await closeMenu(test);
  }
  assert.notDeepEqual(menuColors[0],menuColors[1],'menu responds to day/night preference');
  await page.locator('[data-theme-toggle]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'paper');
}

async function checkAppearanceOnly(width,height){
  const test=await scene(width,height,initialState());
  try{
    await test.page.locator('button[data-view="camp"]:visible').first().click();
    await idle(test.page);
    await checkAppearance(test);
    console.log('Menu appearance PASS '+width+'x'+height+': bounded day/night menu screenshots refreshed.');
  }finally{await test.context.close();}
}

async function checkMenus(width,height){
  const test=await scene(width,height,initialState());
  const {page,context}=test;
  try{
    await page.locator('button[data-view="camp"]:visible').first().click();
    await idle(page);
    await page.evaluate(()=>{window.menuBaseMain=document.getElementById('main');});
    await openMenu(test);
    assert.equal(await page.locator('#main').getAttribute('data-screen'),'camp','opening menu preserves the current page');
    assert.equal(await page.evaluate(()=>document.getElementById('main')===window.menuBaseMain),true,'opening menu preserves the underlying DOM');
    assert.deepEqual(await page.locator('#function-menu .function-menu-group').evaluateAll(es=>es.map(e=>e.dataset.menuGroup)),groups);
    const links=await menuLinks(test);
    assert.equal(links.length,24,'all 24 menu destinations exist');
    assert.equal(new Set(links.map(link=>[link.view,link.section,link.map].join(':'))).size,24,'menu destinations are distinct');
    await closeMenu(test);

    await checkAppearance(test);

    const materials=links.find(link=>link.view==='bag'&&link.section==='materials')||links.find(link=>link.view==='bag');
    assert.ok(materials,'menu has a bag entry');
    await navigate(test,materials);
    const query=page.locator('#inventory-query');
    await reach(page,query);
    await query.fill('菜单关闭后保留的未提交输入');
    for(const method of ['escape','close','backdrop']){
      const before=await page.evaluate(()=>{
        window.menuBaseMain=document.getElementById('main');
        window.menuBaseInput=document.getElementById('inventory-query');
        return {screen:window.menuBaseMain.dataset.screen,query:window.menuBaseInput.value,page:window.menuBaseMain.querySelector('.screen-pager input')?.value||''};
      });
      await openMenu(test);
      assert.equal(await page.evaluate(()=>document.getElementById('main')===window.menuBaseMain),true,method+' open preserves main');
      await closeMenu(test,method);
      const after=await page.evaluate(()=>({
        screen:document.getElementById('main').dataset.screen,query:document.getElementById('inventory-query').value,page:document.getElementById('main').querySelector('.screen-pager input')?.value||'',
        sameMain:document.getElementById('main')===window.menuBaseMain,sameInput:document.getElementById('inventory-query')===window.menuBaseInput
      }));
      assert.deepEqual(after,{...before,sameMain:true,sameInput:true},method+' preserves page, pagination, and unfinished input');
    }

    for(const link of links)await navigate(test,link);
    assert.deepEqual(test.errors,[]);
    console.log('Menu PASS '+width+'x'+height+': 24 destinations, four groups, bounded day/night layouts, native modal, Escape/close/backdrop preserve page and input.');
  }catch(error){
    await screenshot(test,'failure-navigation').catch(()=>{});
    throw error;
  }finally{await context.close();}
}

async function snapshot(page){
  return page.evaluate(async()=>{
    const {SlotDatabase}=await import('./js/slots.js');
    const database=await SlotDatabase.open(indexedDB);
    try{return JSON.parse((await database.read(1)).raw);}finally{database.db.close();}
  });
}

async function checkBattle(width,height){
  const state=act(initialState(),'campRaid',{id:'woods'});
  assert.ok(state.battle&&!state.battle.outcome,'fixture starts an unfinished camp battle');
  const test=await scene(width,height,state);
  const {page,context}=test;
  try{
    await page.locator('.battle-state').waitFor();
    assert.match(await page.locator('.battle-state').innerText(),/交战已暂停/);
    const pause=page.locator('button[data-command*="ui_battlePause"]');
    await reach(page,pause);
    await pause.click();
    await page.waitForFunction(()=>document.querySelector('.battle-state')?.textContent==='正在自动交战');
    await openMenu(test);
    await menuFits(test);
    const disabled=await page.locator('#function-menu button[data-view]').evaluateAll(buttons=>buttons.map(button=>({
      label:button.textContent.trim(),view:button.dataset.view,map:button.dataset.menuMap||'',disabled:button.disabled
    })));
    assert.equal(disabled.length,24);
    for(const entry of disabled){
      const allowed=entry.view==='save'||entry.view==='chronicle'||(entry.view==='map'&&entry.map==='story');
      assert.equal(entry.disabled,!allowed,entry.label+' battle availability');
    }
    await screenshot(test,'menu-battle');
    const paused=await snapshot(page);
    assert.ok(paused.battle&&!paused.battle.outcome);
    await closeMenu(test,'escape');
    const time=await page.locator('.battle-time').innerText();
    await page.waitForTimeout(2300);
    assert.equal(await page.locator('.battle-time').innerText(),time,'battle clock remains stopped');
    assert.equal((await snapshot(page)).battle.elapsed,paused.battle.elapsed,'saved battle does not advance while paused');
    assert.equal(await page.locator('.battle-state').innerText(),'交战已暂停','closing menu must show paused combat');
    assert.deepEqual(test.errors,[]);
    console.log('Menu battle PASS '+width+'x'+height+': opening pauses, only story/save/chronicle enabled, closing does not resume.');
  }catch(error){
    await screenshot(test,'failure-battle').catch(()=>{});
    throw error;
  }finally{await context.close();}
}

try{
  const requestedWidths=(process.env.SHUIHU_MENU_WIDTHS||process.env.SHUIHU_MENU_WIDTH||'').split(',').filter(Boolean).map(Number);
  const requestedHeights=(process.env.SHUIHU_MENU_HEIGHTS||process.env.SHUIHU_MENU_HEIGHT||'').split(',').filter(Boolean).map(Number);
  const scope=process.env.SHUIHU_MENU_SCOPE||'all';
  assert.ok(['all','navigation','battle','appearance'].includes(scope),'SHUIHU_MENU_SCOPE must be all, navigation, battle, or appearance');
  for(const [width,height] of sizes.filter(([width,height])=>(!requestedWidths.length||requestedWidths.includes(width))&&(!requestedHeights.length||requestedHeights.includes(height)))){
    if(scope==='appearance')await checkAppearanceOnly(width,height);
    else{
      if(scope!=='battle')await checkMenus(width,height);
      if(scope!=='navigation')await checkBattle(width,height);
    }
  }
}finally{await browser.close();}
