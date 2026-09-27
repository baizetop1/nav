import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture as baseFixture,d} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {freshCamp} from '../public/game/js/camp.js';
import {dispatch,newGame} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {RESOURCE_ROUTES,resourceReward} from '../public/game/js/resource-dungeons-data.js';
import {DAILY_ROUTES} from '../public/game/js/rotations.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||'playwright');
const gameURL=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html',origin=new URL(gameURL).origin;
const output=new URL('../artifacts/casualties-browser/',import.meta.url),moduleVersions=new Set(),copy=structuredClone;
fs.mkdirSync(output,{recursive:true});
function fixture(){
 let s=newGame(d,Date.now(),93054);s.camp=freshCamp();Object.assign(s.camp,{buildings:{hall:4,barracks:5,clinic:3,farm:3,lumber:3,market:3},food:50000,wood:10000,troops:1000,mode:'army',deployment:100,tactic:'balanced'});s.player.silver=50000;s.player.stamina=140;s.team=['linchong','luzhishen','songjiang'];s.battleSkillMode='auto';s.progress.flags.camp_goal_foundation=true;for(const id of s.team)s.heroes[id]={status:'owned',level:30,exp:0};
 for(let i=0;i<2;i++){s=dispatch(d,s,{type:'campRaid',id:'woods'},s.clock);for(let j=0;j<180&&!s.battle.outcome;j++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');s=dispatch(d,s,{type:'finishBattle'},s.clock);}assert.equal(s.camp.fallen,0);assert.ok(s.camp.casualtyCarry>0);return gameSnapshot(s,d);
}
const wallet=s=>({stamina:s.player.stamina,silver:s.player.silver,food:s.camp.food,wood:s.camp.wood,troops:s.camp.troops,wounded:s.camp.wounded,inventory:s.inventory,team:s.team,mode:s.camp.mode,deployment:s.camp.deployment});
const stock=s=>({silver:s.player.silver,food:s.camp.food,wood:s.camp.wood,herb:s.inventory.herb||0});
async function idle(page){await page.waitForFunction(()=>document.getElementById('app')&&!document.getElementById('app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function scene(width,height,kind){
 const state=fixture(),context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.origin!==origin||!u.pathname.includes('/game/'))return;if(r.status()>=400)errors.push('HTTP '+r.status()+' '+u.pathname);if(u.pathname.includes('/js/')&&u.pathname.endsWith('.js'))moduleVersions.add(u.searchParams.get('v')||'(unversioned)');});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 await context.addInitScript(raw=>{if(!localStorage.getItem('casualties-browser')){localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','2');localStorage.setItem('casualties-browser','1');}},JSON.stringify(state));
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
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [width,height] of [[390,844],[1280,900]]){
 const t=await scene(width,height,'casualties');try{
 await section(t,'camp','raids');const initial=await snapshot(t.page);await click(t,'campRaid',{id:'woods'});await t.page.locator('#sortie-preview[open]').waitFor();assert.deepEqual((await snapshot(t.page)).camp,initial.camp);await click(t,'ui_sortieConfirm',{},'#sortie-preview');await t.page.waitForFunction(()=>{const b=document.querySelector('.battle-end button');return b&&!b.disabled;},{},{timeout:45000});await click(t,'finishBattle');await t.page.locator('#reward-result[open]').waitFor();const after=await snapshot(t.page);assert.equal(after.lastBattle.fallen,1);assert.equal(after.camp.fallen,1);assert.equal(after.camp.troops+after.camp.wounded+after.camp.fallen,1000);assert.match(await t.page.locator('#reward-result .receipt-counts').textContent(),/阵亡\s*1/);await shot(t,'fatality-receipt');await closeReward(t);
 await section(t,'camp','troops');assert.match(await t.page.locator('#main').textContent(),/累计阵亡 1 人/);await click(t,'campHeal');await closeReward(t);const healed=await snapshot(t.page);assert.equal(healed.camp.wounded,0);assert.equal(healed.camp.troops,999);assert.equal(healed.camp.fallen,1);await shot(t,'healing-does-not-revive');const coins=healed.player.silver,food=healed.camp.food;await click(t,'campRecruit',{amount:100});await closeReward(t);const recruited=await snapshot(t.page);assert.equal(recruited.camp.troops,1000);assert.equal(recruited.player.silver,coins-3);assert.equal(recruited.camp.food,food-2);assert.equal(recruited.camp.fallen,1);assert.equal(recruited.camp.casualtyCarry,after.camp.casualtyCarry);await t.page.reload();await t.page.locator('#main').waitFor();await idle(t.page);assert.deepEqual((await snapshot(t.page)).camp,recruited.camp);await fit(t);console.log('Casualty browser PASS '+width+': actual third victory has one fatality, receipt visible, healing leaves vacancy, paid replacement, carry survives reload.');
 }finally{await t.context.close();}}
 assert.deepEqual([...moduleVersions],[d.config.release]);
}finally{await browser.close();}
