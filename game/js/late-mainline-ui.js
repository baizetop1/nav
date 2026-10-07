import {lateMissionPlan} from './late-mainline-data.js?v=0.68.0';
import {chapterBattlePlan} from './volume-three.js?v=0.68.0';
export function lateMissionCard(s,d,id,esc){
 const q=chapterBattlePlan(s,id),p=lateMissionPlan(s,id,d);if(!p)return '';
 return '<div class="story-rules"><p>队中一人 '+p.level+' 级 · 聚义厅 '+p.hall+' 级 · 体力 '+q.stamina+' · 粮草 '+q.food+'</p><p>共 '+(p.waves.length+1)+' 波。出发时扣费，失败或撤退不返还；胜后回到此处确认战果。</p>'+lateMissionRules(s,d,id,esc)+(q.reason?'<p class="notice">'+esc(q.reason)+'</p>':'')+'</div>';
}
export function lateMissionRules(s,d,id,esc){
 const p=lateMissionPlan(s,id,d);if(!p)return '';
 const rules=[];
 if(p.escort)rules.push('护送'+p.escort.name+'：完整度 '+p.escort.hp+'。'+d.by.enemies[p.escort.source].name+'在阵且未眩晕时，每 '+p.escort.pulse/1000+' 秒损失 '+p.escort.damage+' 点；归零即败。集火或眩晕该敌人可阻止射击，收势固守每次损失 '+Math.ceil(p.escort.damage*.5)+' 点。');
 if(p.waves.length)rules.push('击退当前一波才会出现增援。好汉气血、怒气与调息保留，退阵者不会复活。');
 if(p.shield)rules.push('准备生效：开战时全队获得最大气血 '+Math.round(p.shield*100)+'% 的护盾。');
 if(p.waveHeal)rules.push('分粮生效：每批增援到来前，在阵好汉恢复最大气血 '+Math.round(p.waveHeal*100)+'%。');
 if(id==='v8_final'){rules.push('先压住会治疗的护卫，再攻史文恭；也可留怒打断主将蓄势。');if(s.progress.flags.v8_priority_evidence)rules.push('口供已核清：史文恭开场怒气由 30 降至 15。');if(s.progress.flags.v8_priority_supply)rules.push('粮路先被夺回：少一队曾头援兵。');}
 return rules.map(t=>'<p class="note">'+esc(t)+'</p>').join('');
}
export function lateSortieOverview(s,d,b){
 const p=lateMissionPlan(s,b.context.id,d);if(!p)return '';
 return '<p class="note">共 '+(p.waves.length+1)+' 波'+(p.escort?' · 需保住护送完整度':'')+'，具体规则见“敌情”。</p>';
}
export function lateSortieIntel(s,d,b,esc){
 const p=lateMissionPlan(s,b.context.id,d);if(!p)return '';
 return '<section class="late-mission-intel"><h3>本战目标 · '+(p.waves.length+1)+' 波</h3>'+lateMissionRules(s,d,b.context.id,esc)+'<ol>'+[p.enemies,...p.waves].map((ids,i)=>'<li>第 '+(i+1)+' 波：'+ids.map(id=>esc(d.by.enemies[id].name)).join('、')+'</li>').join('')+'</ol></section>';
}
export function lateBattleStatus(s,d,esc,btn,locked=false){
 const b=s.battle,x=b.mainline;if(!x)return '';
 const p=lateMissionPlan(s,b.context.id,d),source=p.escort&&b.enemy.find(u=>u.model===p.escort.source&&u.hp>0),shield=Object.values(x.shields).reduce((a,b)=>a+b,0);
 return '<section class="late-battle-status" aria-label="本战目标"><div class="ledger-line"><b>第 '+(x.wave+1)+' / '+(p.waves.length+1)+' 波</b><span>'+(shield?'余盾 '+shield:'击退全部敌军')+'</span></div>'+(x.escort?'<div class="ledger-line"><span>护送 · '+esc(p.escort.name)+'</span><b>完整度 '+x.escort.hp+' / '+p.escort.hp+'</b></div><progress value="'+x.escort.hp+'" max="'+p.escort.hp+'" aria-label="护送完整度"></progress><div class="late-escort-actions"><small>'+(source?'射手在阵 · '+(b.orders?.stance==='guard'?'固守，损失减半':'可固守减半损失'):'本波射手已退，护送暂安')+'</small>'+ (source?btn('集火射手',{type:'battleOrder',kind:'focus',target:source.id},'secondary',locked||!!b.outcome):'')+'</div>':'')+'</section>';
}
export function lateChoiceWarning(s,d,command){
 const m=d.by.stories[command.id];if(!m)return '';
 const c=m.steps[s.progress.stories[m.id]?.step||m.start]?.choices.find(c=>c.id===command.choice);
 const flag=c?.effects?.find(e=>e.type==='flag'&&/^(v8_priority_(rescue|evidence|supply)|v9_(covert|assault)|v10_(supply|defense)|v11_(homeland|charter)|v12_(stay|sea|return))$/.test(e.id))?.id;
 if(!flag)return '';
 const text={
 v8_priority_rescue:'先救商旅，决战时全队获得 10% 气血护盾。',
 v8_priority_evidence:'先核口供，史文恭开场怒气减少 15。',
 v8_priority_supply:'先夺粮路，决战少一队援兵。',
 v9_covert:'潜入接应，城门较易通过，撤离共两波追兵。',
 v9_assault:'正面攻城需打两波守军；撤离有三波追兵，护送损失减半。',
 v10_supply:'分粮给接应队，守渡时每波之间恢复在阵好汉 15% 气血。',
 v10_defense:'先备守渡工事，守渡开战时全队获得 15% 气血护盾。',
 v11_homeland:'拒绝受调，终章可选择留守水泊或渡海迁居。',
 v11_charter:'依约护民归乡，终章进入护送归民路线。',
 v12_stay:'留在水泊，守住乡村与渡口。',
 v12_sea:'安排迁居，将家眷与伤者送过海。',
 v12_return:'依照约定护送归民，追查途中违约。'
 }[flag];
 return text+'\n确认后本存档沿此方向继续，不能更换。取消不会扣除资源。';
}
