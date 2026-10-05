export const REPLAY_CHALLENGES={
 pair:{name:'双人破阵',text:'最多两人出阵，两人均须存活取胜。',badge:'双人破阵'},
 swift:{name:'全军速胜',text:'60 秒内取胜，所有出阵好汉均须存活。',badge:'全军速胜'},
 intact:{name:'完阵归营',text:'取胜时每位好汉至少保留一半气血。',badge:'完阵归营'}
};
export const challengeKey=(id,tier,challenge)=>id+'_'+tier+'_'+challenge;
export function replayChallengeResult(b){
 const id=b?.context?.challenge,m=REPLAY_CHALLENGES[id];if(!m)return null;
 const rows=[{text:'战斗取胜',done:b.outcome==='victory'}];
 if(id==='pair')rows.push({text:'至多两人出阵，全部存活',done:b.team.length<=2&&b.team.every(u=>u.hp>0)});
 if(id==='swift')rows.push({text:'用时 '+(b.elapsed/1000).toFixed(1)+' / 60 秒',done:b.elapsed<=60000},{text:'出阵好汉全部存活',done:b.team.every(u=>u.hp>0)});
 if(id==='intact')rows.push({text:'每位好汉气血至少 50%',done:b.team.every(u=>u.hp*2>=u.maxHp)});
 return {id,name:m.name,rows,complete:rows.every(r=>r.done)};
}
export function replayChallengePanel(b){const q=replayChallengeResult(b);return q?'<section class="replay-challenge-status"><strong>'+q.name+(b.outcome?(q.complete?' · 达成':' · 未达成'):'')+'</strong><p class="note">'+q.rows.map(r=>(r.done?'✓ ':'○ ')+r.text).join('；')+'</p></section>':'';}
