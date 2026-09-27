import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {d,fixture as baseFixture,act,travel,story,fight,ready} from './shuihu-volume-seven-selfcheck.mjs';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const origin=new URL(gameURL).origin,output=new URL('../artifacts/volume-seven-browser/',import.meta.url),moduleVersions=new Set();
fs.mkdirSync(output,{recursive:true});
function fixture(kind='start'){
 let s=baseFixture();
 if(kind==='prepare'){s=travel(s,'v7_camp');s=story(s,'v7_report');s=travel(s,'v7_watch');s=story(s,'v7_scout');s=fight(s,'v7_probe');s=travel(s,'v7_forge');}
 if(kind==='support')s=travel(ready('hook'),'v7_road');
 if(kind==='ending'){s=ready('hook');s=fight(s,'v7_break');s=fight(s,'v7_final');s=travel(s,'v7_camp');}
 if(['low-level','low-stamina','low-food','low-hall','no-team','no-troops'].includes(kind)){s=ready('hook');s=travel(s,'v7_field');if(kind==='low-level')for(const id of s.team)s.heroes[id].level=35;if(kind==='low-stamina')s.player.stamina=0;if(kind==='low-food')s.camp.food=0;if(kind==='low-hall')s.camp.buildings.hall=3;if(kind==='no-team')s.team=[];if(kind==='no-troops'){s.camp.troops=0;s.camp.wounded=0;}}
 s.clock=Date.now();s.lastRegen=s.clock;s.progress.flags.camp_goal_foundation=true;s=act(s,'refresh');
 const clean=gameSnapshot(s,d),restored=importSave(exportSave(clean,{id:1,name:'第七卷浏览器回归'},d),d).state;
 assert.deepEqual(restored,clean,'browser fixture portable validation');return restored;
}
function wallet(s){return {stamina:s.player.stamina,silver:s.player.silver,food:s.camp.food,troops:s.camp.troops,wounded:s.camp.wounded,inventory:s.inventory,team:s.team,mode:s.camp.mode,deployment:s.camp.deployment};}
async function idle(page){await page.waitForFunction(()=>document.getElementById('app')&&!document.getElementById('app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function scene(width,height,kind='start'){
 const state=fixture(kind),context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const u=new URL(r.url());if(u.origin!==origin||!u.pathname.includes('/game/'))return;if(r.status()>=400)errors.push('HTTP '+r.status()+' '+u.pathname);if(u.pathname.includes('/js/')&&u.pathname.endsWith('.js'))moduleVersions.add(u.searchParams.get('v')||'(unversioned)');});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 await context.addInitScript(raw=>{if(!localStorage.getItem('volume-seven-browser')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','2');localStorage.setItem('volume-seven-browser','1');}},JSON.stringify(state));
 await page.clock.setFixedTime(state.clock);await page.goto(gameURL);await page.locator('#main').waitFor();await idle(page);assert.deepEqual(errors,[],'initial loading');
 return {context,page,errors,width,height,kind,state};
}
async function snapshot(page){return page.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});}
async function command(t,type,extra={},scope='#main'){
 const buttons=t.page.locator(scope+' button[data-command]'),index=await buttons.evaluateAll((els,{type,extra})=>els.findIndex(e=>{const c=JSON.parse(e.dataset.command);return c.type===type&&Object.entries(extra).every(([k,v])=>c[k]===v);}),{type,extra});
 assert.ok(index>=0,'missing '+type+' '+JSON.stringify(extra));return buttons.nth(index);
}
async function reach(t,el){
 await el.waitFor({state:'attached'});
 const folds=await el.evaluate(e=>{const list=[];for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!(e.tagName==='SUMMARY'&&p===e.parentElement))list.push(p.dataset.fold);return list.reverse();});
 for(const fold of folds){assert.ok(fold,'stable disclosure');const summary=t.page.locator('[data-fold="'+fold+'"] > summary');await reach(t,summary);await summary.click();await idle(t.page);}
 const host=await el.evaluate(e=>e.closest('dialog')?'#'+e.closest('dialog').id+' .dialog-body':'#main'),pager=t.page.locator(host+' > .screen-pager'),jump=pager.locator('input');
 if(await jump.count()){await jump.fill('1');await jump.press('Enter');}
 for(let n=0;n<100;n++){
  const box=await el.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,inside:r.width>0&&r.height>0&&(!w||r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1)};});
  if(box.inside){if(t.width>900)await el.scrollIntoViewIfNeeded();return;}
  const next=pager.locator('[data-screen-next]');if(!await next.count()||await next.isDisabled())throw Error('Unreachable '+await el.textContent()+' '+JSON.stringify(box));await next.click();await idle(t.page);
 }throw Error('Page limit reaching '+await el.textContent());
}
async function click(t,type,extra={},scope='#main'){const el=await command(t,type,extra,scope);await reach(t,el);assert.equal(await el.isDisabled(),false,type+' enabled');await el.click();await idle(t.page);assert.deepEqual(t.errors,[],type);}
async function fit(t){
 await idle(t.page);const m=await t.page.locator('#main').evaluate(e=>({mainY:e.scrollHeight-e.clientHeight,mainX:e.scrollWidth-e.clientWidth,documentY:document.documentElement.scrollHeight-innerHeight,documentX:document.documentElement.scrollWidth-innerWidth}));
 assert.ok(m.documentX<=1,'horizontal document overflow '+JSON.stringify(m));
 if(t.width<=900)assert.ok(m.documentY<=1&&m.mainY<=1&&m.mainX<=1,'mobile document must paginate '+JSON.stringify(m));
 for(const dialog of await t.page.locator('dialog[open]').all())assert.ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1&&e.scrollHeight<=e.clientHeight+1;}),'dialog overflow');
 assert.deepEqual(t.errors,[]);
}
async function shot(t,name){await fit(t);await t.page.screenshot({path:fileURLToPath(new URL(name+'-'+t.width+'x'+t.height+'.png',output))});}
async function nav(t,view){await t.page.locator('button[data-view="'+view+'"]:visible').first().click();await idle(t.page);await fit(t);}
async function reload(t){await t.page.reload();await t.page.locator('#main').waitFor();await idle(t.page);assert.deepEqual(t.errors,[]);}
async function resume(t){await nav(t,'camp');await click(t,'ui_storyResume');await fit(t);}
async function verifyProse(t){
 const paragraphs=t.page.locator('.journey-story > .card .prose');if(!await paragraphs.count())return;
 const jump=t.page.locator('#main > .screen-pager input'),count=await jump.count()?Number(await jump.getAttribute('max')):1,seen=new Set();let required=[];
 for(let n=1;n<=count;n++){
  if(await jump.count()){await jump.fill(String(n));await jump.press('Enter');await idle(t.page);}
  const result=await paragraphs.evaluateAll(elements=>{
   const host=document.querySelector('#main'),windowBox=(host.querySelector('.screen-window')||host).getBoundingClientRect(),inside=r=>r.width>0&&r.height>0&&r.left>=windowBox.left-1&&r.right<=windowBox.right+1&&r.top>=windowBox.top-1&&r.bottom<=windowBox.bottom+1;
   let index=0;const required=[],visible=[];
   for(const e of elements){const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())for(let offset=0;offset<node.length;offset++,index++){if(/\s/.test(node.data[offset]))continue;required.push(index);const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+1);if(inside(range.getBoundingClientRect()))visible.push(index);}}
   return {required,visible};
  });
  required=result.required;for(const index of result.visible)seen.add(index);await fit(t);
 }
 assert.ok(required.every(index=>seen.has(index)),'every narrative character is readable on a content page');
 if(await jump.count()){await jump.fill('1');await jump.press('Enter');await idle(t.page);}
}

async function startStory(t,id){const s=await snapshot(t.page);assert.equal(s.location,d.by.stories[id].map);if(!s.progress.stories[id])await click(t,'story',{id});await fit(t);}
async function closeReward(t){const close=t.page.locator('#reward-result[open] [data-reward-close]');if(await close.count()){await reach(t,close);await close.click();await idle(t.page);}}
async function choose(t,id,choice='finish'){await startStory(t,id);await click(t,'story',{id,choice});await closeReward(t);await fit(t);}
async function previewCancel(t,id){
 await startStory(t,id);const before=await snapshot(t.page);await click(t,'chapterBattle',{id,choice:'fight'});await t.page.locator('#sortie-preview[open]').waitFor();assert.deepEqual(wallet(await snapshot(t.page)),wallet(before),'preview does not debit');
 await shot(t,'preview-'+id);await click(t,'ui_sortieCancel',{},'#sortie-preview');assert.deepEqual(wallet(await snapshot(t.page)),wallet(before),'cancel does not debit or alter setup');assert.equal(await t.page.locator('#sortie-preview[open]').count(),0);
}
async function waitBattle(t,id){
 for(let retries=0;retries<12;retries++){
  await t.page.waitForFunction(()=>{const end=document.querySelector('.battle-end button');if(end&&!end.disabled)return true;return [...document.querySelectorAll('button[data-command]')].some(e=>JSON.parse(e.dataset.command).type==='ui_battlePause'&&e.textContent.includes('继续'));},{},{timeout:60000});
  if(await t.page.locator('.battle-end button:enabled').count())return;
  const hint=await t.page.locator('.battle-hint').textContent();assert.match(hint,/接续原战局|浏览器刚才中断|切到后台/,'unexpected battle pause');
  console.log('Resuming '+id+': '+hint);await t.page.bringToFront();await click(t,'ui_battlePause');
 }throw Error('Repeated browser interruption during '+id);
}

async function battle(t,id,activeReload=false){
 await startStory(t,id);const before=await snapshot(t.page);await click(t,'chapterBattle',{id,choice:'fight'});await t.page.locator('#sortie-preview[open]').waitFor();await click(t,'ui_sortieConfirm',{},'#sortie-preview');let s=await snapshot(t.page);assert.equal(s.battle.context.id,id);assert.ok(s.player.stamina<before.player.stamina,'start charges stamina');assert.ok(s.camp.food<before.camp.food,'start charges food');
 if(activeReload){await reload(t);assert.equal((await snapshot(t.page)).battle.context.id,id,'active battle survives reload');}
 const pause=await command(t,'ui_battlePause');if((await pause.innerText()).includes('继续'))await click(t,'ui_battlePause');await click(t,'ui_battleSpeed',{speed:2});
 await waitBattle(t,id);await fit(t);await click(t,'finishBattle');await t.page.locator('#reward-result[open]').waitFor();s=await snapshot(t.page);assert.equal(s.lastBattle.outcome,'victory',id+' real battle victory');assert.equal(s.progress.stories[id].step,'settle');assert.notEqual(s.progress.stories[id].status,'completed','battle receipt does not skip story confirmation');
 await shot(t,'reward-'+id);const next=t.page.locator('#reward-result [data-reward-command]');assert.equal(await next.count(),1,'receipt offers next step');await reach(t,next);await next.click();await idle(t.page);assert.equal(await t.page.locator('#reward-result[open]').count(),0);
 await click(t,'story',{id,choice:'finish'});const materialNext=t.page.locator('#reward-result[open] [data-reward-command]');if(await materialNext.count()){assert.equal(JSON.parse(await materialNext.getAttribute('data-reward-command')).type,'ui_storyResume','story material receipt continues mainline');await reach(t,materialNext);await materialNext.click();await idle(t.page);}else await closeReward(t);assert.equal((await snapshot(t.page)).progress.stories[id].status,'completed','confirmation completes mission');await fit(t);
}
async function confirmPreparation(t,branch){
 const before=await snapshot(t.page);
 for(const accept of [false,true]){
  const dialogEvent=t.page.waitForEvent('dialog'),pending=click(t,'story',{id:'v7_prepare',choice:branch}),dialog=await dialogEvent,message=dialog.message();
  if(accept)await dialog.accept();else await dialog.dismiss();await pending;
  assert.equal(dialog.type(),'confirm');assert.ok(message.startsWith(d.by.stories.v7_prepare.steps.start.choices.find(c=>c.id===branch).label),'confirmation includes paid choice');
  assert.match(message,/本卷只能选一次.*不能更换/,'confirmation explains permanence');assert.match(message,branch==='hook'?/防御降低 25%/:/攻击降低 20%.*速度降低 15%/,'confirmation includes branch effect');
  if(!accept){const after=await snapshot(t.page);assert.deepEqual(wallet(after),wallet(before),'dismissing preparation does not debit');assert.deepEqual(after.progress,before.progress,'dismissing preparation preserves story and choices');await fit(t);}
 }
}

async function runOpening(t,branch){
 await nav(t,'camp');const mainline=await command(t,'ui_storyResume');if(t.width<=900)assert.ok(await mainline.evaluate(e=>{const r=e.getBoundingClientRect(),w=e.closest('.screen-window')?.getBoundingClientRect();return r.width>0&&r.height>0&&(!w||r.top>=w.top-1&&r.bottom<=w.bottom+1);}), 'current mainline action is visible on the first mobile page');await reach(t,mainline);await shot(t,'mainline-start');
 await click(t,'ui_storyResume');assert.equal((await snapshot(t.page)).location,'v7_camp');await startStory(t,'v7_report');await verifyProse(t);await shot(t,'report-active');
 const active=(await snapshot(t.page)).progress.stories.v7_report;await nav(t,'heroes');await reload(t);await resume(t);assert.deepEqual((await snapshot(t.page)).progress.stories.v7_report,active,'navigation and reload preserve active story');await click(t,'story',{id:'v7_report',choice:'finish'});await closeReward(t);
 await resume(t);await choose(t,'v7_scout');await resume(t);await previewCancel(t,'v7_probe');await battle(t,'v7_probe',true);
 await resume(t);await startStory(t,'v7_prepare');await verifyProse(t);for(const choice of ['hook','trench'])await reach(t,await command(t,'story',{id:'v7_prepare',choice}));await shot(t,'counterplan-choices');
 const before=await snapshot(t.page);await confirmPreparation(t,branch);await closeReward(t);const prepared=await snapshot(t.page);
 assert.equal(prepared.progress.flags.v7_prepared,true);assert.equal(prepared.progress.flags['v7_'+branch],true);assert.equal(prepared.progress.flags['v7_'+(branch==='hook'?'trench':'hook')],undefined,'preparation branches remain exclusive');
 if(branch==='hook'){assert.equal(prepared.inventory.iron,before.inventory.iron-8);assert.equal(prepared.player.silver,before.player.silver-120);}else{assert.equal(prepared.inventory.wood,before.inventory.wood-8);assert.equal(prepared.inventory.cloth,before.inventory.cloth-8);}
 await reload(t);await resume(t);assert.equal((await snapshot(t.page)).progress.flags['v7_'+branch],true,'selected branch persists');await previewCancel(t,'v7_break');await shot(t,'prepared-'+branch);
 await battle(t,'v7_break');await resume(t);await battle(t,'v7_final');await runEnding(t);
 console.log('Volume seven opening PASS '+t.width+'x'+t.height+' '+branch+': real complete mandatory route, navigation/reload resume, battle reload and receipt continuation, paid exclusive preparation, preview/cancel purity, pager reachability.');
}
async function runOtherBranch(t,branch){
 await resume(t);await startStory(t,'v7_prepare');const before=await snapshot(t.page);await confirmPreparation(t,branch);await closeReward(t);const s=await snapshot(t.page);assert.equal(s.progress.flags['v7_'+branch],true);assert.equal(s.progress.flags['v7_'+(branch==='hook'?'trench':'hook')],undefined);
 if(branch==='hook'){assert.equal(s.inventory.iron,before.inventory.iron-8);assert.equal(s.player.silver,before.player.silver-120);}else{assert.equal(s.inventory.wood,before.inventory.wood-8);assert.equal(s.inventory.cloth,before.inventory.cloth-8);}
 await reload(t);await resume(t);await previewCancel(t,'v7_break');await shot(t,'prepared-'+branch);
 console.log('Volume seven alternative preparation PASS '+t.width+'x'+t.height+' '+branch+'.');
}
async function runEnding(t){
 await resume(t);await startStory(t,'v7_settle');await verifyProse(t);await shot(t,'ending-story');const before=await snapshot(t.page);await click(t,'story',{id:'v7_settle',choice:'finish'});await t.page.locator('#reward-result[open]').waitFor();const done=await snapshot(t.page);assert.equal(done.progress.flags.volume_seven_complete,true);assert.equal(done.inventory.recruit_order,(before.inventory.recruit_order||0)+4);assert.equal(JSON.parse(await t.page.locator('#reward-result [data-reward-command]').getAttribute('data-reward-command')).type,'ui_storyResume','completed chapter receipt continues into volume eight');await shot(t,'chapter-reward');
 await closeReward(t);await nav(t,'camp');assert.match(await t.page.locator('#main').textContent(),/城外定先后/);assert.doesNotMatch(await t.page.locator('#main').textContent(),/尚未开放/);await shot(t,'chapter-complete');
 await nav(t,'chronicle');const plan=t.page.locator('[data-fold="mainline-plan"]');await reach(t,plan.locator('summary'));if(await plan.getAttribute('open')===null)await plan.locator('summary').click();await idle(t.page);assert.equal(await plan.getAttribute('open'),'');assert.match(await plan.textContent(),/主线已开放至第十二卷/);await shot(t,'remaining-chapters');await plan.locator('summary').click();await idle(t.page);assert.equal(await plan.getAttribute('open'),null,'chapter catalogue can close');
 await nav(t,'bag');await nav(t,'camp');await reload(t);await nav(t,'camp');const reloaded=await snapshot(t.page);assert.equal(reloaded.progress.flags.volume_seven_complete,true);assert.deepEqual(reloaded.inventory,done.inventory,'chapter reward cannot duplicate on navigation or reload');assert.match(await t.page.locator('#main').textContent(),/城外定先后/);await fit(t);
 console.log('Volume seven ending PASS '+t.width+'x'+t.height+': chapter claimed once, next objective is volume eight, real chapter catalogue closes and reload preserves progress.');
}
async function runSupport(t){
 await nav(t,'map');await battle(t,'v7_cut');const s=await snapshot(t.page);assert.equal(s.progress.flags.v7_aid_cut,true,'optional support confirms its own victory');assert.equal(s.progress.flags.v7_break_done,undefined,'optional victory does not skip the mandatory battle');await reload(t);await resume(t);assert.equal((await snapshot(t.page)).location,'v7_field');await shot(t,'optional-support-complete');console.log('Volume seven optional support PASS: real win returns to its own confirmation, material reward continues mandatory mainline, aid flag persists.');
}

async function runGate(t){
 await nav(t,'camp');const text=await t.page.locator('#main').textContent();const expected={'low-level':/36\s*级/,'low-stamina':/体力/,'low-food':/粮草/,'low-hall':/4\s*级/,'no-team':/安排出阵好汉/,'no-troops':/兵力/}[t.kind];assert.match(text,expected,'shortage is described in current goal');await click(t,'ui_storyResume');
 const target={'low-level':'heroes:training','low-stamina':'bag:supplies','low-food':'camp:duties','low-hall':'camp:buildings','no-team':'heroes:formation','no-troops':'camp:formation'}[t.kind];assert.ok(await t.page.locator('[data-page-section^="'+target+'"]').count(),'shortage leads to a useful page: '+target);await shot(t,t.kind);console.log('Volume seven resource gate PASS '+t.kind+'.');
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const widths=(process.env.SHUIHU_VOLUME_SEVEN_WIDTHS||'').split(',').filter(Boolean).map(Number),sizes=[[320,568],[390,844],[1280,900]].filter(([w])=>!widths.length||widths.includes(w));
 const kinds=(process.env.SHUIHU_VOLUME_SEVEN_CASES||'start,prepare,ending,gates,support').split(',');
 for(const [width,height] of sizes){
  const branch=width===1280?'trench':'hook';
  for(const kind of ['start','prepare','ending'].filter(k=>kinds.includes(k))){console.log('Volume seven checking '+kind+' '+width+'x'+height);const t=await scene(width,height,kind);try{if(kind==='start')await runOpening(t,branch);else if(kind==='prepare')await runOtherBranch(t,branch==='hook'?'trench':'hook');else await runEnding(t);}catch(e){await t.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await t.context.close();}}
  if(width===390&&kinds.includes('support')){const t=await scene(width,height,'support');try{await runSupport(t);}catch(e){await t.page.screenshot({path:fileURLToPath(new URL('failure-support-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await t.context.close();}}
  if(width===390&&kinds.includes('gates'))for(const kind of ['low-level','low-stamina','low-food','low-hall','no-team','no-troops']){const t=await scene(width,height,kind);try{await runGate(t);}catch(e){await t.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await t.context.close();}}
 }
 console.log('Volume seven module cache tags: '+[...moduleVersions].sort().join(', '));
 console.log('Volume seven browser PASS.');
}finally{await browser.close();}

