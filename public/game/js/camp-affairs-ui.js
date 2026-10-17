import {PAGE_SECTIONS} from './page-sections.js?v=0.91.0';

export const CAMP_AFFAIRS_GROUPS=Object.freeze([
 {id:'village',label:'寨中',entries:['settlement','life','scene','notices','crossRegion','mentorship']},
 {id:'building',label:'营建',entries:['buildings','exploration','production','goals','ledger','exploreGoals']},
 {id:'travel',label:'出行',entries:['grainRoad','preparation','formation','raids','duties','lessons']},
 {id:'military',label:'军务',entries:['idle','affairs','troops','supply']}
]);
// UI categories keep the original commands and never claim rewards or advance the clock.
export function campAffairs(notices,esc,btn,support=''){
 const labels={pending:'待办',...Object.fromEntries(CAMP_AFFAIRS_GROUPS.map(g=>[g.id,g.label]))};
 const tabs='<nav class="camp-affairs-tabs" role="tablist" aria-label="寨务分类">'+Object.entries(labels).map(([id,label])=>'<button type="button" role="tab" id="camp-affairs-tab-'+id+'" aria-controls="camp-affairs-panel-'+id+'" aria-selected="'+(id==='pending')+'" tabindex="'+(id==='pending'?'0':'-1')+'" data-camp-affairs-tab="'+id+'">'+label+(id==='pending'&&notices.length?'<small>'+notices.length+'</small>':'')+'</button>').join('')+'</nav>';
 const pane=(id,content)=>'<section role="tabpanel" id="camp-affairs-panel-'+id+'" aria-labelledby="camp-affairs-tab-'+id+'" data-camp-affairs-panel="'+id+'" '+(id==='pending'?'':'hidden')+'>'+content+'</section>';
 const pending=(notices.length?'<div class="camp-affairs-notices">'+notices.map(n=>n.view?'<button type="button" class="secondary camp-affairs-notice" data-view="'+esc(n.view)+'">'+esc(n.label)+'</button>':btn(n.label,{type:'ui_campJump',id:n.target},'secondary camp-affairs-notice')).join('')+'</div>':'<p class="camp-affairs-empty">没有待处理的寨务。</p>');
 return '<div class="camp-affairs">'+tabs+pane('pending',pending)+CAMP_AFFAIRS_GROUPS.map(g=>pane(g.id,'<div class="camp-affairs-grid">'+g.entries.map(id=>btn(PAGE_SECTIONS.camp[id],{type:'ui_section',view:'camp',id},'secondary')).join('')+'</div>'+(g.id==='travel'&&support?'<div class="camp-affairs-support">'+support+'</div>':''))).join('')+'</div>';
}
export function handleCampAffairs(event){
 const current=event.target.closest?.('[data-camp-affairs-tab]'),host=current?.closest('.camp-affairs');
 if(!host||!['click','keydown'].includes(event.type))return false;
 const tabs=[...host.querySelectorAll('[data-camp-affairs-tab]')];let selected=current;
 if(event.type==='keydown'){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return false;
  const i=tabs.indexOf(current),n=tabs.length;selected=tabs[event.key==='Home'?0:event.key==='End'?n-1:(i+(event.key==='ArrowRight'?1:n-1))%n];
 }
 event.preventDefault();
 for(const tab of tabs){tab.setAttribute('aria-selected',String(tab===selected));tab.tabIndex=tab===selected?0:-1;}
 for(const panel of host.querySelectorAll('[data-camp-affairs-panel]'))panel.hidden=panel.dataset.campAffairsPanel!==selected.dataset.campAffairsTab;
 const body=host.closest('.dialog-body');if(body)body.scrollTop=0;
 if(event.type==='keydown')selected.focus({preventScroll:true});
 document.dispatchEvent(new Event('baize-screen-layout'));return true;
}
