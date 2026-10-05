// Completion prompts describe existing transactions; they never settle or roll rewards.
export const COMPLETION_ACTIONS=['finishBattle','finishScheme','journeyReturn','trekReturn','ventureReturn','squadCollect','affairCollect'];
export function pendingCompletion(s){
 if(!s||s.battle||s.event)return null;
 if(s.scheme){if(!s.scheme.outcome)return null;const success=s.scheme.outcome==='success';return {command:{type:'finishScheme'},title:success?'计策成功':'计策失败',text:success?'可直接领取酬谢并返回，也可领取后查看经过。':'可直接返回，也可查看这次安排的经过。',label:success?'领取并继续':'结算并返回',details:'查看经过'};}
 const t=s.realm?.trek,r=s.expansion?.run;
 if(t?.node===5)return {command:{type:t.journey?'journeyReturn':'trekReturn'},title:t.journey?'游历完成':'远征完成',text:'五段路线已走完，回寨领取本趟全部所得。',label:'领取并回寨',details:'查看所得'};
 if(r?.stage===3)return {command:{type:'ventureReturn'},title:r.kind==='defense'?'寨防完成':'接力完成',text:'三场战斗已完成，可以收队领取全部所得。',label:'领取并收队',details:'查看所得'};
 const m=s.realm?.squad;
 if(m&&s.clock>=m.readyAt&&!r)return {command:{type:'squadCollect'},title:'分队归来',text:(m.outcome==='victory'?'委托已完成。':'本次未能完成委托。')+'接回分队后结算所得与兵损。',label:'接回并继续',details:'查看战果'};
 if(s.affairs?.mission&&s.clock>=s.affairs.mission.readyAt&&!t&&!r)return {command:{type:'affairCollect'},title:'外派归来',text:'外派事务已办妥，可以接回好汉并领取酬谢。',label:'领取并继续',details:'查看所得'};
 return null;
}
export function completionDialog(q,esc){
 if(!q)return '';const command=esc(JSON.stringify(q.command)),mode=['finishScheme','squadCollect'].includes(q.command.type)?'review':'details';
 return '<dialog id="activity-outcome" class="compact-dialog outcome-dialog" aria-labelledby="activity-outcome-title" aria-describedby="activity-outcome-text"><header class="dialog-header"><h2 id="activity-outcome-title" tabindex="-1">'+esc(q.title)+'</h2></header><div class="dialog-body"><p id="activity-outcome-text">'+esc(q.text)+'</p></div><footer class="dialog-footer"><div class="actions"><button type="button" class="primary" data-command="'+command+'" data-battle-receipt="skip"><span>'+esc(q.label)+'</span></button><button type="button" class="secondary" data-command="'+command+'" data-battle-receipt="'+mode+'"><span>'+esc(q.details)+'</span></button></div></footer></dialog>';
}
export function receiptPrompt(title,summary,esc){return '<dialog id="reward-result" class="compact-dialog outcome-dialog" aria-labelledby="reward-title"><header class="dialog-header"><h2 id="reward-title" tabindex="-1">'+esc(title)+'</h2></header><div class="dialog-body"><p>'+esc(summary)+'</p><p class="note">结果已保存到本机。</p></div><footer class="dialog-footer"><div class="actions"><button type="button" class="primary" data-reward-close><span>继续</span></button><button type="button" class="secondary" data-receipt-details><span>查看明细</span></button></div></footer></dialog>';}
export function completionReview(before,after,esc){
 if(before.scheme?.outcome&&!after.scheme)return '<section><h3>计策经过</h3>'+before.scheme.log.map(line=>'<p>'+esc(line)+'</p>').join('')+'</section>';
 const m=before.realm?.squad;if(m&&!after.realm?.squad)return '<section><h3>分队战果</h3><p>'+(m.outcome==='victory'?'委托完成':m.outcome==='defeat'?'分队战败':'分队撤回')+'</p><p>随行 '+m.troops+' 人 · 归营 '+(m.troops-m.fallen-m.wounded)+' 人 · 伤兵 '+m.wounded+' 人 · 阵亡 '+m.fallen+' 人</p></section>';
 return '';
}
