import {icon} from './icons.js?v=0.84.0';
import {storyRevisitList,storyRevisitQuote} from './story-revisits.js?v=0.84.0';
import {difficultyLabel} from './difficulty.js?v=0.84.0';
import {enemyIntel} from './martial-ui.js?v=0.84.0';
const numbers=(reward,data)=>Object.entries(reward?.guaranteed||{}).map(([id,n])=>(data.by.items[id]?.name||id)+' ×'+n);
export function storyRevisitPanel(s,d,esc,btn,selected){
 const rows=storyRevisitList(s,d),current=rows.find(row=>row.id===selected)||rows.find(row=>row.unlocked)||rows[0];
 if(!current)return '<section class="story-revisit" id="story-revisits"><h2>'+icon('trials')+'剧情副本</h2><p>暂无历练。</p></section>';
 const q=storyRevisitQuote(s,d,current.id),m=q.dungeon,reward=q.reward;
 const fixed=[...(reward?.silver?['碎银 ×'+reward.silver]:[]),...numbers(reward,d)],chance=(reward?.items||[]).map(drop=>'<p class="note">'+esc(d.by.items[drop.id]?.name||drop.id)+' ×'+drop.count+' · '+Math.round(drop.rate*10000)/100+'%</p>').join('');
 return '<section class="story-revisit" id="story-revisits"><header class="section-top"><h2>'+icon('trials')+'剧情副本</h2><span class="note">已开放 '+rows.filter(row=>row.unlocked).length+' / '+rows.length+'</span></header><label>选择历练<select id="story-revisit-id">'+rows.map(row=>'<option value="'+row.id+'" '+(row.id===m.id?'selected':'')+'>'+esc(row.name)+' · '+(row.unlocked?'今日余 '+row.remaining+' 次':'未开放')+'</option>').join('')+'</select></label><article class="card story-revisit-mission"><div class="section-top"><h3>'+esc(m.name)+'</h3><span class="note">今日 '+q.remaining+' / '+m.limit+' 次</span></div><p class="note">'+(q.difficulty?difficultyLabel(q.difficulty):'计策历练 · 不直接交战')+'</p><p>体力 '+q.stamina+' · '+(q.food?'粮草 '+q.food:'不耗粮草')+'</p><p class="story-revisit-guaranteed"><b>胜利必得</b><br>'+esc(fixed.join(' · '))+'</p><div class="actions">'+btn('准备历练',{type:'dungeon',id:m.id},'primary',!!q.reason)+'</div>'+(q.reason?'<p class="note story-revisit-reason" role="status">'+esc(q.reason)+'</p>':'')+'<details data-fold="story-revisit-'+m.id+'"><summary>敌情、随机掉落与次数</summary><p>'+esc(m.description)+'</p>'+(q.difficulty?enemyIntel(s,d,m.enemy,m.scale,{type:'dungeon',id:m.id}):'<p class="note">重演黄泥冈计策，以卖酒与疑心的变化判定结果。</p>')+(chance?'<h3>随机掉落</h3>'+chance:'')+'<p class="note">胜利另有机会搜到装备。出发扣体力和次数，失败或撤退不返还；剧情首次奖励不会重复领取。</p></details></article></section>';
}
