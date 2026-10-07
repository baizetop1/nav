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

Object.assign(PERSONAL,{
 wusong:{introduced:3,name:'夜守桥头',text:'武松单人独行，60 秒内取胜，亲自施放至少一次主动招式。',enemies:['soldier','bandit'],scale:2,terrain:'land',solo:true,seconds:60,skills:1,reward:'开战初始怒气 +10。',rage:10},
 yangzhi:{introduced:3,name:'押粮过岭',text:'杨志带至少 80 名士兵和一名同伴，全员存活取胜，整场不用药品。',enemies:['bandit_chief','guard'],scale:2.2,terrain:'mountain',troops:80,companions:1,allAlive:true,noMedicine:true,reward:'带有专属部队时，自身防御 +5%。',armyDefense:.05},
 wuyong:{introduced:3,name:'草庐设伏',text:'吴用带至少一名同伴取胜，本人施放至少一次主动招式，全员存活，整场不用药品。',enemies:['guard','soldier','guard'],scale:2.4,terrain:'forest',companions:1,allAlive:true,skills:1,noMedicine:true,reward:'开战初始怒气 +10。',rage:10},
 gongsunsheng:{introduced:3,name:'山口阻敌',text:'公孙胜带至少一名同伴取胜，本人施放至少两次主动招式，整场不用药品。',enemies:['soldier','guard','bandit_chief'],scale:2.4,terrain:'mountain',companions:1,skills:2,noMedicine:true,reward:'自身速度 +5%。',speed:.05},
 guansheng:{introduced:3,name:'横刀护阵',text:'关胜列于第一位，带至少一名同伴，全员存活取胜；本人实际承伤至少 400。',enemies:['road_raider','soldier','bandit_chief'],scale:1.5,scaling:true,terrain:'land',front:true,companions:1,allAlive:true,taken:400,reward:'自身气血上限 +5%。',hp:.05},
 daizong:{introduced:3,name:'急递军书',text:'戴宗单人独行，45 秒内取胜，本人施放至少一次主动招式。',enemies:['bandit','guard'],scale:1.5,terrain:'forest',solo:true,seconds:45,skills:1,reward:'自身速度 +5%。',speed:.05}
});

Object.assign(PERSONAL,{
 songjiang:{introduced:4,name:'渡口送人',text:'宋江带至少一名同伴取胜，全员存活，本人有效治疗至少 300。',enemies:['soldier','road_raider'],scale:1.7,scaling:true,terrain:'water',companions:1,allAlive:true,healing:300,reward:'本人有效治疗后，受疗者怒气 +6，每 6 秒一次。满血溢出不触发。'},
 yanqing:{introduced:4,name:'夜开后门',text:'燕青带至少一名同伴，60 秒内取胜，本人主动施招至少一次，不使用药品。',enemies:['bandit_chief','guard'],scale:1.5,terrain:'forest',companions:1,seconds:60,skills:1,noMedicine:true,reward:'本人成功打断后，追加攻击 70% 伤害，每 6 秒一次。'},
 xuning:{introduced:4,name:'钩枪守坡',text:'徐宁站在首位，带至少一名同伴，全员存活取胜，本人承伤至少 300。',enemies:['road_raider','soldier'],scale:1.6,scaling:true,terrain:'land',front:true,companions:1,allAlive:true,taken:300,reward:'有护阵时承受直接攻击，反击攻击者，造成自身攻击 40% 的伤害，每 4 秒一次。'},
 liutang:{introduced:4,name:'路口夺粮',text:'刘唐随队取胜，本人主动施招至少一次，整场不用药品。',enemies:['bandit_chief','soldier','guard'],scale:2.2,terrain:'land',skills:1,noMedicine:true,reward:'普攻命中后移除敌方护阵，每 8 秒一次。'},
 ruanxiaoer:{introduced:4,name:'雾里接船',text:'阮小二站在首位，带至少一名同伴，全员存活取胜，本人承伤至少 300。',enemies:['soldier','road_raider'],scale:1.7,scaling:true,terrain:'water',front:true,companions:1,allAlive:true,taken:300,reward:'有护阵时承受直接攻击，为气血比例最低的同伴护阵 12%，持续 4 秒，每 6 秒一次。'},
 ruanxiaowu:{introduced:4,name:'窄汊脱围',text:'阮小五带至少一名同伴，全员存活取胜，本人主动施招至少一次。',enemies:['snake','soldier','guard'],scale:2,terrain:'water',companions:1,allAlive:true,skills:1,reward:'每第三次普攻后，自身获得 15% 护阵，持续 4 秒。'}
});

Object.assign(PERSONAL,{
 duqian:{introduced:5,name:'寨门接人',text:'杜迁站在首位，带一名同伴，全员存活取胜，本人承伤至少 250。',enemies:['road_raider','soldier'],scale:1.5,scaling:true,terrain:'land',front:true,companions:1,allAlive:true,taken:250,reward:'有护阵时受直接攻击，为气血比例最低的同伴护阵 12%，持续 4 秒，每 6 秒一次。'},
 songwan:{introduced:5,name:'雨夜守坡',text:'宋万站在首位，带一名同伴，全员存活取胜，本人承伤至少 350。',enemies:['soldier','bandit_chief'],scale:1.7,scaling:true,terrain:'mountain',front:true,companions:1,allAlive:true,taken:350,reward:'受直接攻击后气血低于一半且未退阵，获得 25% 护阵，持续 6 秒，每 12 秒一次。'},
 caozheng:{introduced:5,name:'店后截粮',text:'曹正带一名同伴取胜，本人施放至少一次主动招式，不使用战斗药品。',enemies:['guard','soldier'],scale:2.2,terrain:'land',companions:1,skills:1,noMedicine:true,reward:'普攻命中后移除敌方护阵，每 8 秒一次。'},
 zhufu:{introduced:5,name:'草棚救客',text:'朱富带一名同伴，全员存活取胜，本人有效治疗至少 300。',enemies:['snake','road_raider'],scale:1.8,scaling:true,terrain:'forest',companions:1,allAlive:true,healing:300,reward:'有效治疗后清除受疗者一项毒伤或流血，并护阵 8%，持续 4 秒，每 6 秒一次。'},
 houjian:{introduced:5,name:'缝甲护归',text:'侯健带一名同伴，全员存活取胜，本人有效治疗至少 300，不使用战斗药品。',enemies:['soldier','road_raider'],scale:1.8,scaling:true,terrain:'land',companions:1,allAlive:true,healing:300,noMedicine:true,reward:'有效治疗后，受疗者获得 12% 护阵，持续 6 秒，每 8 秒一次。'},
 shien:{introduced:5,name:'快活林追寇',text:'施恩带一名同伴，60 秒内取胜，本人主动施招至少一次、直接伤害至少 1200。',enemies:['soldier','guard','bandit'],scale:2.4,terrain:'forest',companions:1,seconds:60,skills:1,damage:1200,reward:'普攻命中正在流血的敌人后，追加自身攻击 35% 的伤害，每 4 秒一次。'}
});

Object.assign(PERSONAL,{
 xueyong:{introduced:6,name:'街口护摊',text:'薛永带一位同伴取胜，本人主动施招一次、造成直接伤害至少 800，不使用药品。',enemies:['soldier','guard'],scale:2,terrain:'land',companions:1,skills:1,damage:800,noMedicine:true,reward:'普攻命中破甲或虚弱敌人，追加攻击 30% 伤害，每 5 秒一次。'},
 xiangchong:{introduced:6,name:'团牌守口',text:'项充站首位，带一位同伴，全员存活取胜，本人承伤至少 200。',enemies:['road_raider','soldier'],scale:1.5,scaling:true,terrain:'mountain',front:true,companions:1,allAlive:true,taken:200,reward:'身有护阵时承受直接攻击，反击攻击者，造成攻击 40% 的伤害，每 4 秒一次。'},
 ligun:{introduced:6,name:'补位护粮',text:'李衮站首位，带一位同伴，全员存活取胜，本人承伤至少 200。',enemies:['soldier','bandit'],scale:1.6,scaling:true,terrain:'land',front:true,companions:1,allAlive:true,taken:200,reward:'身有护阵时受直接攻击，为气血比例最低的同伴护阵 12%，持续 4 秒，每 6 秒一次。'},
 songqing:{introduced:6,name:'粮车救伤',text:'宋清带一位同伴，全员存活取胜，本人有效治疗至少 250。',enemies:['road_raider','soldier'],scale:1.7,scaling:true,terrain:'land',companions:1,allAlive:true,healing:250,reward:'有效治疗后，若受疗者仍不足半血，额外恢复最大气血 5%，每 8 秒一次。'},
 yuehe:{introduced:6,name:'侧门接应',text:'乐和带一位同伴，全员存活取胜，本人有效治疗至少 250，不使用药品。',enemies:['guard','soldier'],scale:1.7,scaling:true,terrain:'land',companions:1,allAlive:true,healing:250,noMedicine:true,reward:'本人有效治疗后，受疗者怒气 +6，每 6 秒一次。'},
 fanrui:{introduced:6,name:'林中引路',text:'樊瑞站首位，带一位同伴，全员存活取胜，本人主动施招一次、承伤至少 200。',enemies:['snake','road_raider'],scale:1.7,scaling:true,terrain:'forest',front:true,companions:1,allAlive:true,skills:1,taken:200,reward:'受直接攻击后气血不足一半且未退阵，清除自身一项毒伤或流血，并护阵 10% 持续 4 秒，每 12 秒一次。'}
});
