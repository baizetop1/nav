import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture as baseFixture,d} from './shuihu-campaign-fixtures.mjs';
import {dispatch} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {RESOURCE_ROUTES,resourceReward} from '../public/game/js/resource-dungeons-data.js';
import {DAILY_ROUTES} from '../public/game/js/rotations.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html',origin=new URL(gameURL).origin;
const output=new URL('../artifacts/resource-dungeons-browser/',import.meta.url),moduleVersions=new Set(),copy=structuredClone;
fs.mkdirSync(output,{recursive:true});
function fixture(){
 let s=baseFixture(530,40);s.clock=Date.now();s.lastRegen=s.clock;s.progress.flags.camp_goal_foundation=true;s.camp.buildings.hall=4;s.camp.mode='army';s.camp.deployment=85;s.camp.troops=0;s.camp.wounded=0;s.camp.food=0;s.battleSkillMode='auto';s.team=['wusong','linchong','wuyong'];
 for(const id of s.team){Object.assign(s.heroes[id],{status:'owned',level:40,exp:0,quality:2});for(const skill of d.by.heroes[id].skills){const flag=d.by.skills[skill].training?.flag;if(flag)s.progress.flags[flag]=true;}}
 s=dispatch(d,s,{type:'refresh'},s.clock);const clean=gameSnapshot(s,d),restored=importSave(exportSave(clean,{id:1,name:'资源副本浏览器回归'},d),d).state;assert.deepEqual(restored,clean);return restored;
}
const wallet=s=>({stamina:s.player.stamina,silver:s.player.silver,food:s.camp.food,wood:s.camp.wood,troops:s.camp.troops,wounded:s.camp.wounded,inventory:s.inventory,team:s.team,mode:s.camp.mode,deployment:s.camp.deployment});
const stock=s=>({silver:s.player.silver,food:s.camp.food,wood:s.camp.wood,herb:s.inventory.herb||0});
async function idle(page){await page.waitForFunction(()=>document.getElementById('app')&&!document.getElementById('app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function scene(width,height,kind){
 const state=fixture(),context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.origin!==origin||!u.pathname.includes('/game/'))return;if(r.status()>=400)errors.push('HTTP '+r.status()+' '+u.pathname);if(u.pathname.includes('/js/')&&u.pathname.endsWith('.js'))moduleVersions.add(u.searchParams.get('v')||'(unversioned)');});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 await context.addInitScript(raw=>{if(!localStorage.getItem('resource-dungeons-browser')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','2');localStorage.setItem('resource-dungeons-browser','1');}},JSON.stringify(state));
 await page.clock.setFixedTime(state.clock);await page.goto(gameURL);await page.locator('.viewport-shell').waitFor();await page.locator('#main').waitFor();await idle(page);assert.deepEqual(errors,[],'initial loading');return {context,page,errors,width,height,kind,state};
}
async function snapshot(page){return page.evaluate(async version=>{const {SlotDatabase}=await import('./js/slots.js?v='+version);const db=await SlotDatabase.open(indexedDB);try{const slot=await db.read(1);if(!slot?.raw)throw Error('isolated slot 01 missing');return JSON.parse(slot.raw);}finally{db.db.close();}},d.config.release);}
async function command(t,type,extra={},scope='#main'){
 const buttons=t.page.locator(scope+' button[data-command]'),jump=t.page.locator('#main > .screen-pager input'),pages=await jump.count()?Number(await jump.getAttribute('max')):1;
 for(let page=0;page<=pages;page++){
  if(page&&await jump.count()){await jump.fill(String(page));await jump.press('Enter');await idle(t.page);}
  const index=await buttons.evaluateAll((els,{type,extra})=>els.findIndex(e=>{const c=JSON.parse(e.dataset.command);return c.type===type&&Object.entries(extra).every(([k,v])=>c[k]===v);}),{type,extra});if(index>=0)return buttons.nth(index);
 }
 assert.fail('missing '+type+' '+JSON.stringify(extra));
}
async function reach(t,el){
 await el.waitFor({state:'attached'});
 const folds=await el.evaluate(e=>{const list=[];for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!(e.tagName==='SUMMARY'&&p===e.parentElement))list.push(p.dataset.fold);return list.reverse();});
 for(const fold of folds){assert.ok(fold,'stable disclosure');const summary=t.page.locator('[data-fold="'+fold+'"] > summary');await reach(t,summary);await summary.click();await idle(t.page);}
 const host=await el.evaluate(e=>e.closest('dialog')?'#'+e.closest('dialog').id+' .dialog-body':'#main'),pager=t.page.locator(host+' > .screen-pager'),jump=pager.locator('input');if(await jump.count()){await jump.fill('1');await jump.press('Enter');}
 const positions=[];for(let n=0;n<100;n++){
  const box=await el.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,window:w?{x:w.x,y:w.y,width:w.width,height:w.height}:null,inside:r.width>0&&r.height>0&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1)};});
  positions.push(box);if(box.inside){if(t.width>900)await el.scrollIntoViewIfNeeded();return;}
  const next=pager.locator('[data-screen-next]');if(!await next.count()||await next.isDisabled())throw Error('Unreachable '+await el.textContent()+' '+JSON.stringify(positions));await next.click();await idle(t.page);
 }throw Error('Page limit reaching '+await el.textContent());
}
async function click(t,type,extra={},scope='#main'){const el=await command(t,type,extra,scope);await reach(t,el);assert.equal(await el.isDisabled(),false,type+' enabled');await el.click();await idle(t.page);assert.deepEqual(t.errors,[],type);}
async function fit(t){
 await idle(t.page);const m=await t.page.locator('#main').evaluate(e=>({mainY:e.scrollHeight-e.clientHeight,mainX:e.scrollWidth-e.clientWidth,documentY:document.documentElement.scrollHeight-innerHeight,documentX:document.documentElement.scrollWidth-innerWidth}));
 assert.ok(m.documentX<=1,'horizontal document overflow '+JSON.stringify(m));if(t.width<=900)assert.ok(m.documentY<=1&&m.mainY<=1&&m.mainX<=1,'mobile document must paginate '+JSON.stringify(m));
 for(const dialog of await t.page.locator('dialog[open]').all())assert.ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1&&e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'dialog overflow');assert.deepEqual(t.errors,[]);
}
async function shot(t,name){await fit(t);await t.page.screenshot({path:fileURLToPath(new URL(name+'-'+t.width+'x'+t.height+'.png',output))});}
async function closeReward(t){const close=t.page.locator('#reward-result[open] [data-reward-close]');if(await close.count()){await reach(t,close);await close.click();await idle(t.page);}}
async function more(t,view){
 await closeReward(t);const menu=t.page.locator('button[data-view="menu"]:visible').first();await reach(t,menu);await menu.click();await idle(t.page);await fit(t);
 const target=t.page.locator('#function-menu button[data-view="'+view+'"]').first();await target.waitFor({state:'attached'});const group=await target.evaluate(e=>e.closest('[data-menu-group]')?.dataset.menuGroup);
 if(group){const tab=t.page.locator('[data-menu-group-tab="'+group+'"]');if(await tab.isVisible()){await reach(t,tab);await tab.click();await idle(t.page);}}
 await reach(t,target);await target.click();await idle(t.page);await fit(t);
}
async function section(t,view,id){
 await closeReward(t);const direct=t.page.locator('button[data-view="'+view+'"]:visible').first();if(await direct.count()){await reach(t,direct);await direct.click();await idle(t.page);}else await more(t,view);
 const picker=t.page.locator('select[data-section-view="'+view+'"]:visible').first();if(await picker.count()){await reach(t,picker);await picker.selectOption(id);await idle(t.page);}else await click(t,'ui_section',{view,id});await fit(t);
}
async function firstPageChallenge(t,id,tier){
 // Inspect the rendered first page directly: never page or scroll to satisfy this check.
 const box=await t.page.locator('#resource-dungeons button[data-command]').evaluateAll((buttons,{id,tier})=>{
  const e=buttons.find(button=>{const c=JSON.parse(button.dataset.command);return c.type==='rotationStart'&&c.kind==='daily'&&c.id===id&&c.tier===tier;});if(!e)return null;
  const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect(),jump=document.querySelector('#main > .screen-pager input');return {x:r.x,y:r.y,width:r.width,height:r.height,page:jump?Number(jump.value):1,inside:r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1)};
 },{id,tier});
 assert.ok(box,'resource challenge exists');assert.equal(box.page,1,'resource selection stays on the first content page');assert.ok(box.inside,'first-page challenge visible without paging '+id+' '+tier+' '+JSON.stringify(box));
}
async function select(t,id,tier=1){
 const route=t.page.locator('#resource-route');await reach(t,route);await route.selectOption(id);await idle(t.page);const difficulty=t.page.locator('#resource-tier');await reach(t,difficulty);await difficulty.selectOption(String(tier));await idle(t.page);await fit(t);await firstPageChallenge(t,id,tier);
}
async function openResource(t,id,tier=1){await section(t,'trials','resources');await select(t,id,tier);}
async function reload(t){await t.page.reload();await t.page.locator('.viewport-shell').waitFor();await t.page.locator('#main').waitFor();await idle(t.page);assert.deepEqual(t.errors,[]);}
async function browse(t){
 await more(t,'trials');await section(t,'trials','resources');await firstPageChallenge(t,await t.page.locator('#resource-route').inputValue(),Number(await t.page.locator('#resource-tier').inputValue()));
 assert.deepEqual(await t.page.locator('#resource-route option').evaluateAll(es=>es.map(e=>e.value)),RESOURCE_ROUTES.map(r=>r.id));assert.deepEqual(await t.page.locator('#resource-tier option').evaluateAll(es=>es.map(e=>e.value)),['1','2','3']);
 for(const r of RESOURCE_ROUTES)for(const tier of [1,2,3]){
  await select(t,r.id,tier);const starts=t.page.locator('#main button[data-command]');assert.equal(await starts.evaluateAll(es=>es.filter(e=>JSON.parse(e.dataset.command).type==='rotationStart').length),1,'one selected resource difficulty, not a long list');
  const start=await command(t,'rotationStart',{kind:'daily',id:r.id,tier});await reach(t,start);assert.equal(await start.isDisabled(),false,'zero-food army may enter '+r.id+' '+tier);
  const text=await t.page.locator('#main').textContent();assert.match(text,new RegExp(r.name));assert.match(text,new RegExp(String(r.amounts[tier-1])));
  for(const button of await t.page.locator('#main button[data-command]').all())await reach(t,button);await fit(t);
 }
 await select(t,'grain',3);await shot(t,'resource-three-tiers');
 const before=wallet(await snapshot(t.page));
 for(const r of RESOURCE_ROUTES){await section(t,'bag','materials');await click(t,'ui_resourceSource',{id:r.id});assert.equal(await t.page.locator('#resource-route').inputValue(),r.id);assert.equal(await t.page.locator('select[data-section-view="trials"]').inputValue(),'resources');await firstPageChallenge(t,r.id,Number(await t.page.locator('#resource-tier').inputValue()));assert.deepEqual(wallet(await snapshot(t.page)),before,'source navigation does not spend');await fit(t);}
 await more(t,'trials');await section(t,'trials','daily');assert.deepEqual(new Set(await t.page.locator('#daily-route option').evaluateAll(es=>es.map(e=>e.value))),new Set(DAILY_ROUTES.map(r=>r.id)));
 for(const r of DAILY_ROUTES){const picker=t.page.locator('#daily-route');await reach(t,picker);await picker.selectOption(r.id);await idle(t.page);for(const tier of [1,2,3])await reach(t,await command(t,'rotationStart',{kind:'daily',id:r.id,tier}));await fit(t);}
 await shot(t,'legacy-materials');await more(t,'bag');await section(t,'bag','materials');await more(t,'trials');await section(t,'trials','resources');await fit(t);
 console.log('Resource browser navigation PASS '+t.width+'x'+t.height+': four source links, all resource/difficulty buttons, first-page challenge, one selected card, original materials, More navigation, no overflow.');
}
function gains(before,after,id,tier=1){
 const reward=resourceReward(id,tier),expected=stock(before);for(const key of ['silver','food','wood'])expected[key]+=reward[key]||0;expected.herb+=reward.items?.herb||0;assert.deepEqual(stock(after),expected,'fixed resource reward '+id);
 assert.equal(after.player.stamina,before.player.stamina-10);assert.equal(after.camp.mode,before.camp.mode);assert.equal(after.camp.deployment,before.camp.deployment);assert.equal(after.camp.troops,before.camp.troops);assert.equal(after.camp.wounded,before.camp.wounded);
 assert.equal(after.lastBattle.context.id,id);assert.equal(after.lastBattle.troops,0);assert.equal(after.lastBattle.wounded,0);assert.equal(after.lastBattle.fallen||0,0);
}
async function reward(t,r){await t.page.locator('#reward-result[open]').waitFor();const row=t.page.locator('#reward-result .reward-grid article').filter({has:t.page.locator('span',{hasText:new RegExp('^'+r.resourceName+'$')})});assert.equal(await row.count(),1,'resource receipt '+r.id);assert.equal(await row.locator('b').innerText(),'+'+r.amounts[0]);await reach(t,row);await fit(t);}
async function battle(t,id){
 const r=RESOURCE_ROUTES.find(r=>r.id===id);await openResource(t,id);const original=await snapshot(t.page);assert.equal(original.camp.food,0);assert.equal(original.camp.mode,'army');assert.equal(original.camp.troops,0);
 await click(t,'rotationStart',{kind:'daily',id,tier:1});await t.page.locator('#sortie-preview[open]').waitFor();assert.deepEqual(wallet(await snapshot(t.page)),wallet(original),'preview keeps zero-food army state');await fit(t);
 const overview=await t.page.locator('#sortie-panel-overview').textContent();assert.match(overview,/体力\s*−?10/);assert.match(overview,/粮草\s*−?0/);
 await t.page.locator('#sortie-preview [data-dialog-tab="config"]').click();await idle(t.page);assert.equal(await t.page.locator('#sortie-mode').inputValue(),'army');assert.equal(await t.page.locator('#sortie-mode').isDisabled(),true);assert.equal(await t.page.locator('#sortie-troops').inputValue(),'85');assert.equal(await t.page.locator('#sortie-troops').isDisabled(),true);await shot(t,'zero-food-config-'+id);
 await click(t,'ui_sortieCancel',{},'#sortie-preview');assert.deepEqual(wallet(await snapshot(t.page)),wallet(original),'cancel preserves all resources and army choice');assert.deepEqual((await snapshot(t.page)).campaign,original.campaign);
 for(let attempt=1;attempt<=2;attempt++){
  if(attempt>1)await openResource(t,id);const before=await snapshot(t.page);await click(t,'rotationStart',{kind:'daily',id,tier:1});await t.page.locator('#sortie-preview[open]').waitFor();await click(t,'ui_sortieConfirm',{},'#sortie-preview');
  const started=await snapshot(t.page);assert.equal(started.battle.context.id,id);assert.equal(started.battle.expedition.troops,0);assert.equal(started.player.stamina,before.player.stamina-10);assert.deepEqual(stock(started),stock(before));
  await t.page.waitForFunction(()=>{const button=document.querySelector('.battle-end button');return button&&!button.disabled;},{},{timeout:45000});await click(t,'finishBattle');await reward(t,r);
  const after=await snapshot(t.page);gains(before,after,id);assert.equal(after.campaign.mastery[id+'_1'],attempt);assert.equal(after.campaign.daily.uses[id],attempt);if(attempt===1)await shot(t,'battle-reward-'+id);await closeReward(t);
 }
 await openResource(t,id);const beforeSweep=await snapshot(t.page);assert.equal(beforeSweep.campaign.mastery[id+'_1'],2);
 for(const confirm of [false,true]){
  await click(t,'ui_sweepPreview',{id,tier:1,count:1});await t.page.locator('#sweep-preview[open]').waitFor();const text=await t.page.locator('#sweep-preview').textContent();assert.match(text,new RegExp(r.resourceName+'\\s*(?:[+＋×]\\s*)?'+r.amounts[0]));assert.match(text,/体力\s*10/);assert.match(text,/粮草\s*0/);assert.deepEqual(wallet(await snapshot(t.page)),wallet(beforeSweep),'sweep preview keeps resources');await shot(t,'sweep-positive-'+id);
  if(confirm)await click(t,'rotationSweep',{id,tier:1,count:1},'#sweep-preview');else{await click(t,'ui_sweepCancel',{},'#sweep-preview');assert.deepEqual(wallet(await snapshot(t.page)),wallet(beforeSweep),'sweep cancellation keeps resources');}
 }
 await reward(t,r);const swept=await snapshot(t.page);gains(beforeSweep,swept,id);assert.equal(swept.campaign.daily.uses[id],3);assert.equal(swept.campaign.mastery[id+'_1'],2);await closeReward(t);
 await openResource(t,id,3);assert.equal(await(await command(t,'rotationStart',{kind:'daily',id,tier:3})).isDisabled(),true,'all tiers share three daily attempts');await shot(t,'swept-limit-'+id);await reload(t);const restored=await snapshot(t.page);assert.deepEqual(wallet(restored),wallet(swept));assert.deepEqual(restored.campaign,swept.campaign);assert.deepEqual(restored.lastBattle,swept.lastBattle);
 console.log('Resource browser battle PASS '+t.width+'x'+t.height+' '+id+': zero-food army preview/cancel, two real stable wins, exact stock receipts, positive sweep preview/cancel/confirmation, shared daily cap, isolated slot reload.');
}
async function checked(width,height,kind,run){const t=await scene(width,height,kind);try{return await run(t);}catch(e){fs.writeFileSync(new URL('failure-'+kind+'-'+width+'.html',output),await t.page.content());await t.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await t.context.close();}}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const widths=(process.env.SHUIHU_RESOURCE_WIDTHS||'').split(',').filter(Boolean).map(Number),cases=(process.env.SHUIHU_RESOURCE_CASES||'browse,battle').split(',');
 for(const [width,height] of [[320,740],[390,844],[1280,900]].filter(([w])=>!widths.length||widths.includes(w))){
  if(cases.includes('browse'))await checked(width,height,'browse',browse);
  if(cases.includes('battle'))for(const id of width===390?RESOURCE_ROUTES.map(r=>r.id):[width===320?'silver':'grain'])await checked(width,height,'battle-'+id,t=>battle(t,id));
 }
 assert.deepEqual([...moduleVersions],[d.config.release],'all browser modules use the current release cache tag');console.log('Resource browser PASS: requested viewports, isolated real SlotDatabase, version '+d.config.release+'; screenshots '+fileURLToPath(output));
}finally{await browser.close();}
