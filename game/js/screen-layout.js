import {handleCampAffairs} from './camp-affairs-ui.js?v=0.91.0';
// Mobile presentation only: keep selected work visible and open long explanations separately.
const projections=new WeakMap(),decks=new WeakMap(),choices=new Map();let activeDetail=null,releaseDetail=()=>{};
const mobile=()=>matchMedia('(max-width:900px)').matches;
const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
const name=el=>el.dataset.screenLabel||text(el.querySelector(':scope > summary,:scope > h2,:scope > h3,.building-heading>span,.section-top h3,.helper-identity h3,.helper-identity strong,.goal-heading h2'))||text(el.querySelector('h2,h3,strong'))||text(el).slice(0,24);
const keyOf=(el,i)=>el.id||el.dataset.screenId||el.dataset.gear||el.dataset.forgeModel||el.dataset.recipe||name(el)||String(i);
export const screenDetailOpen=()=>!!activeDetail;
function closeDetail(focus=true){
 const item=activeDetail;if(!item)return;activeDetail=null;releaseDetail(item.body);
 for(const node of [...item.body.childNodes])item.source.append(node);
 item.dialog.remove();if(focus&&item.summary.isConnected)item.summary.focus({preventScroll:true});
 document.dispatchEvent(new Event('baize-screen-layout'));
}
export function restoreScreenLayout(main){
 const p=main&&projections.get(main);if(!p)return;
 for(const undo of p.reverse())undo();projections.delete(main);
}
export function beforeLayoutPaint(main){closeDetail(false);restoreScreenLayout(main);}
function deck(container,panels,label,key,undo){
 if(panels.length<2||container.closest('details:not([open])'))return;
 const picker=document.createElement('label'),select=document.createElement('select');picker.className='screen-choice';select.id='screen-choice-'+encodeURIComponent(key);picker.append(document.createTextNode(label));select.setAttribute('aria-label',label);picker.append(select);
 const raw=panels.map(keyOf),ids=raw.map((id,i)=>raw.indexOf(id)===raw.lastIndexOf(id)?id:id+':'+i),saved=choices.get(key),selected=ids.includes(saved)?saved:ids[0];
 panels.forEach((p,i)=>{const option=document.createElement('option');option.value=ids[i];option.textContent=(name(p)||label+' '+(i+1))+(ids[i]!==raw[i]?' · '+(i+1):'');select.append(option);});select.value=selected;
 const hidden=panels.map(p=>p.hidden),hadClass=container.classList.contains('screen-deck');
 const show=()=>panels.forEach((p,i)=>{p.hidden=ids[i]!==select.value;const picker=p.previousElementSibling;if(picker?.classList.contains('screen-choice'))picker.hidden=p.hidden;});
 select.addEventListener('change',()=>{choices.set(key,select.value);if(choices.size>250)choices.delete(choices.keys().next().value);show();document.dispatchEvent(new Event('baize-screen-layout'));});
 container.classList.add('screen-deck');container.before(picker);picker.hidden=container.hidden;decks.set(container,{panels});show();
 undo.push(()=>{picker.remove();decks.delete(container);panels.forEach((p,i)=>p.hidden=hidden[i]);if(!hadClass)container.classList.remove('screen-deck');});
}
function foldBlock(element,label,undo){
 if(!element||element.closest('details'))return;
 const fold=document.createElement('details'),summary=document.createElement('summary');summary.textContent=label;summary.id='screen-info-'+(element.id||element.classList[0]+'-'+undo.length);fold.className='screen-info';element.before(fold);fold.append(summary,element);undo.push(()=>fold.replaceWith(element));
}
function combine(container,nodes,label,key,undo){
 if(nodes.length<2)return;const wrap=document.createElement('div');nodes[0].before(wrap);const markers=nodes.map(node=>{const marker=document.createComment('screen-part');node.before(marker);wrap.append(node);return marker;});
 undo.push(()=>{nodes.forEach((node,i)=>markers[i].replaceWith(node));wrap.remove();});deck(wrap,nodes,label,key,undo);
}
function splitHeadings(container,label,key,undo){
 const nodes=[...container.childNodes],headings=nodes.filter(n=>n.nodeType===1&&n.matches('h2,h3'));if(headings.length<2)return;
 const wrap=document.createElement('div'),start=nodes.indexOf(headings[0]);headings[0].before(wrap);let pane;
 for(const node of nodes.slice(start)){if(headings.includes(node)){pane=document.createElement('section');pane.dataset.screenLabel=text(node);wrap.append(pane);}pane.append(node);}
 undo.push(()=>{const fragment=document.createDocumentFragment();for(const p of [...wrap.children])fragment.append(...p.childNodes);wrap.replaceWith(fragment);});deck(wrap,[...wrap.children],label,key,undo);
}
const groups=[
 ['.building-grid','选择设施'],['.duty-grid','选择差事'],['.production-grid','选择生产点'],['.frontier-grid','选择据点'],
 ['.raid-grid','选择寨战'],['.forge-catalog','选择兵甲'],['.equipment-inventory','选择装备'],['.helpers-grid','选择帮手'],['.preset-grid','选择方案'],
 ['.atlas-chart','选择区域'],['.growth-skills','选择招式'],['.battle-grid','选择阵营'],['.battle-grid>section','选择人物'],['.realm-grid','选择项目'],['.rotation-grid','选择挑战'],['.idle-production','选择产出'],['.medicine-grid','选择药品']
];
export function prepareScreenLayout(main){
 restoreScreenLayout(main);if(!main||!mobile())return;
 const undo=[],base=main.dataset.screen+':'+(main.querySelector('[data-page-section]')?.dataset.pageSection||main.querySelector('[data-journey-section]')?.dataset.journeySection||'');
 const transport=main.querySelector('.live-battle>.battle-transport');if(transport){const marker=document.createComment('battle-controls');transport.before(marker);main.prepend(transport);undo.push(()=>marker.replaceWith(transport));}
 main.querySelectorAll('.equipment-tools').forEach(el=>foldBlock(el,'筛选与整理装备',undo));
 main.querySelectorAll('.corps-panel>.hero-specialty').forEach(el=>foldBlock(el,'行军与任职',undo));
 main.querySelectorAll('.realm-section:not([data-recipe-category])').forEach((el,i)=>splitHeadings(el,'查看内容',base+':realm:'+i,undo));
 if(main.dataset.screen==='quests'&&!main.querySelector('.quests-compact')){
  const sections=[...main.children].filter(e=>e.matches('section,details'));combine(main,sections,'待办事项',base+':quests',undo);
  sections.forEach((el,i)=>{const cards=[...el.children].filter(e=>e.matches('article'));combine(el,cards,'选择任务',base+':quest:'+i,undo);});
 }
 for(const [selector,label]of groups)main.querySelectorAll(selector).forEach((container,i)=>{
  const panels=[...container.children].filter(p=>p.matches('article,section,div,details')&&!p.hidden);
  deck(container,panels,label,base+':'+selector+':'+i,undo);
 });
 for(const [i,container]of [...main.querySelectorAll('[data-screen-deck]')].entries())deck(container,[...container.children].filter(p=>p.matches('[data-screen-choice]')),container.dataset.screenDeck,base+':custom:'+i,undo);
 const story=main.querySelector('#map-local:not(.journey-scene)');
 if(story){
  const remoteGuide=story.querySelector(':scope>.story-guide:not(.story-guide-arrived)');
  const extras=[...story.querySelectorAll('.journey-story>.local-optional,:scope>details:not(.screen-info)')];
  if(remoteGuide)extras.push(remoteGuide);
  if(extras.length){
   const wrap=document.createElement('div');wrap.className='story-local-options';extras[0].before(wrap);
   const markers=extras.map(el=>{const mark=document.createComment('story-extra');el.before(mark);wrap.append(el);return mark;});
   undo.push(()=>{extras.forEach((el,i)=>markers[i].replaceWith(el));wrap.remove();});
   foldBlock(wrap,remoteGuide?'主线去向与此地事务':'此地事务与往事',undo);
  }
  const cards=[...story.querySelectorAll('.journey-story>article')];if(cards.length>1)combine(cards[0].parentElement,cards,'选择剧情',base+':story-cards',undo);
 }
 const guide=main.querySelector('.onboarding-guide'),footer=document.querySelector('.viewport-shell>.footer');
 if(guide?.classList.contains('guide-closed')&&footer){const marker=document.createComment('guide');guide.before(marker);footer.insertBefore(guide,footer.lastElementChild);guide.classList.add('footer-guide');undo.push(()=>{marker.replaceWith(guide);guide.classList.remove('footer-guide');});}
 else if(guide&&!guide.classList.contains('guide-prompt')){const header=guide.firstElementChild,description=guide.querySelector('p'),nav=guide.querySelector('nav');if(header&&description&&nav){const fold=document.createElement('details'),summary=document.createElement('summary');fold.className='guide-brief';summary.id='screen-guide-summary';summary.textContent=text(header.querySelector('strong'))+' · 指引';fold.append(summary,description,nav);guide.prepend(fold);guide.classList.add('guide-compact');undo.push(()=>{guide.append(description,nav);fold.remove();guide.classList.remove('guide-compact');});}}
 projections.set(main,undo);
}
export function installScreenLayout({release=()=>{}}={}){
 releaseDetail=release;
 document.addEventListener('keydown',event=>handleCampAffairs(event));
 document.addEventListener('click',event=>{
  if(handleCampAffairs(event))return;
  if(activeDetail&&event.target.closest('#screen-detail button[data-command],#screen-detail button[data-view],#screen-detail [data-guide-locate],#screen-detail [data-guide-toggle]')){closeDetail(false);return;}
  const summary=event.target.closest('summary'),source=summary?.parentElement;
  if(!mobile()||!source||source.tagName!=='DETAILS'||!source.closest('#main')||source.hasAttribute('data-inline-details'))return;
  event.preventDefault();if(activeDetail)return;
  const dialog=document.createElement('dialog');dialog.id='screen-detail';dialog.className='compact-dialog screen-detail';dialog.setAttribute('aria-labelledby','screen-detail-title');
  if(source.dataset.fold==='camp-all-functions'){dialog.classList.add('camp-affairs-dialog');dialog.dataset.dialogLayout='grid';}
  const header=document.createElement('header');header.className='dialog-header';const heading=document.createElement('h2');heading.id='screen-detail-title';heading.tabIndex=-1;heading.textContent=text(summary);header.append(heading);
  const close=document.createElement('button');close.type='button';close.className='secondary';close.textContent='×';close.setAttribute('aria-label','关闭详情');header.append(close);
  const body=document.createElement('div');body.className='dialog-body';
  for(const node of [...source.childNodes])if(node!==summary)body.append(node);
  const footer=document.createElement('footer');footer.className='dialog-footer';const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='返回';footer.append(back);dialog.append(header,body,footer);
  activeDetail={source,summary,body,dialog};document.getElementById('app').append(dialog);close.onclick=back.onclick=()=>closeDetail();dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});dialog.addEventListener('close',()=>{if(activeDetail?.dialog===dialog)closeDetail();},{once:true});dialog.showModal();heading.focus({preventScroll:true});
  document.dispatchEvent(new Event('baize-screen-layout'));
 },true);
 document.addEventListener('baize-screen-reveal',event=>{const target=event.detail?.target;if(!target)return;const main=document.getElementById('main');for(const select of main?.querySelectorAll('.screen-choice select')||[]){const container=select.parentElement.nextElementSibling,panels=decks.get(container)?.panels||[],index=panels.findIndex(p=>p===target||p.contains(target));if(index>=0){select.value=select.options[index].value;select.dispatchEvent(new Event('change',{bubbles:true}));}}});
}
