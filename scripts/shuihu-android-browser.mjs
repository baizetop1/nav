import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(project,'artifacts/android');
const current=path.join(out,'bundled-0.68.0/game'),previous=path.join(out,'bundled-0.54.0/game');
assert.ok(fs.existsSync(path.join(current,'index.html')),'Extract and verify APK assets first.');
assert.ok(fs.existsSync(path.join(previous,'index.html')),'Previous APK assets are required to check upgrading existing saves.');
const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const start='https://baizeone.top/__android__/game/index.html';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2'};
const idle=p=>p.waitForFunction(()=>!document.getElementById('app')?.hasAttribute('aria-busy'));
async function command(p,type){await p.locator('button[data-command]').evaluateAll((els,type)=>{const b=els.find(e=>JSON.parse(e.dataset.command).type===type&&!e.disabled);if(!b)throw Error('Missing enabled command '+type);b.click();},type);await idle(p);}
async function view(p,name){await p.locator('button[data-view]').evaluateAll((els,name)=>{const b=els.find(e=>e.dataset.view===name&&!e.disabled);if(!b)throw Error('Missing view '+name);b.click();},name);await idle(p);}
async function read(p){return p.evaluate(async()=>new Promise((resolve,reject)=>{const request=indexedDB.open('baize-shuihu-box',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('slots','readonly'),r=tx.objectStore('slots').get(1);r.onsuccess=()=>resolve(JSON.parse(r.result.raw));r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();};}));}
async function dismiss(p){for(const selector of ['[data-reward-close]','[data-loot-close]']){const el=p.locator(selector);if(await el.count())await el.first().click();}}
try{
 for(const width of [360,390,844]){
  const context=await browser.newContext({viewport:{width,height:width===844?390:844}}),page=await context.newPage();
  const errors=[],missing=[],external=[];let assets=previous;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(Date.now());
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin==='https://baizeone.top'&&u.pathname.startsWith('/__android__/game/')){
    const file=path.resolve(assets,decodeURIComponent(u.pathname.slice('/__android__/game/'.length)));
    if(file.startsWith(path.resolve(assets)+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:types[path.extname(file)]||'application/octet-stream',headers:{'Cache-Control':'no-cache'}});
    missing.push(u.pathname);return route.fulfill({status:404,body:'Bundled asset unavailable'});
   }
   external.push(u.href);return route.abort();
  });
  await context.addInitScript(()=>{window.BaizeAndroid={exportSave(text,name){window.exported={text,name};}};});
  await page.goto(start);await page.locator('.opening').waitFor();await command(page,'ui_start');await page.locator('[data-page-section="camp:home"]').waitFor();await dismiss(page);
  const before=await read(page);
  assets=current;await page.reload();await page.locator('.camp-dashboard').waitFor();await idle(page);
  assert.equal(await page.locator('html').getAttribute('data-android'),'true');
  const release=await page.evaluate(async()=> (await fetch('./data/config.json')).json());assert.equal(release.release,'0.68.0');
  const upgraded=await read(page);assert.deepEqual(upgraded.team,before.team);
  for(const [id,n] of Object.entries(before.inventory))assert.equal(upgraded.inventory[id],n,'Preserve inventory '+id);
  for(const [id,h] of Object.entries(before.heroes).filter(([,h])=>h.status==='owned')){assert.equal(upgraded.heroes[id].level,h.level,id);assert.equal(upgraded.heroes[id].exp,h.exp,id);assert.equal(upgraded.heroes[id].status,h.status,id);}
  await view(page,'save');await command(page,'ui_export');await page.waitForFunction(()=>window.exported);
  const exported=await page.evaluate(()=>window.exported);assert.ok(exported.name.endsWith('.json'));assert.ok(exported.text.includes('baisheng'));
  await page.locator('select[data-section-view="save"]').selectOption('files');await idle(page);
  await page.locator('#import-file').setInputFiles({name:'apk-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(exported.text)});
  await command(page,'ui_import');await page.locator('#import-confirm[open]').waitFor();await command(page,'ui_confirmImport');await page.locator('#import-confirm').waitFor({state:'detached'});
  await view(page,'camp');await page.reload();await page.locator('.camp-dashboard').waitFor();await idle(page);
  const restored=await read(page);assert.deepEqual(restored.team,upgraded.team);assert.deepEqual(restored.inventory,upgraded.inventory);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.ok(external.every(u=>u.startsWith('https://save.baizeone.top/')),'No website fallback or remote game assets');
  await page.locator('.scene-banner img').evaluate(img=>img.decode());assert.ok(await page.locator('.scene-banner img').evaluate(img=>img.naturalWidth>0),'Bundled scene image must decode');await page.screenshot({path:path.join(out,'apk068-home-'+width+'.png')});
  console.log('APK browser PASS',width,'actual bundled assets, offline 0.54-to-0.68 upgrade, same IndexedDB save, native export, file import, restart');await context.close();
 }
 const context=await browser.newContext({viewport:{width:660,height:430}}),page=await context.newPage();
 const source=fs.readFileSync(path.join(project,'android/res/drawable-nodpi/app_icon_art.png')).toString('base64');
 await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#eef6f3;font:14px system-ui;color:#36423d;padding:24px}h2{font-size:20px;margin:0 0 18px}.row{display:flex;gap:40px}.item{text-align:center}.icon{width:144px;height:144px;overflow:hidden;position:relative;background:#bdd5c5}.circle{border-radius:50%}.square{border-radius:30px}.icon img{position:absolute;width:111.111%;height:111.111%;left:-5.5555%;top:-5.5555%}.mono img{filter:brightness(0) saturate(100%);opacity:.7}.tiny{width:48px;height:48px;border-radius:12px;margin:16px auto 8px}p{margin:12px 0}</style><h2>白泽水浒 · 新桌面图标</h2><div class="row">${[['square','圆角'],['circle','圆形'],['square mono','主题图标']].map(([cl,label])=>`<div class="item"><div class="icon ${cl}"><img src="data:image/png;base64,${source}"></div><p>${label}</p><div class="icon ${cl} tiny"><img src="data:image/png;base64,${source}"></div></div>`).join('')}</div>`);
 await page.screenshot({path:path.join(out,'apk068-icon-preview.png')});await context.close();
}finally{await browser.close();}
