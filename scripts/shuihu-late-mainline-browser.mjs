import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {d,lateFixture,act,travel,story,fight,finishEight,finishNine,finishTen,prepareEleven,beginFight,resupply} from './shuihu-late-mainline-selfcheck.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {LATE_MISSIONS,ENDING_DEFINITIONS} from '../public/game/js/late-mainline-data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
const origin=new URL(gameURL).origin,output=new URL('../artifacts/late-mainline-browser/',import.meta.url),moduleVersions=new Set();
fs.mkdirSync(output,{recursive:true});
const copy=structuredClone,base=lateFixture(),eighth=finishEight(copy(base)),ninth=finishNine(copy(eighth)),tenth=finishTen(copy(ninth)),council=resupply(prepareEleven(copy(tenth)),'v12_stay_first');
let escort=beginFight(story(copy(ninth),'v10_report'),'v10_escort');
let laterWave=copy(escort);laterWave=act(laterWave,'battleOrder',{kind:'focus',target:laterWave.battle.enemy.find(u=>u.model==='v10_raider_archer').id});laterWave=act(laterWave,'battleOrder',{kind:'stance',value:'guard'});
for(let n=0;n<180&&!laterWave.battle.outcome&&laterWave.battle.mainline.wave===0;n++)advanceBattle(laterWave,d,1000);
assert.equal(laterWave.battle.mainline.wave,1);assert.equal(laterWave.battle.outcome,null);
function fixture(input){const s=copy(input);s.clock=Math.max(Date.now(),s.clock);s.lastRegen=s.clock;s.progress.flags.camp_goal_foundation=true;const clean=gameSnapshot(act(s,'refresh'),d),restored=importSave(exportSave(clean,{id:1,name:'后五卷浏览器回归'},d),d).state;assert.deepEqual(restored,clean);return restored;}
async function scene(width,height,input,kind){
 const state=fixture(input),context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.origin!==origin||!u.pathname.includes('/game/'))return;if(r.status()>=400)errors.push('HTTP '+r.status()+' '+u.pathname);if(u.pathname.includes('/js/')&&u.pathname.endsWith('.js'))moduleVersions.add(u.searchParams.get('v')||'(unversioned)');});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 await context.addInitScript(raw=>{if(!localStorage.getItem('late-mainline-browser')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','2');localStorage.setItem('late-mainline-browser','1');}},JSON.stringify(state));
 await page.clock.setFixedTime(state.clock);await page.goto(gameURL);await page.locator('.viewport-shell').waitFor();await page.locator('#main').waitFor();await idle(page);assert.deepEqual(errors,[],'initial loading');return {context,page,errors,width,height,kind,state};
}
function wallet(s){return {stamina:s.player.stamina,silver:s.player.silver,food:s.camp.food,troops:s.camp.troops,wounded:s.camp.wounded,inventory:s.inventory,team:s.team,mode:s.camp.mode,deployment:s.camp.deployment};}
async function idle(page){await page.waitForFunction(()=>document.getElementById('app')&&!document.getElementById('app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function snapshot(page){return page.evaluate(async version=>{const {SlotDatabase}=await import('./js/slots.js?v='+version);const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}},d.config.release);}
async function command(t,type,extra={},scope='#main'){
 const buttons=t.page.locator(scope+' button[data-command]'),jump=t.page.locator('#main > .screen-pager input'),pages=await jump.count()?Number(await jump.getAttribute('max')):1;
 for(let page=0;page<=pages;page++){
  if(page&&await jump.count()){await jump.fill(String(page));await jump.press('Enter');await idle(t.page);}
  const index=await buttons.evaluateAll((els,{type,extra})=>els.findIndex(e=>{const c=JSON.parse(e.dataset.command);return c.type===type&&Object.entries(extra).every(([k,v])=>c[k]===v);}),{type,extra});
  if(index>=0)return buttons.nth(index);
 }
 assert.fail('missing '+type+' '+JSON.stringify(extra));
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
async function reload(t){await t.page.reload();await t.page.locator('.viewport-shell').waitFor();await t.page.locator('#main').waitFor();await idle(t.page);assert.deepEqual(t.errors,[]);}
async function resume(t){await nav(t,'camp');await click(t,'ui_storyResume');await fit(t);}
async function verifyProse(t,paragraphs=t.page.locator('.journey-story > .card .prose')){
 if(!await paragraphs.count())return;
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


async function closeReward(t){const close=t.page.locator('#reward-result[open] [data-reward-close]');if(await close.count()){await reach(t,close);await close.click();await idle(t.page);}}
async function startStory(t,id){assert.equal((await snapshot(t.page)).location,d.by.stories[id].map);if(!(await snapshot(t.page)).progress.stories[id])await click(t,'story',{id});await fit(t);}
async function choose(t,id,choice){await startStory(t,id);await click(t,'story',{id,choice});await closeReward(t);await fit(t);}
async function confirmChoice(t,id,choice){
 const before=await snapshot(t.page);
 for(const accept of [false,true]){
  const dialogEvent=t.page.waitForEvent('dialog'),pending=click(t,'story',{id,choice}),dialog=await dialogEvent;
  assert.equal(dialog.type(),'confirm');assert.match(dialog.message(),/确认|选择|路线|不能/);
  if(accept)await dialog.accept();else await dialog.dismiss();await pending;
  if(!accept){const after=await snapshot(t.page);assert.deepEqual(wallet(after),wallet(before),'cancel preserves wallet');assert.deepEqual(after.progress,before.progress,'cancel preserves route and story');await fit(t);}
 }
 await closeReward(t);await fit(t);
}
async function opening(t){
 await nav(t,'camp');assert.match(await t.page.locator('#main').textContent(),/第八卷|第\s*8\s*卷|曾头疑云/);
 await resume(t);await startStory(t,'v8_choose');await verifyProse(t);await shot(t,'v8-priority-before');await confirmChoice(t,'v8_choose','rescue');
 let s=await snapshot(t.page);assert.equal(s.progress.flags.v8_priority_rescue,true);assert.equal(s.progress.flags.v8_priority_evidence,undefined);assert.equal(s.progress.flags.v8_priority_supply,undefined);
 await reload(t);await resume(t);s=await snapshot(t.page);assert.equal(s.location,'v8_barn');assert.equal(s.progress.flags.v8_priority_rescue,true);await shot(t,'v8-priority-after');
 console.log('Late browser opening PASS '+t.width+': cancel purity, exclusive priority, next mission and reload.');
}
async function battleStatus(t,wave){
 const status=t.page.locator('.late-battle-status');assert.equal(await status.count(),1,'dedicated late battle status');
 const text=await status.textContent();assert.match(text,/护送|完整度/);assert.match(text,/波|增援/);assert.match(text,new RegExp(String(wave+1)+'\\s*[/／]\\s*3'));
 const before=await snapshot(t.page);assert.equal(before.battle.mainline.wave,wave);assert.ok(before.battle.mainline.escort.hp>0);
 const source=LATE_MISSIONS[before.battle.context.id].escort.source,target=before.battle.enemy.find(u=>u.hp>0&&u.model===source);assert.ok(target,'living escort attacker');
 await click(t,'battleOrder',{kind:'focus',target:target.id},'.late-battle-status');assert.equal((await snapshot(t.page)).battle.orders.focus,target.id,'focus uses visible battle command');
 const saved=await snapshot(t.page);await shot(t,'escort-wave-'+(wave+1));await reload(t);assert.deepEqual((await snapshot(t.page)).battle.mainline,saved.battle.mainline,'wave and escort survive reload');assert.equal((await snapshot(t.page)).battle.orders.focus,target.id,'focus survives reload');await fit(t);
 console.log('Late browser battle PASS '+t.width+': wave '+(wave+1)+', escort, focus and reload.');
}
async function sortieEntry(t){
 await resume(t);await startStory(t,'v8_rescue');const before=await snapshot(t.page);
 await click(t,'chapterBattle',{id:'v8_rescue',choice:'fight'});await t.page.locator('#sortie-preview[open]').waitFor();
 assert.match(await t.page.locator('#sortie-panel-overview').textContent(),/护送完整度/);assert.deepEqual(wallet(await snapshot(t.page)),wallet(before),'preview does not debit');
 await t.page.locator('#sortie-preview [data-dialog-tab="intel"]').click();await idle(t.page);
 const intel=await t.page.locator('#sortie-preview .late-mission-intel').textContent();assert.match(intel,/受伤商旅/);assert.match(intel,/完整度\s*100/);assert.match(intel,/每\s*4\s*秒损失\s*12/);assert.match(intel,/集火|眩晕/);await shot(t,'sortie-v8-rescue-intel');
 await click(t,'ui_sortieCancel',{},'#sortie-preview');const cancelled=await snapshot(t.page);assert.deepEqual(wallet(cancelled),wallet(before),'cancel preserves resources');assert.deepEqual(cancelled.progress,before.progress);assert.equal(cancelled.battle,null);
 await click(t,'chapterBattle',{id:'v8_rescue',choice:'fight'});await t.page.locator('#sortie-preview[open]').waitFor();await click(t,'ui_sortieConfirm',{},'#sortie-preview');
 const pause=await command(t,'ui_battlePause');if(!(await pause.innerText()).includes('继续'))await click(t,'ui_battlePause');
 const started=await snapshot(t.page);assert.equal(started.battle.context.id,'v8_rescue');assert.equal(started.battle.mainline.version,1);assert.equal(started.battle.mainline.wave,0);assert.ok(started.battle.mainline.escort.hp>0);assert.equal(started.player.stamina,before.player.stamina-12);assert.ok(started.camp.food<before.camp.food);await shot(t,'sortie-v8-rescue-started');
 console.log('Late browser sortie PASS '+t.width+': story battle entry, overview/intel escort rules, cancel purity and confirmed mainline battle.');
}
async function readEnding(t,route){
 await click(t,'ui_storyResume');const section=t.page.locator('section.complete').filter({has:t.page.locator('h2',{hasText:/^第12卷/})}),paragraphs=section.locator(':scope > .prose');
 assert.equal(await section.count(),1,'current twelfth chapter appears in chronicle');assert.ok(await paragraphs.count()>0,'detailed ending is present');
 const normalized=text=>text.replace(/\s/g,'');assert.equal(normalized((await paragraphs.allTextContents()).join('')),normalized(ENDING_DEFINITIONS[route].text),'chronicle exactly reprints the achieved ending');
 if(t.width<=900)await verifyProse(t,paragraphs);
 else for(const paragraph of await paragraphs.all()){await paragraph.scrollIntoViewIfNeeded();assert.ok(await paragraph.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1;}),'each ending paragraph can be scrolled fully into view');}
 await reach(t,paragraphs.first());await shot(t,'ending-reread-'+route);
 console.log('Late browser reread PASS '+t.width+' '+route+': exact ending text and every narrative character readable.');
}
async function routeChoice(t,ending){
 const decision=ending==='return'?'charter':'homeland';await resume(t);await startStory(t,'v11_reply');await verifyProse(t);await choose(t,'v11_reply',decision);
 assert.equal((await snapshot(t.page)).progress.flags.v11_decided,undefined,'reading a reply does not commit it');await choose(t,'v11_reply','back');assert.equal((await snapshot(t.page)).progress.flags.v11_decided,undefined);
 await choose(t,'v11_reply',decision);await confirmChoice(t,'v11_reply','confirm_'+decision);assert.equal((await snapshot(t.page)).progress.flags.volume_eleven_complete,true);
 await reload(t);await resume(t);await startStory(t,'v12_choose');await verifyProse(t);await choose(t,'v12_choose',ending);assert.equal((await snapshot(t.page)).progress.flags.v12_chosen,undefined,'reading an ending does not choose it');
 await choose(t,'v12_choose','back');await choose(t,'v12_choose',ending);await confirmChoice(t,'v12_choose','confirm');
 let s=await snapshot(t.page);assert.equal(s.progress.flags['v11_'+decision],true);assert.equal(s.progress.flags['v12_'+ending],true);assert.equal(['stay','sea','return'].filter(id=>s.progress.flags['v12_'+id]).length,1);
 await reload(t);await resume(t);s=await snapshot(t.page);assert.equal(s.location,'v12_'+ending+'_first_site','guide reaches chosen finale');await shot(t,'ending-route-'+ending);return s;
}
async function ending(t,route){
 await resume(t);await startStory(t,'v12_epilogue');await choose(t,'v12_epilogue','read_'+route);await verifyProse(t);await shot(t,'ending-prose-'+route);
 const before=await snapshot(t.page);await choose(t,'v12_epilogue','finish');let s=await snapshot(t.page);
 assert.equal(s.progress.flags.volume_twelve_complete,true);assert.equal(s.progress.flags['v12_ending_'+route],true);assert.equal(s.inventory.recruit_order,(before.inventory.recruit_order||0)+2,'chapter reward once');
 await nav(t,'camp');const text=await t.page.locator('#main').textContent();assert.match(text,/十二卷|第12卷|主线.*完结|主线.*完成/);assert.doesNotMatch(text,/尚未开放/);await shot(t,'ending-complete-'+route);
 const stable={flags:copy(s.progress.flags),stories:copy(s.progress.stories),inventory:copy(s.inventory),heroes:copy(s.heroes),growth:copy(s.growth)};
 await nav(t,'bag');await nav(t,'camp');await reload(t);await nav(t,'camp');s=await snapshot(t.page);assert.deepEqual({flags:s.progress.flags,stories:s.progress.stories,inventory:s.inventory,heroes:s.heroes,growth:s.growth},stable,'ending and cultivation survive navigation/reload without duplicate reward');assert.doesNotMatch(await t.page.locator('#main').textContent(),/尚未开放/);await fit(t);
 await readEnding(t,route);assert.deepEqual((await snapshot(t.page)).inventory,stable.inventory,'rereading does not grant rewards');
 console.log('Late browser ending PASS '+t.width+' '+route+': actual decision, route guide, ending, reward once and reload.');
}
async function checked(width,height,input,kind,run){const t=await scene(width,height,input,kind);try{return await run(t);}catch(e){fs.writeFileSync(new URL('failure-'+kind+'-'+width+'.html',output),await t.page.content());await t.page.screenshot({path:fileURLToPath(new URL('failure-'+kind+'-'+width+'.png',output))}).catch(()=>{});throw e;}finally{await t.context.close();}}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const widths=(process.env.SHUIHU_LATE_WIDTHS||'').split(',').filter(Boolean).map(Number),cases=(process.env.SHUIHU_LATE_CASES||'opening,battle,ending,sortie').split(',');
 for(const [width,height,route] of [[320,568,'stay'],[390,844,'sea'],[1280,900,'return']].filter(([w])=>!widths.length||widths.includes(w))){
  if(cases.includes('opening'))await checked(width,height,base,'opening',opening);
  if(width===390&&cases.includes('sortie'))await checked(width,height,story(copy(base),'v8_choose','rescue'),'sortie-entry',sortieEntry);
  if(cases.includes('battle')){await checked(width,height,escort,'escort-first',t=>battleStatus(t,0));await checked(width,height,laterWave,'escort-second',t=>battleStatus(t,1));}
  if(cases.includes('ending')){let selected=await checked(width,height,council,'decision-'+route,t=>routeChoice(t,route));for(const stage of ['first','second','third'])selected=fight(selected,'v12_'+route+'_'+stage);await checked(width,height,selected,'ending-'+route,t=>ending(t,route));}
 }
 assert.equal(d.config.release,'0.52.0');assert.deepEqual([...moduleVersions].sort(),['0.52.0'],'all loaded game modules use the current cache version');
 console.log('Late browser module cache tags: '+[...moduleVersions].sort().join(', '));console.log('Late mainline browser PASS: cases '+cases.join(', ')+'; widths '+(widths.length?widths.join(', '):'320, 390, 1280')+'; current module cache version verified.');
}finally{await browser.close();}
