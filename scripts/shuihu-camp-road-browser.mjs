import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {describeCampRoutes,sampleCampRoute} from '../public/game/js/camp-actors.js';
import {CAMP_PAINTED_SPOTS} from '../public/game/js/camp-scene-ui.js';
import {fixture,act,d} from './shuihu-campaign-fixtures.mjs';
import {dispatch} from '../public/game/js/core.js';
const out=process.env.SHUIHU_UI_OUT||'artifacts/camp-road-alignment',url=process.env.SHUIHU_GAME_URL||'http://127.0.0.1:5187/nav/game/index.html';
fs.mkdirSync(out,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline.json'),'utf8'));
for(const [file,expected]of Object.entries(baseline.hashes))assert.equal(hash(file),expected,file+' remains byte-for-byte unchanged');
const data=describeCampRoutes(),routes=Array.isArray(data)?data:data.routes;
assert.equal(routes.length,6,'all six complete production loops are described');
const inside=(p,poly)=>{let inShape=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [x,y]=poly[i],[a,b]=poly[j];if((y>p.pixelY)!==(b>p.pixelY)&&p.pixelX<(a-x)*(p.pixelY-y)/(b-y)+x)inShape=!inShape;}return inShape;};
const roofMasks=CAMP_PAINTED_SPOTS.filter(s=>s.id!=='gate');
const colors=['#c44b38','#2e8755','#326eb3','#b78724','#8950a9','#228f9b'],full=[];
for(let i=0;i<routes.length;i++){
 const route=routes[i],duration=route.duration;assert.ok(Number.isFinite(duration)&&duration>0,'production route has a duration');
 const samples=[];for(let t=0;t<duration;t+=250)samples.push({elapsed:t,...sampleCampRoute(i,t)});samples.push({elapsed:duration,...sampleCampRoute(i,duration)});
 for(const point of samples){assert.ok(Number.isFinite(point.pixelX)&&Number.isFinite(point.pixelY),'sample exposes actual original-image foot position');assert.ok(point.pixelX>=0&&point.pixelX<=1122&&point.pixelY>=0&&point.pixelY<=1402,'full loop stays within the original painting');}
 const roofCrossings=samples.flatMap(point=>roofMasks.filter(mask=>inside(point,mask.points)).map(mask=>({elapsed:point.elapsed,roof:mask.id,pixelX:point.pixelX,pixelY:point.pixelY})));fs.writeFileSync(path.join(out,'route-'+(i+1)+'-roof-check.json'),JSON.stringify(roofCrossings,null,2));
 assert.ok(Math.hypot(samples[0].pixelX-samples.at(-1).pixelX,samples[0].pixelY-samples.at(-1).pixelY)<.01,'complete loop closes without teleporting');
 const flagClearance=Math.min(...samples.map(p=>Math.hypot(p.pixelX-568,p.pixelY-590)));assert.ok(flagClearance>=24,'complete loop stays clear of the flagpole stone base');
 const farmFenceClearance=Math.min(...samples.map(p=>Math.hypot(p.pixelX-507,p.pixelY-800)));assert.ok(farmFenceClearance>=12,'complete foot loop stays off the farm fence post');
 const stopped=samples.filter(p=>p.moving===false),stops=[];for(const point of stopped)if(!stops.some(p=>Math.hypot(p.pixelX-point.pixelX,p.pixelY-point.pixelY)<.5))stops.push({pixelX:point.pixelX,pixelY:point.pixelY});
 assert.ok(stops.length>0,'the route includes real entrance pauses');
 for(let n=1;n<samples.length;n++)if(!samples[n].moving&&!samples[n-1].moving&&Math.hypot(samples[n].pixelX-samples[n-1].pixelX,samples[n].pixelY-samples[n-1].pixelY)<.01)assert.equal(samples[n].walkElapsed,samples[n-1].walkElapsed,'walking leg frames freeze during an entrance stop');
 full.push({index:i,color:colors[i],description:route,duration,samples,stops,roofCrossings,flagClearance,farmFenceClearance});
}
const require=createRequire(import.meta.url),{chromium}=require(process.env.SHUIHU_PLAYWRIGHT_PATH||path.resolve('artifacts/browser-tools/node_modules/playwright')),registry=require(path.resolve('artifacts/browser-tools/node_modules/playwright-core/lib/server/registry/index.js')).registry,ffmpeg=path.join(process.env.LOCALAPPDATA,'ms-playwright/ffmpeg-1009/ffmpeg-win64.exe');
if(!fs.existsSync(registry.findExecutable('ffmpeg').executablePath())&&fs.existsSync(ffmpeg))registry.findExecutable('ffmpeg').executablePathOrDie=()=>ffmpeg;
const browser=await chromium.launch({executablePath:process.env.SHUIHU_BROWSER_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1067/chrome-win/chrome.exe'),headless:true});
const report={release:d.config.release,hashes:baseline.hashes,unchangedSizeAndAssets:true,diagnosticsArePurePhaseSamples:true,liveVideoUsesRealClock:true,routes:full,live:null};
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 const diag=await browser.newContext({viewport:{width:1122,height:1466}}),p=await diag.newPage(),background=fs.readFileSync('public/game/assets/art/camp-painted.png').toString('base64');
 for(const group of [[...full],...full.map(r=>[r])]){
  const name=group.length===1?'route-'+(group[0].index+1):'all-routes';
  const paths=group.map(route=>{const points=route.samples.map(s=>s.pixelX.toFixed(2)+','+s.pixelY.toFixed(2)).join(' '),start=route.samples[0];return '<polyline points="'+points+'" fill="none" stroke="#fffdf1" stroke-width="9" opacity=".9"/><polyline points="'+points+'" fill="none" stroke="'+route.color+'" stroke-width="4"/>'+route.stops.map(s=>'<circle cx="'+s.pixelX+'" cy="'+s.pixelY+'" r="10" fill="#fffbe1" stroke="'+route.color+'" stroke-width="4"/>').join('')+'<circle cx="'+start.pixelX+'" cy="'+start.pixelY+'" r="16" fill="'+route.color+'"/><text x="'+start.pixelX+'" y="'+(start.pixelY+6)+'" text-anchor="middle" fill="white" font-size="18" font-weight="bold">'+(route.index+1)+'</text>';}).join('');
  await p.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#f3f1e5;font-family:system-ui}header{height:64px;box-sizing:border-box;padding:8px 16px;color:#244838}h1{font-size:19px;margin:0}p{font-size:13px;margin:3px 0}svg{display:block}</style><header><h1>'+esc(group.length===1?'完整脚底回路 '+(group[0].index+1):'六条完整脚底回路')+'</h1><p>生产纯路线采样 · 圆圈为入口停留点 · 非实时录像</p></header><svg xmlns="http://www.w3.org/2000/svg" width="1122" height="1402" viewBox="0 0 1122 1402"><image href="data:image/png;base64,'+background+'" width="1122" height="1402"/>'+paths+'</svg>');
  await p.screenshot({path:path.join(out,name+'.png')});
 }
 await diag.close();fs.writeFileSync(path.join(out,'full-route-samples.json'),JSON.stringify(full,null,2));for(const route of full)assert.deepEqual(route.roofCrossings,[],'complete foot loop '+(route.index+1)+' never crosses a painted roof');console.log('PASS six complete production loops sampled and plotted without crossing roofs');
 let state=fixture(903,15);for(const id of ['songjiang','wuyong','luzhishen','wusong','ruanxiaoqi','huarong'])Object.assign(state.heroes[id],{status:'owned',level:15,exp:0,quality:1});state=dispatch(d,state,{type:'refresh'},Date.now());state=act(state,'frontierStart');
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:path.join(out,'video-raw'),size:{width:390,height:844}}}),page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await c.route('https://save.baizeone.top/**',r=>r.abort());await c.addInitScript(raw=>{const s=JSON.parse(raw);localStorage.setItem('baize_shuihu_save',raw);localStorage.setItem('baize_shuihu_guide:1:'+s.startedAt,'off');localStorage.setItem('baize_shuihu_camp_motion','on');},JSON.stringify(state));
 const idle=async()=>{await page.waitForFunction(()=>document.getElementById('main')&&!document.getElementById('app').hasAttribute('aria-busy'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const sample=()=>page.evaluate(()=>({at:performance.now(),wall:Date.now(),running:document.querySelector('[data-camp-scene]')?.dataset.sceneRunning,image:document.querySelector('.camp-painted-image')?.getBoundingClientRect().toJSON(),actors:[...document.querySelectorAll('[data-camp-actor]')].map(e=>{const r=e.getBoundingClientRect(),body=e.querySelector('.camp-actor-body');return {id:e.dataset.campActor,route:Number(e.dataset.campRoute),x:Number(e.dataset.campX),y:Number(e.dataset.campY),activity:e.dataset.campActivity,step:e.dataset.campStep,foot:{x:r.x+r.width/2,y:r.bottom},body:body.getBoundingClientRect().toJSON()};})}));
 const distance=(a,b,id=a.actors[0].id)=>{const x=a.actors.find(a=>a.id===id),y=b.actors.find(a=>a.id===id);return Math.hypot(y.x-x.x,y.y-x.y);};
 await page.goto(url);await page.locator('#main').waitFor();await page.locator('.tabs [data-view=camp]').click();await idle();await page.locator('.folio-shortcuts button[data-command*="ui_campFacility"]').click();await page.locator('[data-camp-scene]').waitFor();await idle();
 const begin=await sample();await page.waitForTimeout(1700);const moving=await sample();assert.ok(distance(begin,moving)>.4,'actual people start walking within two seconds');
 for(const actor of moving.actors){assert.ok(Math.abs(actor.foot.x-(moving.image.x+moving.image.width*actor.x/100))<1,'actual feet use the route x anchor');assert.ok(Math.abs(actor.foot.y-(moving.image.y+moving.image.height*actor.y/100))<1,'actual feet use the route y anchor');}
 await page.evaluate(()=>window.dispatchEvent(new Event('baize-app-resume')));await idle();const repainted=await sample();assert.ok(distance(moving,repainted)<.6,'real clock repaint preserves current route position');assert.ok(distance(begin,repainted)>.4,'repaint does not put people back at the start');console.log('PASS real two-second start and repaint continuity');
 await page.mouse.move(0,0);await page.screenshot({path:path.join(out,'live-390x844.png')});
 await page.waitForFunction(()=>document.querySelector('[data-camp-scene]')?.dataset.sceneRunning==='true'&&[...document.querySelectorAll('[data-camp-actor]')].some(e=>e.dataset.campActivity==='resting'),null,{timeout:90000});
 const arrived=await sample(),waiting=arrived.actors.find(a=>a.activity==='resting');await page.waitForTimeout(320);const held=await sample(),heldActor=held.actors.find(a=>a.id===waiting.id);assert.ok(distance(arrived,held,waiting.id)<.02,'at the entrance feet stop');assert.equal(heldActor.step,waiting.step,'at the entrance the leg animation stops');
 const matching=full[waiting.route].stops.find(p=>Math.hypot(p.pixelX-waiting.x*1122/100,p.pixelY-waiting.y*1402/100)<1);assert.ok(matching,'live entrance stop matches a complete production route stop');
 await page.waitForFunction(id=>document.querySelector('[data-camp-actor="'+id+'"]')?.dataset.campActivity==='walking',waiting.id,{timeout:5000});console.log('PASS natural entrance stop and departure');
 await page.waitForTimeout(6500);assert.deepEqual(errors,[]);report.live={begin,moving,repainted,arrived,held,entranceHero:waiting.id,errors};await c.close();
 const raw=await page.video().path(),info=spawnSync(ffmpeg,['-hide_banner','-i',raw],{encoding:'utf8'}),match=info.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);assert.ok(match);const duration=Number(match[1])*3600+Number(match[2])*60+Number(match[3]),target=path.join(out,'camp-road-walking-5s.webm'),trim=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-ss',String(duration-5.12),'-i',raw,'-t','5','-c:v','libvpx','-deadline','realtime','-cpu-used','8','-b:v','600k','-an','-y',target],{encoding:'utf8'});assert.equal(trim.status,0,trim.stderr);report.video=target;
 const verify=spawnSync(ffmpeg,['-hide_banner','-i',target,'-f','null','-'],{encoding:'utf8'});fs.writeFileSync(path.join(out,'video-verify.txt'),verify.stderr);console.log(verify.stderr.split('\n').filter(l=>/Duration:|Stream #/.test(l)).join('\n'));
 for(const [file,expected]of Object.entries(baseline.hashes))assert.equal(hash(file),expected,'final '+file+' unchanged');fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('PASS unchanged CSS/sprite/background and final road evidence');
}catch(e){fs.writeFileSync(path.join(out,'failure.txt'),e.stack||String(e));throw e;}finally{await browser.close();}
