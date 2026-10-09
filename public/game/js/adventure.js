import {rollDelveEvents,delveOption,applyDelveHelper} from './delve-events.js?v=0.69.0';
import {GEAR_TRAITS,PERSONAL_TRAITS} from './tactics-data.js?v=0.69.0';
import {enterSpecial,specialPlan} from './special-dungeons.js?v=0.69.0';
import {requireRule,journal} from './utils.js?v=0.69.0';
export const DELVE_CHOICES={rest:{name:'绕过守卫',text:'歇脚后走原路；在阵好汉恢复 15% 气血，无额外材料。'},rescue:{name:'救下采药人',text:'迎战带蛇的守卫；胜利额外获得药草，当前气血保留。',route:'supplies'},cache:{name:'追查藏货',text:'迎战增援骑兵；胜利额外获得碎铁，当前气血保留。',route:'ambush'}};
export const adventureState=s=>s.adventure??={version:1,run:null,clears:{},badge:null,feats:{}};
export function delveGuard(s,a){if(s.adventure?.run)requireRule(['delveChoose','delveLeave','battleTick','battleSkill','battleSkillMode','battleItem','battleOrder','battleRetreat','finishBattle','refresh'].includes(a.type),'这趟探索尚未结束，请先选路或收队。');}
export function adventureAction(s,d,a){const x=adventureState(s);
 if(a.type==='delveStart'){requireRule(!x.run,'已有一趟探索。');requireRule(['mine','marsh','ruins'].includes(a.id),'请选择矿洞、芦荡或旧营。');const q=specialPlan(s,a.id,a.tier);requireRule(!q.reason,q.reason);requireRule((x.clears[a.id+'_'+a.tier]||0)<10000000,'探索记录已满。');enterSpecial(s,d,a);x.run={id:a.id,tier:a.tier,stage:0,team:[...s.team],hp:{},choices:[],events:rollDelveEvents(s,a.id)};}
 else if(a.type==='delveLeave'){requireRule(x.run&&!s.battle,'请先结算当前战斗。');x.run=null;journal(s,'探索收队，沿途所得已放入行囊。');}
 else if(a.type==='delveChoose'){const r=x.run;requireRule(r&&!s.battle&&r.stage>0&&r.stage<3,'当前没有待选的岔路。');requireRule(Object.hasOwn(DELVE_CHOICES,a.id),'无效的岔路。');const choice=delveOption(r,a.id);enterSpecial(s,d,{id:r.id,tier:r.tier,...(choice.route?{route:choice.route}:{})});for(const u of s.battle.team){const health=r.hp[u.id];u.hp=health===0?0:Math.min(u.maxHp,Math.max(1,Math.floor(u.maxHp*health/10000))+(a.id==='rest'?Math.round(u.maxHp*.15):0));}applyDelveHelper(s.battle,r,choice);r.choices.push(a.id);journal(s,'第 '+(r.stage+1)+' 段：'+choice.name+'。');}
 else if(a.type==='badgeSelect'){requireRule(a.id===null||honors(s).some(h=>h.id===a.id&&h.done),'此称号尚未取得。');x.badge=a.id;}
 else throw Error('无效的探索操作。');
}
export function finishDelve(s,b){const x=s.adventure,r=x?.run;if(!r)return;requireRule(b.context.type==='special'&&b.context.id===r.id&&b.context.tier===r.tier,'探索战局不一致。');if(b.outcome!=='victory'){x.run=null;journal(s,'探索中止，之前带回的物品保留。');return;}r.stage++;r.hp=Object.fromEntries(b.team.map(u=>[u.id,u.hp>0?Math.max(1,Math.floor(u.hp/u.maxHp*10000)):0]));if(r.stage===3){const key=r.id+'_'+r.tier;x.clears[key]=(x.clears[key]||0)+1;x.run=null;journal(s,'三段探索完成，沿途所得已入行囊，战绩已记下。');}}
export function honors(s){const challenges=Object.keys(s.replays?.challenges||{}),types=['swift','pair','intact'];return [
 {id:'twelve',name:'十二卷同行',current:s.progress.flags.volume_twelve_complete?1:0,total:1,text:'完成主线十二卷'},
 {id:'delver',name:'探路人',current:Object.values(s.adventure?.clears||{}).reduce((a,b)=>a+b,0),total:10,text:'完成十趟三段探索'},
 {id:'companions',name:'知人善任',current:Object.keys(s.expansion?.personal||{}).filter(id=>s.expansion.personal[id]).length,total:12,text:'完成十二位好汉的专属任务'},
 {id:'master',name:'百战有方',current:types.filter(t=>challenges.some(k=>k.endsWith('_'+t))).length,total:3,text:'完成三种不同规则的回顾挑战'},
 ...Object.entries(BUILD_FEATS).map(([id,m])=>({id,name:m.name,current:s.adventure?.feats?.[id]?.count||0,total:3,text:m.text}))
 ].map(h=>({...h,done:h.current>=h.total}));}
export const selectedHonor=s=>honors(s).find(h=>h.id===s.adventure?.badge&&h.done)?.name||'';

export const BUILD_FEATS={
 counter:{name:'守阵老手',kinds:['counter'],needed:3,text:'在险境及以上密室或原战回顾中，全员存活取胜且触发至少三次护阵反击；完成三战。',trial:'minechief'},
 interrupt:{name:'截招好手',kinds:['follow','recover','rally','weaken'],needed:2,text:'在险境及以上密室或原战回顾中，全员存活取胜且触发至少两次打断装备或任务本领；完成三战。',trial:'ruinsvault'},
 medic:{name:'阵前良医',kinds:['cleanse','fieldcare','stitch'],needed:2,text:'在险境及以上密室或原战回顾中，全员存活取胜且触发至少两次治疗护阵本领；完成三战。',trial:'marshnest'}
};
export function recordBuildFeats(s,b){
 if(b.outcome!=='victory'||b.team.some(u=>u.hp<=0)||!((b.context.type==='special'&&['minechief','marshnest','ruinsvault'].includes(b.context.id)&&b.context.tier>=2)||(b.context.type==='replay'&&b.context.tier===2)))return;
 const counts=b.tactics?.counts||{};
 for(const [id,m]of Object.entries(BUILD_FEATS)){let total=0;for(const u of b.team)for(const [key,n]of Object.entries(counts)){if(!key.startsWith(u.id+'_'))continue;const item=key.slice(u.id.length+1),kind=item==='personal'?PERSONAL_TRAITS[u.id]:GEAR_TRAITS[item]?.kind;if(m.kinds.includes(kind))total+=n;}if(total<m.needed)continue;const x=adventureState(s),old=x.feats[id];x.feats[id]={count:Math.min(10000000,(old?.count||0)+1),best:Math.min(old?.best??180000,b.elapsed),team:old&&old.best<=b.elapsed?old.team:b.team.map(u=>u.id)};journal(s,'【'+m.name+'】达成 '+x.feats[id].count+' 战；本战触发 '+total+' 次。');}
}
