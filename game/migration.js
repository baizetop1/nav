'use strict';
// Read-only legacy entry. It never loads the old game, sends account data, or writes a save.
const DB_NAME='baize-shuihu-box',LIMIT=2000000,status=document.getElementById('status'),list=document.getElementById('slots'),refresh=document.getElementById('refresh');
const credentials=/^(?:password|passwd|secret|key[_-]?pepper|admin[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|token|session)$/i;
let records=[];
function announce(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function safeState(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>LIMIT)throw Error('这份旧档超过导入大小限制，请先保留原设备。');
 const state=JSON.parse(raw);if(!state||Array.isArray(state)||typeof state!=='object'||!state.player||!state.heroes||!Number.isInteger(state.version))throw Error('这份旧档格式暂不能识别，请先保留原设备。');
 let visited=0;function copy(value,depth=0){if(++visited>200000||depth>80)throw Error('旧档结构异常，请先保留原设备。');if(Array.isArray(value))return value.map(v=>copy(v,depth+1));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!credentials.test(key)).map(([key,v])=>[key,copy(v,depth+1)]));return value;}
 return copy(state);
}
async function readSlots(){
 if(!globalThis.indexedDB)return [];
 if(indexedDB.databases){const databases=await indexedDB.databases();if(!databases.some(x=>x.name===DB_NAME))return [];}
 const db=await new Promise((resolve,reject)=>{let missing=false;const request=indexedDB.open(DB_NAME);request.onupgradeneeded=()=>{missing=true;request.transaction.abort();};request.onsuccess=()=>resolve(request.result);request.onerror=()=>missing?resolve(null):reject(request.error);request.onblocked=()=>reject(Error('请先关闭其他旧游戏标签，再点「查看旧存档」。'));});
 if(!db)return [];try{if(!db.objectStoreNames.contains('slots'))return [];return await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readonly'),q=tx.objectStore('slots').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}finally{db.close();}
}
function saveFile(record,kind){
 try{const state=safeState(kind==='backup'?record.backup:record.raw),name=String(record.name||'旧江湖').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,40)||'旧江湖',body=JSON.stringify({format:'baize-shuihu-box',version:1,name,localSlot:record.id,state});if(new TextEncoder().encode(body).length>LIMIT)throw Error('这份旧档超过导入大小限制，请先保留原设备。');const blob=new Blob([body],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='白泽水浒_'+String(record.id).padStart(2,'0')+'_'+name.replace(/[<>:"/\\|?*]/g,'_')+(kind==='backup'?'_备份':'_当前')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已准备导出「'+name+'」。到新站的存档管理中选择这份文件即可。');}catch(error){announce(error.message||'暂时无法导出，请先保留原设备。',true);}
}
async function load(){refresh.disabled=true;announce('正在查看此浏览器的旧存档……');try{records=(await readSlots()).filter(r=>Number.isInteger(r.id)&&r.id>=1&&r.id<=20&&(typeof r.raw==='string'&&r.raw||typeof r.backup==='string'&&r.backup)).sort((a,b)=>a.id-b.id);list.replaceChildren();for(const r of records){const li=document.createElement('li'),title=document.createElement('strong'),actions=document.createElement('div');title.textContent=String(r.id).padStart(2,'0')+' · '+String(r.name||'旧江湖');actions.className='actions';for(const[kind,label]of[['current','导出当前进度'],['backup','导出本机备份']])if(typeof(kind==='backup'?r.backup:r.raw)==='string'&&(kind==='backup'?r.backup:r.raw)){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.slot=String(r.id);b.dataset.kind=kind;b.addEventListener('click',()=>saveFile(r,kind));actions.append(b);}li.append(title,actions);list.append(li);}announce(records.length?'找到 '+records.length+' 份旧存档。请先导出需要保留的进度。':'此浏览器没有找到旧存档。已有云存档的玩家可直接前往新站登录。');}catch(error){announce(error.message||'暂时无法读取旧存档，请先保留原设备。',true);}finally{refresh.disabled=false;}}
refresh.addEventListener('click',load);load();
