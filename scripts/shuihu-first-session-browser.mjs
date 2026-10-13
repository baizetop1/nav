import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {d,auditFirstSession} from './shuihu-first-session-selfcheck.mjs';
import {firstSessionGoal} from '../public/game/js/first-session.js';
const {chromium}=createRequire(import.meta.url)(process.env.SHUIHU_PLAYWRIGHT_PATH||path.resolve('artifacts/browser-tools/node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:process.env.SHUIHU_BROWSER_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1067/chrome-win/chrome.exe')});
let c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message);});await c.route('https://save.baizeone.top/**',r=>r.abort());await p.clock.setFixedTime(Date.parse('2026-10-11T04:00:00Z'));
const idle=()=>p.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
const snap=()=>p.evaluate(async()=>{const {SlotDatabase}=await import('./js/slots.js');const db=await SlotDatabase.open(indexedDB);try{return JSON.parse((await db.read(1)).raw);}finally{db.db.close();}});
async function cmd(type,extra={}){const encoded=await p.locator('button[data-command]').evaluateAll((els,{type,extra})=>{const a=els.find(e=>{const a=JSON.parse(e.dataset.command);return a.type===type&&Object.entries(extra).every(([k,v])=>a[k]===v)&&e.getBoundingClientRect().width>0;});return a?.dataset.command;},{type,extra});assert.ok(encoded,'missing '+type+' '+JSON.stringify(extra));const b=p.locator('button[data-command='+JSON.stringify(encoded)+']:visible').first();await b.evaluate(e=>e.focus({preventScroll:true}));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await b.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),'control outside viewport '+type);await b.click({timeout:5000});await idle();}
async function close(){if(await p.locator('#recruit-result[open]').count()){const close=p.locator('#recruit-result .dialog-footer [data-result-action=close]');await (await close.count()?close.first():p.locator('#recruit-result [data-result-action=close]').first()).click();await idle();}if(await p.locator('#reward-result[open]').count()){await p.locator('[data-reward-close]').last().click();await idle();}}
async function home(){await close();await p.locator('button[data-view=camp]').first().click();await idle();if(!await p.locator('.camp-dashboard').count())await cmd('ui_section',{view:'camp',id:'home'});}
async function fit(label){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const l=await p.locator('#main').evaluate(e=>({h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth,pages:e.querySelector(':scope>.screen-pager')?.textContent}));assert.ok((p.viewportSize().width>900||l.sh<=l.h+2)&&l.sw<=l.w+2,label+JSON.stringify(l));return l;}
async function dump(name){await p.screenshot({path:'artifacts/first-session/'+name+'.png'});fs.writeFileSync('artifacts/first-session/'+name+'.txt',await p.locator('body').innerText());}

fs.mkdirSync('artifacts/first-session',{recursive:true});
async function boot(){await p.goto('http://127.0.0.1:5187/nav/game/index.html');await p.locator('button[data-command*=ui_start]').waitFor();await idle();await cmd('ui_start');await close();await fit('newhome');await dump('browser-home');}


async function layouts(){
 await c.close();const sources=auditFirstSession(81).snapshots;
 for(const [w,h]of [[320,568],[390,844],[1440,1000]])for(const name of ['start','training','ready','returned','material','recipe','crafted','medicine','focus']){
  c=await browser.newContext({viewport:{width:w,height:h}});p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await c.route('https://save.baizeone.top/**',r=>r.abort());const s=structuredClone(sources[name]);await p.clock.setFixedTime(s.clock);
  await c.addInitScript(raw=>{localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_battle_speed','.5');},JSON.stringify(s));await p.goto('http://127.0.0.1:5187/nav/game/index.html');await p.locator(s.battle?'.battle-field':'[data-exploration-home]').waitFor();await idle();await fit(name+' '+w);if(w<=900&&['medicine','focus'].includes(name))assert.equal(await p.locator('#main > .screen-pager').count(),0,'early battle overview and prompt should fit together');
  if(name==='medicine'){
   assert.match(await p.locator('.guide-prompt').innerText(),/先继续交战/);await cmd('ui_battlePause');await p.locator('.guide-prompt button[data-command*=battleItem]').waitFor();await dump('medicine-'+w);await cmd('battleItem',{id:'jinchuangyao'});assert.equal((await snap()).inventory.jinchuangyao,s.inventory.jinchuangyao-1);await cmd('ui_battlePause');
  }else if(name==='focus'){
   assert.match(await p.locator('.guide-prompt').innerText(),/治疗守卫/);await dump('focus-'+w);await cmd('battleOrder',{kind:'focus'});assert.ok((await snap()).battle.orders.focus);
  }else{
   await dump(name+'-'+w);const g=firstSessionGoal(s,d);assert.ok(g);await cmd(g.command.type,Object.fromEntries(Object.entries(g.command).filter(([k])=>k!=='type')));
   if(name==='training'){await p.locator('#batch-preview[open]').waitFor();await cmd('ui_batchCancel');assert.equal((await snap()).inventory.exp_pill,s.inventory.exp_pill);}
   if(name==='material'){await cmd('buy',{id:'wood'});await close();assert.equal((await snap()).inventory.wood,(s.inventory.wood||0)+1);assert.equal((await snap()).player.silver,s.player.silver-d.by.items.wood.price);}
   if(name==='recipe'){const picker=p.getByLabel('选择项目',{exact:true});if(await picker.count()){const options=await picker.locator('option').evaluateAll(es=>es.map(e=>e.value));if(options.length>1){await picker.selectOption(options.at(-1));await home();await cmd('ui_regionalRecipe',{id:'mine'});}}await fit('recipe '+w);await dump('recipe-'+w);await cmd('regionalCraft',{id:'mine'});await close();assert.ok((await snap()).equipment.some(e=>e.item==='guard_pike'));}
   if(name==='crafted'){await p.locator('.equipment-inventory [data-gear]').waitFor();assert.match(await p.locator('.equipment-inventory').innerText(),/守路长枪/);}
  }
  assert.deepEqual(errors,[]);await c.close();console.log('LAYOUT PASS',name,w);
 }
}

import {journeyMoment} from '../public/game/js/journey-scenes.js';
import {storyObjective} from '../public/game/js/story-guide.js';
import {meets} from '../public/game/js/map.js';
const started=Date.now(),timeline=[];let fights=0,iterations=0;
async function fight(){
 if(await p.locator('#sortie-preview[open]').count())await cmd('ui_sortieConfirm');await p.locator('.battle-field').waitFor();if(!(await p.locator('.battle-state').innerText()).includes('已暂停'))await cmd('ui_battlePause');
 if((await snap()).battleSkillMode!=='auto'){assert.ok(await p.locator('.guide-prompt button[data-command*=battleSkillMode]:visible').count());await cmd('battleSkillMode',{mode:'auto'});}await p.getByLabel('战斗操作',{exact:true}).selectOption({label:'战况与设置'});await cmd('ui_battleSpeed',{speed:2});await p.getByLabel('战斗操作',{exact:true}).selectOption({label:'战场'});await cmd('ui_battlePause');
 const until=Date.now()+110000;let captured=false;
 while(!await p.locator('#battle-outcome[data-settled=true][open]').count()){
  assert.ok(Date.now()<until,'fight timeout');const action=p.locator('.guide-prompt button[data-command]:visible').first();
  if(await action.count()&&!await action.isDisabled()){
   const a=JSON.parse(await action.getAttribute('data-command'));await cmd(a.type,Object.fromEntries(Object.entries(a).filter(([k])=>k!=='type')));
   if(!captured){captured=true;await dump('browser-battle-'+fights);}
  }
  await new Promise(r=>setTimeout(r,180));
 }
 const s=await snap();assert.equal(s.lastBattle.outcome,'victory');fights++;console.log('BROWSER WIN',fights,s.lastBattle.context?.id,s.lastBattle.elapsed);await p.locator('[data-settled-choice=continue]').click();await idle();await close();
}
try{
 if(!process.argv.includes('--layouts-only')){await boot();
 for(;iterations<120;iterations++){
  await home();const s=await snap(),g=firstSessionGoal(s,d);console.log('STEP',iterations,g?.id||s.exploration?.flags.join(','));timeline.push({step:iterations,goal:g?.id||s.exploration?.flags.at(-1),seconds:+((Date.now()-started)/1000).toFixed(2)});fs.writeFileSync('artifacts/first-session/browser-last-state.json',JSON.stringify(s));
  if(s.equipment.some(e=>e.item==='guard_pike'&&e.hero)){await dump('browser-complete');break;}
  if(g){
   const a=g.command;await fit(g.id);
   if(a.type==='ui_storyResume'){
    await cmd(a.type);await idle();let after=await snap(),st=storyObjective(after,d);
    if(after.location===st.map){
     if(st.action)await cmd(st.action.type,Object.fromEntries(Object.entries(st.action).filter(([k])=>k!=='type')));
     else if(st.story){const a=journeyMoment(after,d).actions.find(a=>!a.disabled).command;await cmd(a.type,Object.fromEntries(Object.entries(a).filter(([k])=>k!=='type')));}
    }
    if(await p.locator('#sortie-preview[open]').count()||(await snap()).battle)await fight();await close();continue;
   }
   await cmd(a.type,Object.fromEntries(Object.entries(a).filter(([k])=>k!=='type')));
   if(a.type==='ui_gearModel'){const e=s.equipment.find(e=>e.item===a.id&&!e.hero);await p.locator('[id='+JSON.stringify('holder-'+e.uid)+']').selectOption(a.id==='guard_pike'?(s.team.find(id=>id!=='baisheng')||s.team[0]):s.team[0]);await cmd('ui_equip',{id:e.uid});await cmd('equip',{id:e.uid});}
   else if(a.type==='ui_batchPreview')await cmd('batchApply',{kind:a.kind,id:a.id,count:a.count});
   else if(a.type==='ui_materialBuy'){const count=(a.id==='wood'?3:2)-(s.inventory[a.id]||0);for(let n=0;n<count;n++){await cmd('buy',{id:a.id});await close();}}
   else if(a.type==='ui_regionalRecipe')await cmd('regionalCraft',{id:a.id});
   else if(a.type==='ui_section'){if(a.view==='camp'&&a.id==='raids'){await p.locator('[data-fold=raid-choice-woods] >summary').click();await idle();await cmd('campRaid',{id:'woods'});await fight();}else if(a.view==='heroes'&&a.id==='formation'){const members=d.heroes.filter(h=>s.heroes[h.id].status==='owned').slice(0,3).map(h=>h.id);for(const[i,id]of members.entries())await p.locator('#team-'+i).selectOption(id);await cmd('ui_team');}else throw Error('unexpected blocked step '+g.id);}
   else if(a.type==='ui_regionOpen'){
    const now=await snap();if(now.exploration.position!==a.node)await cmd('regionMove',{id:a.node});await cmd('regionBattle',{id:a.node,...(now.exploration.flags.includes('cart_checked')?{approach:'orecart'}:{})});await fight();
   }
   await close();continue;
  }
  const has=k=>s.exploration?.flags.includes(k);
  const go=async node=>{await cmd('ui_regionOpen',{region:'mine'});if(!await p.locator('button[data-command*=ui_regionInspect]:visible').count())await cmd('ui_regionOpen');await cmd('ui_regionInspect',{id:node});if(s.exploration.position!==node)await cmd('regionMove',{id:node});};
  if(!has('rescued')){await go('chamber');await cmd('regionDo',{id:'rescue'});}
  else if(!has('surveyed')){await go('vein');await cmd('regionDo',{id:'survey'});}
  else if(!has('met')){await go('furnace');await cmd('regionDo',{id:'meet'});}
  else if(!has('repair_supplies')){await go('furnace');await cmd('regionDo',{id:'repair'});}
  else if(!has('commission')){await go('furnace');await cmd('regionDo',{id:'commission'});}
  else if(!has('won_vault')){await go('vault');await cmd('regionBattle',{id:'vault'});await fight();}
  else if(!has('invited')){await go('furnace');await cmd('regionDo',{id:'invite'});}
  else if(!has('return_met')){await go('furnace');await cmd('regionDo',{id:'return'});}
  else if(!has('cart_checked')){await go('rail');await cmd('regionDo',{id:'checkcart'});}
  else if(!has('won_orecart')){await go('vault');await cmd('regionBattle',{id:'vault',approach:'orecart'});await fight();}
  else if(!has('return_paid')){await go('furnace');await cmd('regionDo',{id:'thanks'});}
  else throw Error('stalled');await close();
 }
 const s=await snap();assert.ok(s.equipment.some(e=>e.item==='guard_pike'&&e.hero&&s.heroes[e.hero].status==='owned'));assert.ok(s.recruit.total>=2,'actual banner draws supply the companions');assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/first-session/browser-result.json',JSON.stringify({iterations,fights,timeline,seconds:(Date.now()-started)/1000,stamina:s.player.stamina,silver:s.player.silver,state:s},null,2));await p.reload();await p.locator('[data-exploration-home]').waitFor();assert.ok((await snap()).equipment.some(e=>e.item==='guard_pike'&&e.hero));console.log('BROWSER FIRST SESSION PASS');}
 await layouts();
}catch(e){await dump('browser-failure');console.error((await p.locator('body').innerText()).slice(-5500));throw e;}finally{await browser.close();}
