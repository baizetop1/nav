// Dialog tabs and receipt pagination change presentation only, never game state.
export function bindDialogPages(dialog){
 dialog.addEventListener('click',event=>{
  const tab=event.target.closest('[data-dialog-tab]');
  if(tab&&dialog.contains(tab)){
   const id=tab.dataset.dialogTab;
   for(const button of dialog.querySelectorAll('[data-dialog-tab]'))button.setAttribute('aria-selected',String(button===tab));
   for(const panel of dialog.querySelectorAll('[data-dialog-panel]'))panel.hidden=panel.dataset.dialogPanel!==id;
   dialog.querySelector('.dialog-body').scrollTop=0;
  }
  const page=event.target.closest('[data-reward-page]');
  if(page&&dialog.contains(page)){
   const pages=[...dialog.querySelectorAll('[data-reward-sheet]')],current=pages.findIndex(p=>!p.hidden),next=Math.max(0,Math.min(pages.length-1,current+Number(page.dataset.rewardPage)));
   pages.forEach((p,i)=>{p.hidden=i!==next;});
   dialog.querySelector('[data-reward-counter]').textContent=(next+1)+' / '+pages.length;
   dialog.querySelector('[data-reward-page="-1"]').disabled=next===0;
   dialog.querySelector('[data-reward-page="1"]').disabled=next===pages.length-1;
   dialog.querySelector('.dialog-body').scrollTop=0;
  }
 });
 dialog.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-dialog-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...dialog.querySelectorAll('[data-dialog-tab]')],i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
  event.preventDefault();tabs[next].click();tabs[next].focus();
 });
}
export function dialogTabs(prefix,labels,active){return '<nav class="dialog-tabs" role="tablist" aria-label="切换查看内容">'+Object.entries(labels).map(([id,label])=>'<button type="button" role="tab" id="'+prefix+'-tab-'+id+'" aria-controls="'+prefix+'-panel-'+id+'" aria-selected="'+(id===active)+'" data-dialog-tab="'+id+'">'+label+'</button>').join('')+'</nav>';}
export function dialogPanel(prefix,id,content,active){return '<section role="tabpanel" id="'+prefix+'-panel-'+id+'" aria-labelledby="'+prefix+'-tab-'+id+'" data-dialog-panel="'+id+'" '+(id===active?'':'hidden')+'>'+content+'</section>';}
