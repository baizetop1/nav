import {GEAR_TRAITS,PERSONAL_TRAITS,TRAIT_LABELS} from './tactics-data.js?v=0.69.0';
const alive=u=>u.hp>0;
const active=(b,u,id)=>u.statuses.some(s=>s.id===id&&s.expiresAt>b.elapsed);
const log=(b,text)=>{b.log.push(text);if(b.log.length>120)b.log.shift();};
export function initializeTactics(s,b){
 if(b.guest||b.context.type==='lesson')return;
 b.tactics={version:1,gear:Object.fromEntries(b.team.map(u=>[u.id,s.equipment.filter(e=>e.hero===u.id&&GEAR_TRAITS[e.item]).map(e=>({item:e.item,rank:e.refine||0}))])),cooldowns:{},counts:{}};
}
function traits(b,u){
 if(!b.tactics||u?.side!=='team'||!alive(u))return [];
 const rows=(b.tactics.gear[u.id]||[]).map(e=>({key:u.id+'_'+e.item,kind:GEAR_TRAITS[e.item].kind,boost:1+.15*e.rank}));
 const kind=b.expansion?.personal.includes(u.id)&&PERSONAL_TRAITS[u.id];
 if(kind&&!rows.some(r=>r.kind===kind))rows.push({key:u.id+'_personal',kind,boost:1});
 return rows;
}
function trigger(b,row,ms){if((b.tactics.cooldowns[row.key]||0)>b.elapsed)return false;b.tactics.cooldowns[row.key]=b.elapsed+ms;b.tactics.counts[row.key]=(b.tactics.counts[row.key]||0)+1;return true;}
function buff(b,u,id,value,ms){const old=u.statuses.find(s=>s.id===id);if(old){old.value=Math.max(old.value,value);old.expiresAt=Math.max(old.expiresAt,b.elapsed+ms);}else u.statuses.push({id,value,expiresAt:b.elapsed+ms});}
function bonus(b,u,t,rate,api,label){if(!alive(t))return;const n=api.absorb(b,t,Math.max(1,Math.round((u.attack*rate-t.defense*.2)*(1-(t.statuses.find(s=>s.id==='guard')?.value||0)))));api.reportDamage(b,u,t,n);t.hp=Math.max(0,t.hp-n);t.rage=Math.min(100,t.rage+10);log(b,'【'+label+'】'+u.name+'使'+t.name+'损失 '+n+' 气血。');}
export function tacticsAfterHit(b,u,t,normal,loss,api,guarded){
 if(!b.tactics||loss<=0)return;
 if(t.side==='team'&&alive(t)&&u.side==='enemy'&&t.hp<t.maxHp*.5)for(const row of traits(b,t))if(row.kind==='brace'&&trigger(b,row,12000)){buff(b,t,'guard',.25,6000);log(b,'【守住坡口】'+t.name+'稳住脚步，护阵 6 秒。');}
 if(t.side==='team'&&alive(t)&&u.side==='enemy'&&t.hp<t.maxHp*.5)for(const row of traits(b,t))if(row.kind==='tenacity'&&trigger(b,row,12000)){const i=t.statuses.findIndex(s=>['poison','bleeding'].includes(s.id)&&s.expiresAt>b.elapsed);if(i>=0)t.statuses.splice(i,1);buff(b,t,'guard',.1*row.boost,4000);log(b,'【止血脱困】'+t.name+'止住伤势，护阵 4 秒。');}
 if(t.side==='team'&&alive(t)&&u.side==='enemy'&&guarded){for(const row of traits(b,t)){
  if(row.kind==='counter'&&alive(u)&&trigger(b,row,4000))bonus(b,t,u,.4*row.boost,api,'护阵反击');
  if(row.kind==='cover'){const ally=b.team.filter(v=>alive(v)&&v!==t).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(ally&&trigger(b,row,6000)){buff(b,ally,'guard',.12*row.boost,4000);log(b,'【护住后排】'+t.name+'替'+ally.name+'护住侧翼。');}}
 }}
 if(u.side!=='team'||!normal)return;
 for(const row of traits(b,u)){
  if(row.kind==='press'&&alive(t)&&(active(b,t,'armor_break')||active(b,t,'weaken'))&&trigger(b,row,5000))bonus(b,u,t,.3*row.boost,api,'破隙追击');
  if(row.kind==='bleed_chase'&&alive(t)&&active(b,t,'bleeding')&&trigger(b,row,4000))bonus(b,u,t,.35,api,'趁伤追击');
  if(row.kind==='guard'&&(u.attacks+1)%3===0&&trigger(b,row,0)){buff(b,u,'guard',.15*row.boost,4000);log(b,'【稳步结阵】'+u.name+'收住步子，护阵 4 秒。');}
  if(row.kind==='shatter'&&alive(t)&&active(b,t,'guard')&&trigger(b,row,Math.round(8000/row.boost))){t.statuses=t.statuses.filter(s=>s.id!=='guard');log(b,'【击碎护阵】'+u.name+'破去'+t.name+'的护阵。');}
 }
}
export function tacticsInterrupt(b,u,t,api){for(const row of traits(b,u)){
 if(!['follow','recover','rally','weaken'].includes(row.kind))continue;
 if(row.kind==='recover'&&u.hp>=u.maxHp)continue;
 if(!trigger(b,row,6000))continue;
 if(row.kind==='follow')bonus(b,u,t,.7*row.boost,api,'截势追击');
 if(row.kind==='recover'){const n=Math.min(u.maxHp-u.hp,Math.round(u.maxHp*.06*row.boost));api.reportHealing(b,u,n,u);u.hp+=n;}
 if(row.kind==='rally')for(const ally of b.team.filter(alive))ally.rage=Math.min(100,ally.rage+Math.round(6*row.boost));
 if(row.kind==='weaken'&&alive(t))buff(b,t,'weaken',.2*row.boost,6000);
 if(row.kind!=='follow')log(b,'【'+TRAIT_LABELS[row.kind]+'】'+u.name+'打断后接应同伴。');
}}
export function tacticsHealing(b,u,t,n,api){if(!t||!alive(t)||n<=0)return;for(const row of traits(b,u)){if(row.kind==='fieldcare'&&t.hp+n<t.maxHp*.5&&trigger(b,row,8000)){const gain=Math.min(t.maxHp-t.hp-n,Math.round(t.maxHp*.05*row.boost));t.hp+=gain;api?.reportHealing(b,u,gain,t);log(b,'【重伤救护】'+t.name+'额外恢复 '+gain+' 气血。');}if(row.kind==='stitch'&&trigger(b,row,8000)){buff(b,t,'guard',.12,6000);log(b,'【补甲护身】'+u.name+'为'+t.name+'护阵 6 秒。');}if(row.kind==='heal_rally'&&t.rage<100&&trigger(b,row,6000)){t.rage=Math.min(100,t.rage+6);log(b,'【救伤鼓气】'+u.name+'为'+t.name+'恢复气血后，受疗者怒气 +6。');}}for(const row of traits(b,u))if(row.kind==='cleanse'&&trigger(b,row,6000)){
 const index=t.statuses.findIndex(s=>['poison','bleeding'].includes(s.id)&&s.expiresAt>b.elapsed);if(index>=0)t.statuses.splice(index,1);
 buff(b,t,'guard',.08*row.boost,4000);log(b,'【施药解毒】'+u.name+'为'+t.name+(index>=0?'除去一项毒伤，并护阵 4 秒。':'护阵 4 秒。'));
}}
export function specialBossMove(state,u,api,strike){
 const b=state.battle,boss=u.boss;
 if(!b.tactics||b.context.type!=='special'||u!==b.enemy[0]||!['minechief','marshnest','ruinsvault'].includes(b.context.id)&&b.context.route!=='warbell')return false;
 const id=b.context.route==='warbell'?'ruinsvault':b.context.id;
 if(!boss.pendingAt&&boss.readyAt===b.elapsed){boss.pendingAt=b.elapsed+3000;api.log(b,'【首领蓄势 · 3秒】'+({minechief:'重锤将扫过全队，可护阵承受或打断。',marshnest:'蛇群将喷出毒雾，可打断；中毒后用解毒或净化。',ruinsvault:'头目将为全队恢复气血，可打断或先集火头目。'})[id]);}
 else if(boss.pendingAt===b.elapsed){boss.pendingAt=0;boss.readyAt=b.elapsed+12000;if(active(b,u,'stun')){api.log(b,'【蓄势中断】首领被眩晕，本次招式未出。');return true;}
  if(id==='minechief')for(const target of b.team.filter(alive))strike(state,u,target,{kind:'damage',rate:1.25},'重锤扫阵',api);
  if(id==='marshnest')for(const target of b.team.filter(alive))api.addStatus(target,{id:'poison',value:Math.max(1,Math.round(target.maxHp*.025)),turns:3},b.elapsed);
  if(id==='ruinsvault'){let healed=0;for(const ally of b.enemy.filter(alive)){const n=Math.min(ally.maxHp-ally.hp,Math.round(ally.maxHp*.15));ally.hp+=n;healed+=n;}api.log(b,'【整队疗伤】敌军共恢复 '+healed+' 气血。');}
 }
 return true;
}

