export const FOURTH_MISSIONS={
 v4_erlong_pact:{level:18,hall:2,scale:2.6,terrain:'mountain',stamina:10},
 v4_taohua_pact:{level:18,hall:2,scale:2.8,terrain:'land',stamina:10},
 v4_baihu_pact:{level:18,hall:2,scale:2.8,terrain:'forest',stamina:10},
 v4_union:{level:22,hall:3,scale:3,terrain:'land',stamina:16}
};
export const ALLIANCES=[
 {id:'erlong',name:'二龙山',map:'v4_erlong',story:'v4_erlong_pact',options:[{flag:'v4_erlong_medics',name:'医援',description:'我方最大气血 +12%',side:'team',stat:'maxHp',rate:1.12},{flag:'v4_erlong_guard',name:'护阵',description:'我方防御 +12%',side:'team',stat:'defense',rate:1.12}]},
 {id:'taohua',name:'桃花山',map:'v4_taohua',story:'v4_taohua_pact',options:[{flag:'v4_taohua_engines',name:'器械',description:'我方攻击 +10%',side:'team',stat:'attack',rate:1.1},{flag:'v4_taohua_ambush',name:'奇袭',description:'敌方防御降低 12%',side:'enemy',stat:'defense',rate:.88}]},
 {id:'baihu',name:'白虎山',map:'v4_baihu',story:'v4_baihu_pact',options:[{flag:'v4_baihu_initiative',name:'先手',description:'我方初始怒气 +20（最高 100）',side:'team',stat:'rage',add:20},{flag:'v4_baihu_supply',name:'辎重',description:'我方最大气血 +8%',side:'team',stat:'maxHp',rate:1.08}]}
];
export const allianceSupports=s=>ALLIANCES.flatMap(a=>s.progress.flags['v4_'+a.id+'_allied']?a.options.filter(o=>s.progress.flags[o.flag]).map(o=>({...o,ally:a.name})):[]);
export function applyAllianceSupport(s,b){if(b.context.id!=='v4_union')return;for(const o of allianceSupports(s)){for(const u of b[o.side]){if(o.stat==='rage')u.rage=Math.min(100,u.rage+o.add);else {u[o.stat]=Math.round(u[o.stat]*o.rate);if(o.stat==='maxHp')u.hp=u.maxHp;}}b.log.push('【三山支援】'+o.ally+' · '+o.name+'：'+o.description+'。');}}
export function hasFourthVolume(s){return Object.keys(s.progress.flags).some(id=>id.startsWith('v4_')&&s.progress.flags[id])||s.progress.visited.some(id=>id.startsWith('v4_'))||Object.keys(s.progress.stories).some(id=>id.startsWith('v4_'))||s.battle?.context.id?.startsWith('v4_')||s.lastBattle?.context.id?.startsWith('v4_')||!!s.progress.flags.volume_four_complete;}
export function validateAlliances(s,check){for(const a of ALLIANCES){const chosen=a.options.filter(o=>s.progress.flags[o.flag]);check(chosen.length<=1,'三山合作方式冲突');check(!!s.progress.flags['v4_'+a.id+'_allied']===(chosen.length===1),'三山结盟记录');}}
