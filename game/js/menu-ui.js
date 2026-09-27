// Navigation only: these entries select existing pages without issuing game commands.
export const FUNCTION_GROUPS = [
  {id:'journey',label:'历练',entries:[
    {label:'主线',view:'map',map:'story'}, {label:'地图',view:'map',map:'atlas'},
    {label:'游历',view:'realm',section:'journey'}, {label:'每日副本',view:'trials',section:'daily'},
    {label:'资源副本',view:'trials',section:'resources'}, {label:'周本',view:'trials',section:'weekly'}, {label:'特殊副本',view:'trials',section:'special'}]},
  {id:'camp',label:'寨务',entries:[
    {label:'营建',view:'camp',section:'buildings'}, {label:'募兵',view:'camp',section:'troops'},
    {label:'寨事',view:'camp',section:'affairs'}, {label:'生产',view:'camp',section:'production'},
    {label:'打造',view:'forge',section:'craft'}, {label:'招贤',view:'recruit',section:'ordinary'}]},
  {id:'heroes',label:'好汉',entries:[
    {label:'名册',view:'heroes',section:'roster'}, {label:'阵容',view:'heroes',section:'formation'},
    {label:'升级',view:'heroes',section:'training'}, {label:'招式',view:'heroes',section:'skills'},
    {label:'兵种',view:'heroes',section:'corps'}, {label:'品阶',view:'heroes',section:'quality'}]},
  {id:'other',label:'其他',entries:[
    {label:'行囊',view:'bag',section:'supplies'}, {label:'差事',view:'quests'},
    {label:'梁山志',view:'chronicle'}, {label:'存档',view:'save',section:'local'},
    {label:'套装图鉴',view:'forge',section:'sets'}, {label:'演武',view:'camp',section:'mentorship'}]}
];
export function functionMenu({busy=false,view='camp',section='',mapSection='story'}={}){
  const current=e=>e.view===view&&(!e.section||e.section===section)&&(!e.map||e.map===mapSection);
  const selected=FUNCTION_GROUPS.find(g=>g.entries.some(current))?.id||'journey';
  const allowed=e=>!busy||['save','chronicle'].includes(e.view)||(e.view==='map'&&e.map==='story');
  return '<dialog id="function-menu" class="function-menu" data-dialog-layout="grid" aria-modal="true" aria-labelledby="function-menu-title">'+
    '<header class="function-menu-heading"><h2 id="function-menu-title">更多</h2><button type="button" data-menu-close aria-label="关闭更多功能" autofocus>×</button></header>'+
    (busy?'<p class="function-menu-note">返回主线继续当前行程。</p>':'')+
    '<nav class="function-menu-tabs" aria-label="功能分类">'+FUNCTION_GROUPS.map(g=>'<button type="button" data-menu-group-tab="'+g.id+'" aria-controls="function-group-'+g.id+'" aria-pressed="'+(g.id===selected)+'">'+g.label+'</button>').join('')+'</nav>'+
    '<div class="function-menu-groups">'+FUNCTION_GROUPS.map(g=>'<section class="function-menu-group" data-menu-group="'+g.id+'" data-selected="'+(g.id===selected)+'" id="function-group-'+g.id+'" aria-labelledby="function-label-'+g.id+'"><h3 id="function-label-'+g.id+'">'+g.label+'</h3><div class="function-menu-grid">'+g.entries.map(e=>'<button type="button" data-view="'+e.view+'"'+(e.section?' data-menu-section="'+e.section+'"':'')+(e.map?' data-menu-map="'+e.map+'"':'')+(current(e)?' aria-current="page"':'')+(!allowed(e)?' disabled':'')+'>'+e.label+'</button>').join('')+'</div></section>').join('')+'</div></dialog>';
}
export function showFunctionMenu(root,options,invoker){
  if(root.querySelector('dialog[open]'))return;
  root.insertAdjacentHTML('beforeend',functionMenu(options));
  const dialog=root.querySelector('#function-menu');
  const triggers=()=>root.querySelectorAll('[data-view="menu"]');
  triggers().forEach(b=>b.setAttribute('aria-expanded','true'));
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-menu-close]')){dialog.close();return;}
    const tab=event.target.closest('[data-menu-group-tab]');
    if(tab){
      dialog.querySelectorAll('[data-menu-group-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));
      dialog.querySelectorAll('[data-menu-group]').forEach(g=>g.dataset.selected=String(g.dataset.menuGroup===tab.dataset.menuGroupTab));
    }
  });
  // Close only when both ends of the pointer gesture were outside the panel.
  let backdrop=false;
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);};
  dialog.addEventListener('pointerdown',event=>{backdrop=outside(event);});
  dialog.addEventListener('pointerup',event=>{if(backdrop&&outside(event))dialog.close();backdrop=false;});
  dialog.addEventListener('close',()=>{
    triggers().forEach(b=>b.setAttribute('aria-expanded','false'));
    dialog.remove();
    if(dialog.returnValue!=='navigate'&&invoker?.isConnected)invoker.focus({preventScroll:true});
  },{once:true});
  dialog.showModal();
  return dialog;
}
