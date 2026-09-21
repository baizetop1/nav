// CSS column fragmentation keeps text lines and controls intact while paging by viewport.
const mobile=matchMedia('(max-width:900px)'),books=new Map(),positions=new Map();let queued=0,observer,pressed=false;
export const screenInteractionActive=()=>mobile.matches&&pressed;
const gap=16;
function focused(){const el=document.activeElement;return el?.id?{id:el.id,start:el.selectionStart,end:el.selectionEnd}:null;}
function restoreFocus(saved){const el=saved&&document.getElementById(saved.id);if(el){el.focus({preventScroll:true});if(typeof saved.start==='number'&&el.setSelectionRange)try{el.setSelectionRange(saved.start,saved.end);}catch{}}}
function unwrap(host){const book=books.get(host);if(!book)return;positions.set(book.key,book.page);book.nav.remove();const fragment=document.createDocumentFragment();while(book.paper.firstChild)fragment.append(book.paper.firstChild);book.window.replaceWith(fragment);host.classList.remove('screen-paged');host.querySelectorAll('.page-keep,.page-flow').forEach(el=>el.classList.remove('page-keep','page-flow'));books.delete(host);}
export function beforeScreenPaint(){const focus=focused();observer?.disconnect();for(const host of [...books.keys()])if(!host.closest('dialog'))unwrap(host);return focus;}
function follow(host,index,user=false){const b=books.get(host);if(!b)return;b.page=Math.max(0,Math.min(b.count-1,Math.trunc(index)||0));positions.set(b.key,b.page);b.window.scrollLeft=b.page*(b.width+gap);b.nav.querySelector('output').textContent='/ '+b.count;b.nav.querySelector('input').value=String(b.page+1);b.nav.querySelector('[data-screen-prev]').disabled=b.page===0;b.nav.querySelector('[data-screen-next]').disabled=b.page===b.count-1;if(user&&host.id==='activity-log')window.dispatchEvent(new CustomEvent('baize-log-page',{detail:{latest:b.page===b.count-1}}));}
function paginate(host,key,reset=false){
 if(!host||!host.isConnected||!host.clientHeight)return;
 const old=books.get(host),savedPage=reset?0:(old?.key===key?old.page:positions.get(key)??0);unwrap(host);
 if(!mobile.matches)return;
 host.scrollTop=0;
 const style=getComputedStyle(host),available=host.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
 if(host.scrollHeight<=host.clientHeight+1)return;
 const fixed=[...host.children].filter(el=>el.matches('.section-picker,.page-sections,.journey-sections'));
 const first=document.createElement('div'),paper=document.createElement('div'),nav=document.createElement('nav');
 first.className='screen-window';paper.className='screen-paper';nav.className='screen-pager';nav.dataset.screenUi='true';nav.setAttribute('aria-label','内容翻页');nav.innerHTML='<button type="button" data-screen-prev aria-label="上一页">上一页</button><label class="screen-page-jump"><span class="sr-only">跳到第几页</span><input type="number" min="1" aria-label="跳到第几页"><output aria-live="polite"></output></label><button type="button" data-screen-next aria-label="下一页">下一页</button>';
 const nodes=[...host.childNodes].filter(el=>!fixed.includes(el));host.classList.add('screen-paged');first.append(paper);for(const el of nodes)paper.append(el);host.append(first,nav);
 const fixedHeight=fixed.reduce((n,e)=>n+e.getBoundingClientRect().height+parseFloat(getComputedStyle(e).marginTop)+parseFloat(getComputedStyle(e).marginBottom),0),height=Math.max(24,Math.floor(available-fixedHeight-nav.getBoundingClientRect().height-4)),width=Math.floor(first.clientWidth);
 paper.style.width=width+'px';
 for(const el of paper.querySelectorAll('*'))if(!el.matches('button,input,select,textarea,svg,svg *')&&el.children.length>1&&/^(inline-)?(grid|flex)$/.test(getComputedStyle(el).display)&&el.getBoundingClientRect().height>height*.72)el.classList.add('page-flow');
 // Keep small cards together; let oversized sections flow across pages instead of clipping.
 for(const el of paper.querySelectorAll('article,.card,.building-card,.battle-unit,.activity-entry,li,tr,.actions,.statline,.story-guide'))if(el.getBoundingClientRect().height<height*.92)el.classList.add('page-keep');
 first.style.height=height+'px';paper.style.height=height+'px';paper.style.columnWidth=width+'px';paper.style.columnGap=gap+'px';
 const count=Math.max(1,Math.ceil((paper.scrollWidth+gap)/(width+gap)));
 const book={key,page:savedPage,count,width,paper,window:first,nav};books.set(host,book);
 nav.querySelector('[data-screen-prev]').addEventListener('click',()=>follow(host,book.page-1,true));nav.querySelector('[data-screen-next]').addEventListener('click',()=>follow(host,book.page+1,true));
 const jump=nav.querySelector('input');jump.max=String(count);jump.addEventListener('change',()=>follow(host,(Number(jump.value)||1)-1,true));jump.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();follow(host,(Number(jump.value)||1)-1,true);}});
 first.addEventListener('wheel',e=>e.preventDefault(),{passive:false});first.addEventListener('touchmove',e=>{if(!e.target.closest('input,textarea,select'))e.preventDefault();},{passive:false});
 first.addEventListener('scroll',()=>{if(books.get(host)===book)follow(host,Math.round(first.scrollLeft/(width+gap)));});
 first.addEventListener('focusin',e=>{const rect=e.target.getBoundingClientRect(),base=first.getBoundingClientRect(),absolute=rect.left-base.left+first.scrollLeft;follow(host,Math.floor(Math.max(0,absolute)/(width+gap)));});
 follow(host,host.id==='activity-log'&&host.dataset.followLatest==='true'?count-1:savedPage);
}
function adaptDialog(dialog){
 if(!dialog.querySelector(':scope > .dialog-body')){
  const body=document.createElement('div'),header=document.createElement('header'),footer=document.createElement('footer');body.className='dialog-body';header.className='dialog-header';footer.className='dialog-footer';
  const heading=dialog.querySelector('h2'),actions=dialog.querySelector(':scope > .actions,:scope > .result-actions'),close=dialog.querySelector(':scope > [data-reward-close]');
  if(heading)header.append(heading);
  for(const node of [...dialog.childNodes])if(node!==actions&&node!==close)body.append(node);
  if(actions)footer.append(actions);if(close)footer.append(close);
  dialog.append(header,body,footer);dialog.classList.add('compact-dialog','screen-dialog');
 }
 const body=dialog.querySelector(':scope > .dialog-body');paginate(body,'dialog:'+dialog.id+':'+(dialog.querySelector('[data-dialog-tab][aria-selected=true]')?.dataset.dialogTab||''));
}
function observe(){observer?.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});}
function refresh(){queued=0;observer?.disconnect();for(const host of books.keys())if(!host.isConnected)books.delete(host);const focus=focused();
 const main=document.getElementById('main');if(main?.closest('.viewport-shell'))paginate(main,'main:'+main.dataset.screen+':'+(main.querySelector('[data-page-section]')?.dataset.pageSection||main.querySelector('[data-journey-section]')?.dataset.journeySection||''));
 for(const dialog of document.querySelectorAll('dialog[open]')){if(mobile.matches)adaptDialog(dialog);else {const body=dialog.querySelector('.dialog-body');if(body)unwrap(body);}}
 const log=document.getElementById('activity-log');if(log?.clientHeight)paginate(log,'activity-log');
 restoreFocus(focus);observe();
}
function schedule(){if(!queued)queued=requestAnimationFrame(refresh);}
export function afterScreenPaint(focus,reset=false){
 const main=document.getElementById('main'),key=main?'main:'+main.dataset.screen+':'+(main.querySelector('[data-page-section]')?.dataset.pageSection||main.querySelector('[data-journey-section]')?.dataset.journeySection||''):'';
 if(reset)positions.delete(key);refresh();if(!reset)restoreFocus(focus);
}
export function installScreenPages(){
 document.addEventListener('pointerdown',e=>{pressed=!!e.target.closest('#main,dialog,.activity-panel');},true);document.addEventListener('pointerup',()=>{pressed=false;},true);document.addEventListener('pointercancel',()=>{pressed=false;},true);window.addEventListener('blur',()=>{pressed=false;});
 observer=new MutationObserver(records=>{if(records.some(r=>{const el=r.target.nodeType===1?r.target:r.target.parentElement;return el?.closest('dialog[open]')&&!el.closest('.screen-pager');}))schedule();});observe();
 document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS')schedule();},true);
 document.addEventListener('load',e=>{if(e.target.tagName==='IMG')schedule();},true);
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);mobile.addEventListener('change',schedule);
 document.addEventListener('click',e=>{if(e.target.closest('[data-log-toggle],[data-log-latest]'))schedule();},true);
}
