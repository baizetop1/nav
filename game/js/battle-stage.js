import {patchElement} from './dom.js?v=0.88.0';
import {BattleLogPlayback,battleLogView} from './battle-playback.js?v=0.88.0';
export function createBattleStage({render,onCommand,onHide}){
 let dialog=null,key=null,elapsed=0,lastWall=0,wasRunning=false,follow=true,reading=null,openingLogs=[];
 const playback=new BattleLogPlayback();
 const close=()=>{const old=dialog;dialog=null;if(old){old.close();old.remove();}document.body.classList.remove('battle-stage-open');};
 const reset=()=>{key=null;elapsed=0;lastWall=0;wasRunning=false;follow=true;reading=null;openingLogs=[];playback.reset([]);};
 function sync(options){
  const b=options.state?.battle,now=performance.now();
  if(!b){close();reset();return;}
  const identity=JSON.stringify(b.context),projected=battleLogView(b.log,key===identity&&b.elapsed>=elapsed?openingLogs:[]);
  if(key!==identity||b.elapsed<elapsed){playback.reset(projected.logs,b.elapsed>0);openingLogs=projected.openingLogs;key=identity;follow=true;reading=null;}
  else {playback.feed(projected.logs);if(projected.openingLogs.length)openingLogs=projected.openingLogs;}
  elapsed=b.elapsed;
  const running=options.visible&&!options.battlePaused&&!options.locked&&!document.hidden&&!!dialog?.open;
  if(running&&wasRunning&&lastWall)playback.advance(Math.max(0,now-lastWall),options.battleSpeed);
  lastWall=now;wasRunning=running;
  if(!options.visible||b.outcome&&!playback.busy){close();return;}
  if(!dialog){
   if(document.querySelector('dialog[open]'))return;
   const node=document.createElement('dialog');node.id='battle-stage-dialog';node.className='battle-stage-dialog';node.dataset.dialogLayout='grid';node.setAttribute('aria-labelledby','battle-stage-title');
   node.addEventListener('keydown',event=>{const tab=event.target.closest('[role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...node.querySelectorAll('[role=tab]')],i=tabs.indexOf(tab),n=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;event.preventDefault();tabs[n].click();tabs[n].focus({preventScroll:true});});
   node.addEventListener('click',onCommand);node.addEventListener('cancel',event=>{event.preventDefault();onHide();});node.addEventListener('close',()=>{if(dialog===node)onHide();});
   node.addEventListener('scroll',event=>{const log=event.target;if(log.id!=='battle-stage-log')return;follow=log.scrollHeight-log.clientHeight-log.scrollTop<12;if(!follow){const rect=log.getBoundingClientRect(),line=[...log.children].find(e=>e.getBoundingClientRect().bottom>rect.top);reading=line?{text:line.textContent,offset:line.getBoundingClientRect().top-rect.top,scroll:log.scrollTop}:null;}},true);
   document.body.append(node);dialog=node;document.body.classList.add('battle-stage-open');
  }
  const oldLog=dialog.querySelector('#battle-stage-log'),scroll=oldLog?.scrollTop||0,folds=[...dialog.querySelectorAll('details')].map(e=>e.open),focus=document.activeElement,selection=focus?.tagName==='SELECT'?{id:focus.id,value:focus.value}:null;
  const next=document.createElement('template');next.innerHTML=render({...options,logs:playback.lines,openingLogs,readingOutcome:!!b.outcome&&playback.busy});
  if(dialog.firstElementChild)patchElement(dialog.firstElementChild,next.content.firstElementChild);else dialog.append(next.content);
  [...dialog.querySelectorAll('details')].forEach((e,i)=>e.open=folds[i]||false);
  const log=dialog.querySelector('#battle-stage-log');
  if(log){if(follow)log.scrollTop=log.scrollHeight;else{const line=reading&&[...log.children].find(e=>e.textContent===reading.text);log.scrollTop=line?log.scrollTop+line.getBoundingClientRect().top-log.getBoundingClientRect().top-reading.offset:scroll;}}
  if(selection){const el=dialog.querySelector('#'+selection.id);if(el)el.value=selection.value;}
  if(!dialog.open){dialog.showModal();dialog.querySelector('#battle-stage-title')?.focus({preventScroll:true});}
 }
 return {sync,close,clear(){close();reset();},awaitingLogs:()=>playback.busy,isOpen:()=>!!dialog?.open,latest(){follow=true;reading=null;const log=dialog?.querySelector('#battle-stage-log');if(log)log.scrollTop=log.scrollHeight;}};
}
