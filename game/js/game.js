import { gains, rewardDialog } from './rewards-ui.js?v=0.5.0';
import { ActivityLog } from './activity.js?v=0.5.0';
import { loadData } from './data.js?v=0.5.0';
import { dispatch, newGame } from './core.js?v=0.5.0';
import { SaveConflict, SAVE_KEY, BACKUP_KEY } from './save.js?v=0.5.0';
import { esc, recruitDialog, render } from './ui.js?v=0.5.0';
import { patchElement } from './dom.js?v=0.5.0';

import { SlotDatabase, SlotStore, emptySlot, CHANNEL } from './slots.js?v=0.5.0';
import { exportSave, importSave, exportName, slotId, slotNumber } from './portable.js?v=0.5.0';
import { CloudClient } from './cloud.js?v=0.5.0';
import { boxImportDialog } from './savebox-ui.js?v=0.5.0';
const root=document.getElementById('app'),activity=new ActivityLog();
let logFollowing=true,logPaused=false,logMode='important',visibleEntries=[],lastLogPaint=0,battleSpeed=.5;
try{const speed=Number(localStorage.getItem('baize_shuihu_battle_speed'));if([.5,1,2].includes(speed))battleSpeed=speed;}catch{}
function fitViewport(){if(!window.visualViewport||Math.abs(window.visualViewport.scale-1)<0.01){const height=Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);document.documentElement.style.setProperty('--game-height',height+'px');document.documentElement.toggleAttribute('data-short-viewport',height<480);}}
fitViewport();window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
let database, channel, operation=false, savePending=null, slots=[], previewSlots=[], cloud;
const cloudView={baseUrl:'',selected:1,slots:[],message:'',conflict:false,history:null};
const makeStore=id=>new SlotStore(database,data,id,change=>channel?.postMessage(change));
async function refreshSlots(){try{slots=await database.all();}catch{slots=[store.record];}}
function rememberSlot(){try{sessionStorage.setItem('baize_shuihu_active_slot',String(store.id));}catch{}}
function saveBox(){return {record:store.record,slots,cloud:cloudView,dirty};}
let data,state,store,view='map',status='',error='',notice='',recruitTarget='',locked=false,invalid=false,dirty=false,pendingImport=null,entered=false;
let battlePaused=true,battlePauseReason='',lastBattlePulse=null,lastBattleSaved=0,paintRevision=0;
function paint(focus=false){
  paintRevision++;
  const formValues=Object.fromEntries(Array.from(root.querySelectorAll('input:not([type=file]):not([type=password]),select,textarea')).filter(el=>el.id).map(el=>[el.id,el.value]));
  const active=document.activeElement?.dataset?.command,importText=document.getElementById('import-text')?.value;
  const folds=root.dataset.view===view?new Set(Array.from(root.querySelectorAll('details[data-fold][open]')).map(el=>el.dataset.fold)):new Set();
  const oldMain=document.getElementById('main'),mainScroll=oldMain?.scrollTop||0,oldScreen=oldMain?.dataset.screen;
  const oldLog=document.getElementById('activity-log'),logScroll=oldLog?.scrollTop||0;
  const anchor=oldLog&&Array.from(oldLog.querySelectorAll('[data-log-entry]')).find(el=>el.getBoundingClientRect().bottom>oldLog.getBoundingClientRect().top);
  const anchorId=anchor?.dataset.logEntry,anchorOffset=anchor&&anchor.getBoundingClientRect().top-oldLog.getBoundingClientRect().top;
  const entries=activity.observe(state,{available:entered&&!invalid,feedback:notice});
  if(!logPaused&&(focus||!state.battle||performance.now()-lastLogPaint>=2000)){visibleEntries=entries.filter(e=>logMode==='all'||e.kind!=='battle'||!/进击|普攻|受到持续|损失.*气血/.test(e.text)||/施展|首领|蓄势|得胜|退阵|无力再战|军令/.test(e.text)).map(e=>({...e}));lastLogPaint=performance.now();}
  const html=render({state,data,view,status,error,locked,notice,recruitTarget,entered,battlePaused,battlePauseReason,saveBox:saveBox(),activity:visibleEntries,battleSpeed});
  if(root.querySelector('.viewport-shell')){const next=document.createElement('template');next.innerHTML=html;patchElement(root.firstElementChild,next.content.firstElementChild);}
  else root.innerHTML=html;
  root.dataset.view=view;
  if(!focus)for(const [id,value] of Object.entries(formValues)){const el=document.getElementById(id);if(el)el.value=value;}
  if(document.getElementById('recruit-target'))recruitTarget=document.getElementById('recruit-target').value;
  for(const el of root.querySelectorAll('details[data-fold]'))el.open=folds.has(el.dataset.fold);
  if(importText&&document.getElementById('import-text'))document.getElementById('import-text').value=importText;
  const main=document.getElementById('main');if(main)main.scrollTop=focus||oldScreen!==main.dataset.screen?0:mainScroll;
  if(focus){main?.focus({preventScroll:true});const tabs=document.querySelector('.tabs'),selected=tabs?.querySelector('[aria-current=page]');if(tabs&&selected){if(tabs.scrollWidth>tabs.clientWidth)tabs.scrollLeft=selected.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-selected.clientWidth)/2;}}
  else if(active)Array.from(document.querySelectorAll('button[data-command]')).find(b=>b.dataset.command===active&&!b.disabled)?.focus({preventScroll:true});
  const log=document.getElementById('activity-log');if(log){
    if(logFollowing)log.scrollTop=log.scrollHeight;
    else{const kept=Array.from(log.querySelectorAll('[data-log-entry]')).find(el=>el.dataset.logEntry===anchorId);log.scrollTop=kept?log.scrollTop+kept.getBoundingClientRect().top-log.getBoundingClientRect().top-anchorOffset:logScroll;}
  }
  updateLogCaption();
  if(!pendingImport){document.getElementById('import-confirm')?.close();document.getElementById('import-confirm')?.remove();}
  updateRecruitNotice();
}
function updateLogCaption(){const caption=document.getElementById('activity-caption');if(caption)caption.textContent=logPaused?'日志已冻结 · 战斗仍在进行':!logFollowing?'正在阅读历史 · 新日志不打断':'每 2 秒更新 · '+(logMode==='important'?'仅看重点':'完整战报');const pause=root.querySelector('[data-log-pause]'),filter=root.querySelector('[data-log-filter]');if(pause){pause.textContent=logPaused?'继续刷新':'冻结阅读';pause.setAttribute('aria-pressed',String(logPaused));}if(filter){filter.textContent=logMode==='important'?'查看完整战报':'只看重点';filter.setAttribute('aria-pressed',String(logMode==='all'));}}
root.addEventListener('scroll',event=>{if(event.target.id!=='activity-log')return;const el=event.target;logFollowing=el.scrollHeight-el.scrollTop-el.clientHeight<24;updateLogCaption();},true);
function updateRecruitNotice(){const notice=document.getElementById('recruit-result-save');if(notice){notice.textContent=locked?status:dirty?'此结果尚未写入本机：请保持本页打开，到存档页导出进度。':'本次结果已保存到本机。';notice.className=locked||dirty?'warning':'note';}}
function showRecruitResult(result,returnCommand){
  document.getElementById('recruit-result')?.remove();
  document.body.insertAdjacentHTML('beforeend',recruitDialog(result,data));
  const dialog=document.getElementById('recruit-result');let destination=null;
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=Array.from(dialog.querySelectorAll('button:not(:disabled)')),first=buttons[0],last=buttons[buttons.length-1],active=document.activeElement;
    if(event.shiftKey&&(active===first||active===dialog.querySelector('h2'))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('click',event=>{const action=event.target.closest('[data-result-action]')?.dataset.resultAction;if(!action)return;destination=action==='heroes'?'heroes':null;dialog.close();});
  dialog.addEventListener('close',()=>{
    dialog.remove();document.body.classList.remove('recruit-modal-open');
    if(destination){view=destination;notice='';paint(true);}
    else Array.from(root.querySelectorAll('button[data-command]')).find(b=>b.dataset.command===returnCommand&&!b.disabled)?.focus({preventScroll:true});
  },{once:true});
  updateRecruitNotice();dialog.showModal();document.body.classList.add('recruit-modal-open');dialog.querySelector('h2').focus({preventScroll:true});
}
function showRewards(before,after,returnCommand){
  const rows=gains(before,after,data),victory=before.battle?.outcome==='victory'&&!after.battle;if(!rows.length&&!victory)return;
  const dungeonVictory=(victory&&before.battle?.context.type==='dungeon')||(before.scheme?.outcome==='success'&&before.scheme.context.type==='dungeon'&&!after.scheme);
  document.getElementById('reward-result')?.remove();document.body.insertAdjacentHTML('beforeend',rewardDialog(rows,esc,{saved:!dirty&&!locked,emptyVictory:victory,dungeonVictory}));
  const dialog=document.getElementById('reward-result');dialog.querySelector('[data-reward-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();Array.from(root.querySelectorAll('button[data-command]')).find(b=>b.dataset.command===returnCommand&&!b.disabled)?.focus({preventScroll:true});},{once:true});dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
}
function download(text,name){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function persist(next,force=false){
  try{savePending=store.write(next,force);await savePending;dirty=false;status='已保存到本机 · '+new Date().toLocaleTimeString('zh-CN');}
  catch(e){if(e instanceof SaveConflict){locked=true;status=e.message;throw e;}dirty=true;status='尚未保存：'+e.message+' 请保持本页打开并导出进度。';}
  finally{savePending=null;}
  state=next;lastBattleSaved=performance.now();
}
async function flushBattle(){if(savePending){try{await savePending;}catch{}return;}if(!dirty||locked||invalid)return;try{await persist(state);}catch(e){battlePaused=true;battlePauseReason='存档发生冲突，交战已暂停。';error=e.message;}}
async function pauseBattle(reason){if(!state?.battle||state.battle.outcome)return;battlePaused=true;battlePauseReason=reason;lastBattlePulse=null;await flushBattle();}
function resumeSavedBattle(){battlePaused=true;battlePauseReason='已接续原战局。点击继续交战后再出手，离线时间不补算。';lastBattlePulse=null;}
async function battleFrame(){
  if(operation||!state?.battle||state.battle.outcome||battlePaused||locked||invalid||!entered||view!=='map'||document.hidden)return;
  const now=performance.now();if(lastBattlePulse===null){lastBattlePulse=now;return;}
  const delta=Math.floor(now-lastBattlePulse);if(delta<=0)return;
  if(delta>1500){await pauseBattle('浏览器刚才中断了运行，已暂停。点击继续交战，不补算中断的时间。');paint();return;}
  lastBattlePulse=now;
  operation=true;
  try{
    state=dispatch(data,state,{type:'battleTick',delta:Math.min(Math.floor(delta*battleSpeed),1000)});dirty=true;
    if(state.battle.outcome||now-lastBattleSaved>=1000)await flushBattle();
    paint();
  }catch(e){battlePaused=true;battlePauseReason='交战已暂停，请先处理提示。';error=e.message;paint();}finally{operation=false;}
}
async function load(){visibleEntries=[];logPaused=false;activity.reset();logFollowing=true;const result=await store.load();await refreshSlots();rememberSlot();error='';notice='';recruitTarget='';locked=false;invalid=false;dirty=false;entered=result.status==='ok';
  if(result.status==='ok'){state=result.state;view=state.battle||state.scheme||state.event?'map':'camp';status='已保存到本机 · 已接续原有进度';try{await persist(dispatch(data,state,{type:'refresh'}));}catch(e){status=e.message;}}
  else{state=newGame(data);view=result.status==='invalid'?'save':'welcome';invalid=result.status==='invalid';locked=invalid;status=invalid?'存档无法读取，原文与已有备份均保留。请恢复备份或导入；导出按钮可取回坏档原文。':result.status==='unavailable'?'本机存储不可用，可临时游玩，但务必导出进度。':'尚未入卷，点击进入后开始保存。';}
  resumeSavedBattle();paint(true);
}
async function previewImport(next){
  pendingImport=next;await refreshSlots();previewSlots=slots.map(s=>({id:s.id,serial:s.serial}));
  document.getElementById('import-confirm')?.remove();root.insertAdjacentHTML('beforeend',boxImportDialog(next,slots,store.id));
  const dialog=document.getElementById('import-confirm');dialog.addEventListener('cancel',()=>{pendingImport=null;dialog.remove();});dialog.showModal();dialog.querySelector('select')?.focus();
}
async function handleBox(command){
  const {type}=command;
  if(type==='ui_slotSwitch'){
    const id=slotId(document.getElementById('local-slot').value);
    if(id===store.id)return true;
    if(dirty)throw new Error('当前进度尚未保存，请先导出，不要直接切换。');
    if(!window.confirm('离开本机 '+slotNumber(store.id)+'号，接续 '+slotNumber(id)+'号？空位将打开新卷。'))return true;
    await pauseBattle('切换存档时已暂停。');store=makeStore(id);await load();return true;
  }
  if(type==='ui_slotRename'){
    if(locked||invalid)throw new Error('请先处理当前存档冲突或坏档。');
    await store.rename(document.getElementById('slot-name').value);await refreshSlots();paint();return true;
  }
  if(!type.startsWith('ui_cloud'))return false;
  const id=slotId(document.getElementById('cloud-slot')?.value||cloudView.selected);
  cloudView.selected=id;cloud.setKey(id,document.getElementById('cloud-key')?.value);
  const input=document.getElementById('cloud-key');if(input)input.value='';
  cloudView.conflict=false;
  try{
    if(type==='ui_cloudForget'){cloud.forget();cloudView.message='本页全部存档密钥已清除。';}
    if(type==='ui_cloudList'){const result=await cloud.list();cloudView.slots=result.slots;cloudView.message='云端列表已刷新；私有档只展示编号、名称与公开状态。';}
    if(type==='ui_cloudDownload'){
      const remote=await cloud.download(id);
      if(!remote.state){cloudView.message=slotNumber(id)+'号尚无云端进度，可持密钥上传本机档。';}
      else{await previewImport({state:remote.state,name:remote.name,cloud:{origin:cloud.baseUrl,id,revision:remote.cloudRevision,clean:true}});return true;}
    }
    if(type==='ui_cloudUpload'||type==='ui_cloudReplace'){
      if(locked||invalid||!entered)throw new Error('请先接续一个有效本机存档，处理冲突后再上传。');
      if(dirty){await persist(state);if(dirty)throw new Error('本机仍未保存，请先导出进度再处理存储问题。');}
      let revision;
      const link=store.record.cloud;
      if(type!=='ui_cloudReplace'&&link?.origin===cloud.baseUrl&&link.id===id)revision=link.revision;
      else{const remote=await cloud.download(id);if(remote.state&&!window.confirm('此云端位置已有「'+remote.name+'」第 '+remote.cloudRevision+' 版。确认用本机「'+store.record.name+'」替换？云端旧版会保留在历史中。'))return true;revision=remote.cloudRevision;}
      if(!window.confirm('把本机 '+slotNumber(store.id)+'号「'+store.record.name+'」上传到云端 '+slotNumber(id)+'号？本次基于第 '+revision+' 版，云端若已更新将拒绝覆盖。'))return true;
      const result=await cloud.upload(id,revision,state,store.record.name);
      cloudView.message='云端已保存 '+slotNumber(id)+'号第 '+result.cloudRevision+' 版。手机端请查看并确认接续。';
      try{await store.markCloud({origin:cloud.baseUrl,id,revision:result.cloudRevision,clean:true});}
      catch{locked=true;cloudView.message+=' 但本机关联信息未能保存，请先导出本页，然后重新接续云端；不要重复提交。';}
    }
    if(type==='ui_cloudShare'){
      const remote=await cloud.download(id);
      if(!window.confirm(command.value?'将云端 '+slotNumber(id)+'号设为公开副本？任何人都能下载，之后关闭也无法收回已下载的副本。':'关闭云端 '+slotNumber(id)+'号的免密下载？已下载的副本无法收回。'))return true;
      const result=await cloud.sharing(id,remote.cloudRevision,command.value),link=store.record.cloud;
      cloudView.message=command.value?'已开启公开副本；下载者仍没有上传权限。':'已关闭公开副本；私有访问需要密钥。';
      if(link?.origin===cloud.baseUrl&&link.id===id&&link.revision===remote.cloudRevision){try{await store.markCloud({...link,revision:result.cloudRevision});}catch{cloudView.message+=' 本机版本关联未更新，请先导出，再接续云端。';}}
      cloudView.slots=(await cloud.list()).slots;
    }
    if(type==='ui_cloudHistory'){cloudView.history=await cloud.history(id);cloudView.message='只显示最近十份历史。回滚也需版本检查，不会自动改动本机。';}
    if(type==='ui_cloudRollback'){
      if(cloudView.history?.id!==id)throw new Error('请先读取所选位置的历史。');
      if(!window.confirm('确认将云端 '+slotNumber(id)+'号回滚至第 '+command.revision+' 版？将生成新版本，当前云端进度进入历史。本机不会自动替换。'))return true;
      const result=await cloud.rollback(id,cloudView.history.cloudRevision,command.revision);
      cloudView.history=null;cloudView.message='云端已回滚，现为第 '+result.cloudRevision+' 版。请查看云端进度，确认接续到本机。';
    }
    if(type==='ui_cloudAdminKey'){
      const key=document.getElementById('admin-key').value;document.getElementById('admin-key').value='';
      if(!window.confirm('确认重置云端 '+slotNumber(id)+'号密钥？旧密钥立即失效，但进度保留。'))return true;
      const result=await cloud.admin(id,'key',key);cloud.keys.delete(id);cloudView.message='所选编号密钥已重置。请安全保管刚生成的密钥，旧密钥已失效。';paint();
      // Do not put this one-time secret in the persistent UI model, storage, URLs or downloads.
      const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','新上传密钥，仅本次显示');
      const heading=document.createElement('h2');heading.textContent=slotNumber(id)+'号 · 新上传密钥';
      const field=document.createElement('input');field.readOnly=true;field.value=result.key;field.setAttribute('aria-label','新上传密钥');
      const note=document.createElement('p');note.textContent='仅本次显示。选择并复制到密码管理器，勿公开发给所有访客。';
      const close=document.createElement('button');close.textContent='我已保管，关闭';close.onclick=()=>dialog.close();
      dialog.append(heading,note,field,close);document.body.append(dialog);dialog.addEventListener('close',()=>{field.value='';dialog.remove();},{once:true});dialog.showModal();field.select();return true;
    }
    if(type==='ui_cloudAdminDelete'){
      const key=document.getElementById('admin-key').value;document.getElementById('admin-key').value='';
      const remote=await cloud.request(`/v1/admin/slots/${id}`,{key});
      if(!window.confirm('确认删除云端 '+slotNumber(id)+'号「'+remote.name+'」当前第 '+remote.cloudRevision+' 版？进度会进入受保护历史，本机和密钥不删除。'))return true;
      await cloud.admin(id,'delete',key,remote.cloudRevision);cloudView.message='云端当前进度已移入历史，公开下载已关闭。本机进度未变。';cloudView.history=null;
    }
    await refreshSlots();paint();return true;
  }catch(e){cloudView.conflict=e.status===412;cloudView.message=e.message;paint();return true;}
}
async function handle(command){
  const {type,id}=command;error='';
  if(await handleBox(command))return;
  if(type==='ui_export'){download(invalid&&store.raw?store.raw:exportSave(state,store.record,data),invalid?'白泽水浒_坏档原文.json':exportName(store.record));return;}
  if(type==='ui_reload'){if(dirty&&!window.confirm('本页还有未保存进度。请先导出。仍要重新载入本机存档吗？'))return;await load();return;}
  if(type==='ui_import'){
    const file=document.getElementById('import-file').files[0];if(file&&file.size>2000000)throw new Error('存档不能超过 2 MB。');
    const raw=file?await file.text():document.getElementById('import-text').value;await previewImport(importSave(raw,data));return;
  }
  if(type==='ui_backup'){await previewImport({state:store.backup()});return;}
  if(type==='ui_cancelImport'){pendingImport=null;document.getElementById('import-confirm')?.close();document.getElementById('import-confirm')?.remove();return;}
  if(type==='ui_confirmImport'){
    if(!pendingImport)throw new Error('请先检查导入内容。');
    const target=slotId(document.getElementById('import-slot').value);
    if(!window.confirm('确认接续本机 '+slotNumber(target)+'号，并替换其中的旧进度？'))return;
    const destination=makeStore(target);const loaded=await destination.load();
    if(loaded.status==='unavailable')throw new Error('目标本机位置不可写。');
    if(destination.record.serial!==(previewSlots.find(s=>s.id===target)?.serial||0))throw new SaveConflict('预览后目标存档已更新，请取消并重新检查导入。');
    const next=dispatch(data,pendingImport.state,{type:'refresh'});
    const cloudLink=pendingImport.cloud?{...pendingImport.cloud,clean:JSON.stringify(next)===JSON.stringify(pendingImport.state)}:null;
    await destination.write(next,true,{name:pendingImport.name||destination.record.name,cloud:cloudLink});
    activity.reset();visibleEntries=[];logPaused=false;logFollowing=true;store=destination;state=next;pendingImport=null;locked=false;invalid=false;dirty=false;entered=true;
    status='已保存到本机 · 导入成功';view=state.battle||state.scheme||state.event?'map':'camp';await refreshSlots();rememberSlot();resumeSavedBattle();paint(true);return;
  }
  if(type==='ui_reset'){
    if(document.getElementById('reset-phrase').value!=='白泽新卷')throw new Error('请输入“白泽新卷”确认。');
    if(!window.confirm('确认替换当前游戏进度？此操作不影响导航和学习记录。'))return;
    const next=newGame(data);await store.write(next,true,{cloud:null});activity.reset();visibleEntries=[];logPaused=false;logFollowing=true;state=next;locked=false;invalid=false;dirty=false;entered=false;status='已保存到本机 · 新卷已开';view='welcome';paint(true);return;
  }
  if(locked)throw new Error(status);
  if(type==='ui_battlePause'){
    if(!state.battle||state.battle.outcome)throw new Error('当前没有进行中的交战。');
    if(battlePaused){await persist(state);battlePaused=false;battlePauseReason='';lastBattlePulse=performance.now();}
    else await pauseBattle('你已暂停交战。点击继续交战后，普攻与冷却一起恢复。');paint();return;
  }
  if(['battleSkill','battleItem'].includes(type)&&battlePaused)throw new Error('请先继续交战，再释放技能或用药。');
  if(type==='ui_start'){const before=state;await persist(state.camp?state:dispatch(data,state,{type:'campFound'}));entered=true;view='camp';paint(true);showRewards(before,state);return;}
  if(type==='ui_battleSpeed'){if(![.5,1,2].includes(command.speed))throw new Error('无效速度');battleSpeed=command.speed;try{localStorage.setItem('baize_shuihu_battle_speed',String(battleSpeed));}catch{}paint();return;}
  if(type==='ui_campFormation')command={type:'campFormation',mode:document.getElementById('camp-mode').value,tactic:document.getElementById('camp-tactic').value,deployment:Number(document.getElementById('camp-deployment').value)};
  if(type==='ui_team')command={type:'team',ids:[0,1,2].map(i=>document.getElementById('team-'+i).value).filter(Boolean)};
  if(type==='ui_equip')command={type:'equip',id,hero:document.getElementById('holder-'+id).value||null};
  if(type==='ui_dismantle'){if(!window.confirm('确认分解此装备？装备将变为碎铁，不能原样取回。'))return;command={type:'dismantle',id};}
  const before=state,hadBattle=!!state.battle,next=dispatch(data,state,command);await persist(next);
  if(!hadBattle&&next.battle&&!next.battle.outcome){battlePaused=false;battlePauseReason='';lastBattlePulse=performance.now();}
  notice=type==='recruit'||type.startsWith('battle')||next.battle?'':next.message;
  if(next.battle||next.scheme||next.event||['move','story','startScheme'].includes(type))view='map';
  if(type==='finishBattle'&&before.battle?.context.type==='camp')view='camp';
  paint(['move','story','startScheme','dungeon','search','finishBattle','finishScheme','eventChoice'].includes(type));
  if(type==='recruit')showRecruitResult(next.recruit.lastResult,JSON.stringify(command));
  else {if(gains(before,next,data).length&&next.battle&&!next.battle.outcome)await pauseBattle('查看收获时已暂停，关闭后可继续交战。');showRewards(before,next,JSON.stringify(command));}
}
root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-log-latest')){logFollowing=true;const log=document.getElementById('activity-log');if(log)log.scrollTop=log.scrollHeight;updateLogCaption();return;}
  if(button.hasAttribute('data-log-pause')){logPaused=!logPaused;lastLogPaint=0;paint();return;}
  if(button.hasAttribute('data-log-filter')){logMode=logMode==='all'?'important':'all';logPaused=false;lastLogPaint=0;paint();return;}
  if(operation)return;
  if(button.dataset.view){if(!entered&&button.dataset.view!=='save'&&(locked||button.dataset.view!=='welcome'))return;operation=true;try{if(button.dataset.view!==view)await pauseBattle('离开战斗页面时已暂停。返回后点击继续交战。');view=button.dataset.view;error='';notice='';if(view==='save')await refreshSlots();paint(true);}finally{operation=false;}return;}
  if(!button.dataset.command)return;const painted=paintRevision;button.disabled=true;operation=true;root.setAttribute('aria-busy','true');
  try{await handle(JSON.parse(button.dataset.command));}
  catch(e){pendingImport=null;error=e.message||'操作未完成，原进度保留。';paint();}
  finally{operation=false;root.removeAttribute('aria-busy');if(button.isConnected&&painted===paintRevision)button.disabled=false;}
});
root.addEventListener('change',event=>{
  if(event.target.id==='cloud-slot'){cloudView.selected=slotId(event.target.value);cloudView.history=null;cloudView.message='已切换云端编号，请确认密钥对应此编号。';document.getElementById('cloud-key').value='';paint();}
  if(event.target.id==='recruit-target'){recruitTarget=event.target.value;notice='';error='';paint();document.getElementById('recruit-target')?.focus({preventScroll:true});}
});
async function checkSlotConflict(){
  if(!store||operation)return;
  const current=store;try{const disk=await database.read(current.id);if(!operation&&store===current&&!locked&&(disk?.serial||0)!==current.record.serial){locked=true;battlePaused=true;battlePauseReason='另一标签页更新了此编号，交战已暂停。';status='另一标签页更新了游戏存档。本页暂停写入；可先导出，再在存档页重新载入。';paint();}}catch{}
}
window.addEventListener('beforeunload',event=>{if(!operation)flushBattle();if(dirty||operation){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>pauseBattle('离开页面，交战已暂停。'));
async function refreshClock(){if(operation||!state||!entered||locked||invalid||view==='welcome'||view==='save'||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;operation=true;try{await persist(dispatch(data,state,{type:'refresh'}));paint();}catch(e){error=e.message;paint();}finally{operation=false;}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseBattle('切到后台时已暂停。回来后点击继续交战。');if(state)paint();}else{lastBattlePulse=null;checkSlotConflict();refreshClock();}});
try{
  data=await loadData();let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('浏览器禁止访问本机存储。');},setItem(){throw new Error('浏览器禁止访问本机存储。');}};}
  try{database=await SlotDatabase.open(window.indexedDB);await database.migrate(storage);}
  catch(e){
    // Read-only recovery: never substitute a fresh game for a readable legacy save.
    let raw=null,backup=null;try{raw=storage.getItem(SAVE_KEY);backup=storage.getItem(BACKUP_KEY);}catch{}
    const legacy={...emptySlot(1),raw,backup};database={read:async id=>id===1?legacy:undefined,all:async()=>[legacy],commit:async()=>{throw new Error('本机存档匣不可写：'+e.message);}};
  }
  try{channel=new BroadcastChannel(CHANNEL);channel.onmessage=()=>checkSlotConflict();}catch{}
  let active=1;try{active=slotId(sessionStorage.getItem('baize_shuihu_active_slot')||1);}catch{}
  store=makeStore(active);cloudView.selected=active;
  try{const r=await fetch(new URL('../cloud-config.json',import.meta.url),{cache:'no-store'});cloud=new CloudClient(r.ok?(await r.json()).baseUrl:'',data);}
  catch{cloud=new CloudClient('',data);}cloudView.baseUrl=cloud.baseUrl;
  await load();setInterval(refreshClock,60000);setInterval(battleFrame,200);setInterval(checkSlotConflict,2500);
}catch(e){root.innerHTML=`<main class="loading" id="main"><p class="kicker">白泽水浒 · 未能开卷</p><h1>江湖尚未载入</h1><p class="notice error">${esc(e.message)}</p><p>本次没有写入或清空任何存档。请联网后刷新再试；本地预览需通过 HTTP 服务打开，不要直接双击 HTML。</p><a href="./">重新载入</a> · <a href="../">返回白泽导航</a></main>`;}
