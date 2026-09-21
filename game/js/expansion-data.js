export const COMBOS={erlong:{name:'二龙山聚义',team:['luzhishen','wusong','yangzhi'],text:'全员存活、怒气各 20，队伍受到过伤害时合击。'},water:{name:'阮氏连舟',team:['ruanxiaoer','ruanxiaowu','ruanxiaoqi'],text:'水域中全员存活、怒气各 20 时合击。'},bow:{name:'钩枪引弓',team:['huarong','xuning'],text:'两人存活、怒气各 20，敌方破甲或首领蓄势时合击。'}};
export const PERSONAL={linchong:{name:'枪阵护乡',text:'林冲随队带至少 50 名士兵，击败来犯匪徒且全队存活。',enemies:['bandit','soldier'],scale:1.4,terrain:'land',reward:'新战局开场为自身提供 4% 护阵，持续 8 秒。'},huarong:{name:'校场破旗',text:'花荣单人独行，60 秒内击败校场守卫。',enemies:['guard'],scale:1.4,terrain:'land',reward:'新战局花荣普攻伤害 +5%。'},ruanxiaoqi:{name:'水泊接应',text:'阮小七随队带至少 100 名士兵，水战取胜且全队存活。',enemies:['bandit_chief','guard'],scale:1.5,terrain:'water',reward:'水域新战局自身防御 +5%。'}};
export const LAYOUTS={wall:{name:'加固寨门',text:'每波我方防御 +12%。'},archer:{name:'箭楼齐射',text:'每波开场敌方损失 8% 最大气血。'},trap:{name:'山道陷阱',text:'敌方速度降低 15%。'},reserve:{name:'预备救护',text:'每波胜利后仍在阵英雄恢复 10% 气血。'}};

// Goals are shared by entry, combat feedback and settlement.
Object.assign(PERSONAL.linchong,{troops:50,allAlive:true});
Object.assign(PERSONAL.huarong,{solo:true,seconds:60});
Object.assign(PERSONAL.ruanxiaoqi,{troops:100,allAlive:true});
Object.assign(PERSONAL,{
 baisheng:{introduced:2,scaling:true,name:'担酒护归',text:'白胜随队取胜，全员存活，本人有效治疗至少 150。',enemies:['soldier','guard'],scale:1.8,terrain:'land',allAlive:true,healing:150,reward:'自身招式治疗量 +6%，不提高药品恢复量。',heal:.06},
 shiqian:{introduced:2,name:'夜探哨口',text:'时迁单人独行，45 秒内取胜，并亲自施放至少一次主动招式。',enemies:['guard','bandit'],scale:1.6,terrain:'forest',solo:true,seconds:45,skills:1,reward:'新战局自身速度 +5%。',speed:.05},
 zhugui:{introduced:2,name:'响箭接应',text:'朱贵与至少一位同伴出征，全员存活取胜，整场不使用战斗药品。',enemies:['bandit','road_raider'],scale:1,terrain:'forest',companions:1,allAlive:true,noMedicine:true,reward:'新战局自身初始怒气 +10。',rage:10},
 tanglong:{introduced:2,name:'铁甲护粮',text:'汤隆随队带至少 80 人取胜，全员存活；本人施放至少一次主动招式。',enemies:['soldier','soldier'],scale:1.7,terrain:'land',troops:80,allAlive:true,skills:1,reward:'带有专属部队的新战局，自身防御 +5%。',armyDefense:.05},
 andaoquan:{introduced:2,scaling:true,name:'阵前救伤',text:'安道全随队取胜，全员存活，本人有效治疗至少 500（药品和满血溢出不计）。',enemies:['soldier','bandit_chief','soldier'],scale:1.2,terrain:'land',allAlive:true,healing:500,reward:'自身招式治疗量 +8%，不提高药品恢复量。',heal:.08},
 luzhishen:{introduced:2,scaling:true,name:'禅杖护众',text:'鲁智深位于第一位，带至少一位同伴全员存活取胜，本人实际承伤至少 300。',enemies:['road_raider','bandit_chief'],scale:1.25,terrain:'land',front:true,companions:1,allAlive:true,taken:300,reward:'新战局自身气血上限 +5%，并以相同血量入场。',hp:.05}
});
Object.assign(COMBOS,{
 guide:{introduced:2,name:'乡路互助',team:['baisheng','shiqian'],text:'两人存活、怒气各 20，队友气血不超过 70% 时，为伤势最重者恢复 8% 最大气血。',kind:'heal'},
 scouts:{introduced:2,name:'响箭夜行',team:['zhugui','shiqian'],text:'两人存活、怒气各 20，后位敌人仍存活时合击后位敌人，并削去其最多 10 怒气。',kind:'scout'}
});
export function hasPersonalExpansion(s){const x=s.expansion;return Object.keys(x?.personal||{}).some(id=>PERSONAL[id]?.introduced===2)||Object.keys(x?.combos||{}).some(id=>COMBOS[id]?.introduced===2)||[s.battle,s.lastBattle].some(b=>b?.context?.kind==='personal'&&PERSONAL[b.context.id]?.introduced===2);}
