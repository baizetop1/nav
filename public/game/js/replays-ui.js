import {replayMissions,replayUnlocked,replayKey,REPLAY_DIFFICULTIES,ENDING_DEFINITIONS} from './replays-data.js?v=0.58.0';
import {replayReason} from './replays.js?v=0.58.0';
export function replaysPanel(s,d,esc,btn,view={}){
 const ids=Object.keys(replayMissions).filter(id=>replayUnlocked(s,id)),id=ids.includes(view.id)?view.id:ids[0],tier=view.tier===2?2:1;
 const nav=(name,a)=>btn(name,{type:'ui_replayView',...view,...a},'secondary');
 let out='<p class="note">独行回顾 · 不耗体力粮草 · 不用药 · 无奖励</p>';
 if(!id)return out+'<p>第三卷起，完成一段战役后会在这里出现。</p>';
 out+='<label>选择战役<select id="replay-mission">'+ids.map(k=>'<option value="'+k+'" '+(k===id?'selected':'')+'>'+esc(d.by.stories[k].title)+'</option>').join('')+'</select></label><nav class="special-tabs">'+Object.entries(REPLAY_DIFFICULTIES).map(([t,m])=>nav(m.name+(+t===tier?' · 已选':''),{id,tier:+t})).join('')+'</nav>';
 const key=replayKey(id,tier),q=replayReason(s,id,tier);
 out+='<div class="replay-summary">'+btn(q||'开始回顾',{type:'replayStart',id,tier},'primary',!!q)+'<p class="note">通关 '+(s.replays?.clears[key]||0)+' 次 · 最快 '+(s.replays?.best[key]===undefined?'未记录':(s.replays.best[key]/1000).toFixed(1)+' 秒')+'</p><details><summary>本战规则</summary><p class="note">'+(tier===1?'敌军气血、攻击、防御与谋略为原战役的 65%。':'敌军属性与原战役相同。')+'后五卷保留增援、护送和已有准备效果。</p></details></div>';

 if(s.progress.flags.volume_twelve_complete){out+='<details><summary>另外的去路 · 结局回顾</summary><nav class="special-tabs">'+Object.values(ENDING_DEFINITIONS).map(x=>nav(x.name,{ending:x.id})).join('')+'</nav>';const route=Object.hasOwn(ENDING_DEFINITIONS,view.ending)?view.ending:'stay',m=ENDING_DEFINITIONS[route],missions=['first','second','third'].map(k=>'v12_'+route+'_'+k),done=missions.every(k=>[1,2].some(t=>s.replays?.clears[replayKey(k,t)]));out+='<p class="note">此处只记回顾；通关这条路线三战后阅读结局，不改变正式选择。</p>'+missions.map(k=>nav(d.by.stories[k].title+([1,2].some(t=>s.replays?.clears[replayKey(k,t)])?' · 已过':''),{id:k,ending:route})).join('')+(done?'<details><summary>'+m.name+' · 阅读结局</summary>'+m.text.split('\n\n').map(t=>'<p>'+esc(t)+'</p>').join('')+'</details>':'')+'</details>';}
 return '<section class="special-panel">'+out+'</section>';
}
