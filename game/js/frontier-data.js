export const POSTS={
  woods:{name:'青松林场',faction:'山林草寇',hall:1,level:1,parents:[],enemy:['bandit'],scale:.75,terrain:'forest',resource:'wood',yield:3,first:{wood:30,silver:80},tip:'夺下林场可稳定取木，并从山道进入矿山。'},
  farm:{name:'东溪粮庄',faction:'劫粮流寇',hall:1,level:1,parents:[],enemy:['bandit'],scale:.7,terrain:'land',resource:'food',yield:4,first:{food:40,silver:80},tip:'粮庄供给口粮。控制粮庄后，可向石碣渡口进军。'},
  ferry:{name:'石碣渡口',faction:'水路悍匪',hall:2,level:10,parents:['farm'],enemy:['road_raider','bandit'],scale:1,terrain:'water',resource:'food',yield:3,first:{food:30,silver:160},tip:'水战部队在此擅长作战。控制渡口，便可走水路直达矿山。'},
  quarry:{name:'伏牛矿山',faction:'盗矿武装',hall:2,level:8,parents:['woods','ferry'],enemy:['soldier','guard'],scale:1.05,terrain:'mountain',resource:'scrap_iron',yield:2,first:{scrap_iron:8,silver:160},tip:'林场山道或渡口水路任通一条即可抵达。产出碎铁，可在工坊加工精铁。'},
  fort:{name:'盘龙敌寨',faction:'盘龙寨军',hall:3,level:18,parents:['quarry'],enemy:['guard','bandit_chief','road_raider'],scale:1.6,terrain:'land',resource:'silver',yield:20,first:{silver:300,martial_pages:6},tip:'攻下敌寨，打通商路并取得固定银钱。混编守军适合先看敌情再出征。'}
};
export const STATIONS={farm:{name:'农田',building:'farm',resource:'food'},lumber:{name:'伐木场',building:'lumber',resource:'wood'},workshop:{name:'冶铁工坊',building:'market',resource:'iron'}};
export const CYCLE=30*60*1000,OFFLINE_CAP=8*60*60*1000,SAFE_TIME=6*60*60*1000;
export const waterBattle=b=>b.context?.terrain==='water'||(b.context?.type==='rotation'&&b.context.id==='tide');
