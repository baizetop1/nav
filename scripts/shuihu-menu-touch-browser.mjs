import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture,d} from './shuihu-campaign-fixtures.mjs';
import {validateSave} from '../public/game/js/save.js';

const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||path.resolve('artifacts/browser-tools/node_modules/playwright'));
const browser=await chromium.launch({executablePath:process.env.SHUIHU_BROWSER_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1067/chrome-win/chrome.exe'),headless:true});
const bundle=process.env.SHUIHU_GAME_ASSETS;
const url=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const out='artifacts/menu-touch';fs.mkdirSync(out,{recursive:true});
const reports=[];
const idle=async page=>{await page.waitForFunction(()=>document.querySelector('#app')&&!document.querySelector('#app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const geometry=page=>page.locator('#function-menu').evaluate(dialog=>{
  const entries=dialog.querySelector('.function-menu-groups');
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {dialog:rect(dialog),heading:rect(dialog.querySelector('.function-menu-heading')),tabs:rect(dialog.querySelector('.function-menu-tabs')),entries:rect(entries),top:entries.scrollTop,max:entries.scrollHeight-entries.clientHeight,documentTop:document.scrollingElement.scrollTop};
});
async function tap(page,selector){
  const button=page.locator(selector);const r=await button.boundingBox();
  assert.ok(r&&r.width>0&&r.height>0,'touch target visible: '+selector);
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=page.viewportSize().width+1&&r.y+r.height<=page.viewportSize().height+1,'touch target inside viewport: '+selector);
  await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
}
async function swipe(page,cdp){
  const r=(await geometry(page)).entries;
  const x=r.x+r.width/6,startY=r.y+r.height-12,endY=r.y+12;
  assert.ok(startY-endY>30,'enough space for a finger gesture');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY}]});
  for(let step=1;step<=12;step++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:startY+(endY-startY)*step/12}]});
    await page.waitForTimeout(25);
  }
  // Stop the finger before release so a following tap is not consumed by fling cancellation.
  await page.waitForTimeout(250);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(200);
}
try{
  for(const [width,height,largeText] of [[360,740,false],[844,280,false],[360,300,false],[360,520,true]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('https://save.baizeone.top/**',route=>route.abort());
    if(bundle)await context.route('**/game/**',route=>{
      const pathname=new URL(route.request().url()).pathname.split('/game/')[1];
      const file=path.join(bundle,decodeURIComponent(pathname));
      return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream')}):route.abort();
    });
    const state=fixture();state.clock=Date.now();state.lastRegen=state.clock;validateSave(state,d);
    await context.addInitScript(raw=>{if(!localStorage.getItem('menu-touch')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('menu-touch','1')}},JSON.stringify(state));
    await page.goto(url);await page.locator('#main').waitFor();await idle(page);
    // Deliberately enlarge entry text and line height to cover system text scaling.
    if(largeText){
      const styleURL=new URL('menu-text-scale.css',url).href;
      await context.route(styleURL,route=>route.fulfill({contentType:'text/css',body:'#function-menu .function-menu-grid button{font-size:26px;line-height:2;min-height:140px;white-space:normal}'}));
      await page.addStyleTag({url:styleURL});
    }
    await tap(page,'button[data-view=menu]:visible >> nth=0');await page.locator('#function-menu[open]').waitFor();await idle(page);
    await tap(page,'#function-menu [data-menu-group-tab=other]');
    const before=await geometry(page),cdp=await context.newCDPSession(page);
    assert.ok(before.dialog.y>=0&&before.dialog.y+before.dialog.height<=height+1,'dialog bounded by viewport');
    if(height===740){assert.equal(before.max,0,'normal phone category fits');}
    else{
      assert.ok(before.max>20,'this case must require actual scrolling');
      for(let attempt=0;attempt<6;attempt++){await swipe(page,cdp);const pos=await geometry(page);if(pos.top>=pos.max-1)break;}
      const after=await geometry(page);
      assert.ok(after.top>0,'finger gesture scrolls menu entries');
      assert.ok(after.top>=after.max-1,'finger gesture reaches last row');
      assert.deepEqual(after.heading,before.heading,'heading and close button stay fixed');
      assert.deepEqual(after.tabs,before.tabs,'category tabs stay fixed');
      assert.equal(after.documentTop,0,'background does not scroll');
      await page.screenshot({path:path.join(out,'scrolled-'+width+'x'+height+(largeText?'-large':'')+'.png')});
      await tap(page,'#function-menu [data-menu-group-tab=journey]');
      assert.equal((await geometry(page)).top,0,'switching categories resets scroll');
      await tap(page,'#function-menu [data-menu-group-tab=other]');
      for(let attempt=0;attempt<6;attempt++){const pos=await geometry(page);if(pos.top>=pos.max-1)break;await swipe(page,cdp);}
    }
    // Use a real tap, without Playwright auto-scrolling, on the bottom-most entry.
    await tap(page,'#function-menu [data-menu-section=mentorship]');
    await page.locator('#function-menu').waitFor({state:'detached'});await idle(page);
    assert.equal(await page.locator('[data-page-section="camp:mentorship"]').count(),1,'bottom entry opens the intended page');
    await tap(page,'button[data-view=menu]:visible >> nth=0');await page.locator('#function-menu[open]').waitFor();
    if(height!==740)await swipe(page,cdp);
    await tap(page,'#function-menu [data-menu-close]');await page.locator('#function-menu').waitFor({state:'detached'});
    assert.deepEqual(errors,[]);
    reports.push({width,height,largeText,overflow:before.max,touchScroll:before.max>0,bottomEntry:true,fixedHeader:true});
    await context.close();console.log('Menu touch PASS',width,height,largeText?'large text':'');
  }
  fs.writeFileSync(path.join(out,bundle?'apk-report.json':'report.json'),JSON.stringify(reports,null,2)+'\n');
}catch(error){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure.png')});if(await page.locator('#function-menu').count())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await geometry(page),null,2));}throw error;}
finally{await browser.close();}
