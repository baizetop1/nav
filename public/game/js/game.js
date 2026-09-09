import { loadData } from './data.js';
import { dispatch, newGame } from './core.js';
import { SaveStore, SaveConflict, SAVE_KEY } from './save.js';
import { esc, importDialog, render } from './ui.js';

const root=document.getElementById('app');
let data,state,store,view='map',status='',error='',locked=false,invalid=false,dirty=false,pendingImport=null;
function paint(focus=false){
  const active=document.activeElement?.dataset?.command,importText=document.getElementById('import-text')?.value;
  root.innerHTML=render({state,data,view,status,error,locked});
  if(importText&&document.getElementById('import-text'))document.getElementById('import-text').value=importText;
  if(focus){document.getElementById('main')?.focus({preventScroll:true});window.scrollTo({top:0,left:0,behavior:'instant'});}
  else if(active)Array.from(document.querySelectorAll('button[data-command]')).find(b=>b.dataset.command===active&&!b.disabled)?.focus({preventScroll:true});
  const log=document.querySelector('.combat-log');if(log)log.scrollTop=log.scrollHeight;
}
function download(text,name){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function persist(next,force=false){
  try{store.write(next,force);dirty=false;status='已保存到本机 · '+new Date().toLocaleTimeString('zh-CN');}
  catch(e){if(e instanceof SaveConflict){locked=true;status=e.message;throw e;}dirty=true;status='尚未保存：'+e.message+' 请保持本页打开并导出进度。';}
  state=next;
}
function load(){const result=store.load();error='';locked=false;invalid=false;dirty=false;
  if(result.status==='ok'){state=result.state;view='map';status='已保存到本机 · 已接续原有进度';try{persist(dispatch(data,state,{type:'refresh'}));}catch(e){status=e.message;}}
  else{state=newGame(data);view=result.status==='invalid'?'save':'welcome';invalid=result.status==='invalid';locked=invalid;status=invalid?'存档无法读取，原文与已有备份均保留。请恢复备份或导入；导出按钮可取回坏档原文。':result.status==='unavailable'?'本机存储不可用，可临时游玩，但务必导出进度。':'尚未入卷，点击进入后开始保存。';}
  paint(true);
}
function previewImport(next){pendingImport=next;document.getElementById('import-confirm')?.remove();root.insertAdjacentHTML('beforeend',importDialog(next));const dialog=document.getElementById('import-confirm');dialog.addEventListener('cancel',()=>{pendingImport=null;dialog.remove();});dialog.showModal();dialog.querySelector('button')?.focus();}
async function handle(command){
  const {type,id}=command;error='';
  if(type==='ui_export'){download(invalid&&store.raw?store.raw:JSON.stringify(state,null,2),'baize-shuihu-'+(invalid?'unreadable':new Date().toISOString().slice(0,10))+'.json');return;}
  if(type==='ui_reload'){if(dirty&&!window.confirm('本页还有未保存进度。请先导出。仍要重新载入本机存档吗？'))return;load();return;}
  if(type==='ui_import'){
    const file=document.getElementById('import-file').files[0];if(file&&file.size>2000000)throw new Error('存档不能超过 2 MB。');
    const raw=file?await file.text():document.getElementById('import-text').value;previewImport(store.import(raw));return;
  }
  if(type==='ui_backup'){previewImport(store.backup());return;}
  if(type==='ui_cancelImport'){pendingImport=null;document.getElementById('import-confirm')?.close();document.getElementById('import-confirm')?.remove();return;}
  if(type==='ui_confirmImport'){
    if(!pendingImport)throw new Error('请先检查导入内容。');
    // Import/reset are explicit replacement operations; quota errors must not claim success.
    const next=dispatch(data,pendingImport,{type:'refresh'});store.write(next,true);state=next;pendingImport=null;locked=false;invalid=false;dirty=false;status='已保存到本机 · 导入成功';view='map';paint(true);return;
  }
  if(type==='ui_reset'){
    if(document.getElementById('reset-phrase').value!=='白泽新卷')throw new Error('请输入“白泽新卷”确认。');
    if(!window.confirm('确认替换当前游戏进度？此操作不影响导航和学习记录。'))return;
    const next=newGame(data);store.write(next,true);state=next;locked=false;invalid=false;dirty=false;status='已保存到本机 · 新卷已开';view='welcome';paint();return;
  }
  if(locked)throw new Error(status);
  if(type==='ui_start'){persist(state);view='map';paint(true);return;}
  if(type==='ui_team')command={type:'team',ids:[0,1,2].map(i=>document.getElementById('team-'+i).value).filter(Boolean)};
  if(type==='ui_equip')command={type:'equip',id,hero:document.getElementById('holder-'+id).value||null};
  if(type==='ui_dismantle'){if(!window.confirm('确认分解此装备？装备将变为碎铁，不能原样取回。'))return;command={type:'dismantle',id};}
  const next=dispatch(data,state,command);persist(next);
  if(next.battle||next.scheme||next.event||['move','story','startScheme'].includes(type))view='map';
  paint(['move','story','startScheme','dungeon','search','finishBattle','finishScheme','eventChoice'].includes(type));
}
root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.view){view=button.dataset.view;error='';paint(true);return;}
  if(!button.dataset.command)return;button.disabled=true;
  try{await handle(JSON.parse(button.dataset.command));}
  catch(e){error=e.message||'操作未完成，原进度保留。';paint();}
  finally{if(button.isConnected)button.disabled=false;}
});
window.addEventListener('storage',event=>{if(store&&event.key===SAVE_KEY&&event.newValue!==store.raw){locked=true;status='另一标签页更新了游戏存档。本页暂停写入；可先导出，再在存档页重新载入。';paint();}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
function refreshClock(){if(!state||locked||invalid||view==='welcome'||view==='save'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;try{persist(dispatch(data,state,{type:'refresh'}));paint();}catch(e){error=e.message;paint();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshClock();});
try{
  data=await loadData();let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('浏览器禁止访问本机存储。');},setItem(){throw new Error('浏览器禁止访问本机存储。');}};}
  store=new SaveStore(storage,data);load();setInterval(refreshClock,60000);
}catch(e){root.innerHTML=`<main class="loading" id="main"><p class="kicker">白泽水浒 · 未能开卷</p><h1>江湖尚未载入</h1><p class="notice error">${esc(e.message)}</p><p>本次没有写入或清空任何存档。请联网后刷新再试；本地预览需通过 HTTP 服务打开，不要直接双击 HTML。</p><a href="./">重新载入</a> · <a href="../">返回白泽导航</a></main>`;}
