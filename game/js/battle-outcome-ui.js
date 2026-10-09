// Presentation only. Both choices settle through the existing finishBattle transaction.
export function battleOutcomeDialog(battle,esc){
 if(!battle||!['victory','defeat','retreat'].includes(battle.outcome))return '';
 const won=battle.outcome==='victory',lesson=battle.context.type==='lesson';
 const title=lesson?(won?'演武完成':'演武结束'):won?'战斗胜利':battle.outcome==='defeat'?'战斗失败':'已撤出战斗';
 const text=lesson?'结算本次演武，可选择查看经过。':won?'可直接领取奖励并返回，也可领取后查看战报。':'结算后返回游戏，也可查看本次战报。';
 const label=lesson?'完成并返回':won?'领取并继续':'结算并返回';
 const command=esc(JSON.stringify({type:'finishBattle'}));
 return '<dialog id="battle-outcome" class="compact-dialog battle-outcome" aria-labelledby="battle-outcome-title" aria-describedby="battle-outcome-text"><header class="dialog-header"><h2 id="battle-outcome-title" tabindex="-1">'+title+'</h2></header><div class="dialog-body"><p id="battle-outcome-text">'+text+'</p><p class="note">用时 '+Math.max(0,Math.ceil(battle.elapsed/1000))+' 秒</p></div><footer class="dialog-footer"><div class="actions"><button type="button" class="primary" data-command="'+command+'" data-battle-receipt="skip"><span>'+label+'</span></button><button type="button" class="secondary" data-command="'+command+'" data-battle-receipt="review"><span>查看战报</span></button></div></footer></dialog>';
}

// The game calls this only after the finishBattle transaction, never to award items.
export function settledOutcomeDialog(b,esc,saved=true){if(!b?.outcome)return '';const title=b.context.type==='lesson'?'演武结束':({victory:'战斗胜利',defeat:'战斗失败',retreat:'已撤出战斗'})[b.outcome];return '<dialog id="battle-outcome" class="compact-dialog battle-outcome" data-settled="true" aria-labelledby="battle-outcome-title"><header class="dialog-header"><h2 id="battle-outcome-title" tabindex="-1">'+title+'</h2></header><div class="dialog-body"><p>'+(saved?'本次已结算并保存。掉落已入库，无须领取。':'本次已结算，但尚未写入本机。请保持页面打开，到存档页导出进度。')+'</p><p class="note">用时 '+Math.ceil(b.elapsed/1000)+' 秒</p></div><footer class="dialog-footer"><div class="actions"><button type="button" class="primary" data-settled-choice="continue">继续</button><button type="button" class="secondary" data-settled-choice="review">查看战报</button></div></footer></dialog>';}
