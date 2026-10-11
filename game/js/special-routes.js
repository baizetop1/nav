export const SPECIAL_ROUTES={ambush:{name:'侧道伏兵',enemy:'road_raider',hp:1.1,speed:1.1,bonus:'scrap_iron',amount:2,text:'增援一名绕后骑兵，全敌气血、速度提高 10%。胜利另得碎铁；注意保护后排。'},supplies:{name:'深处药箱',enemy:'snake',hp:1.2,speed:1,bonus:'herb',amount:2,text:'增援一条毒蛇（开场怒气 90），全敌气血提高 20%。胜利另得药草；备好解毒和治疗。'}};
export const routeReward=(route,tier)=>Object.hasOwn(SPECIAL_ROUTES,route)?{id:SPECIAL_ROUTES[route].bonus,count:SPECIAL_ROUTES[route].amount*tier}:null;

Object.assign(SPECIAL_ROUTES,{
 oreguard:{introduced:2,areas:['mine','minechief'],name:'封炉守卫',enemy:'guard',hp:1.15,speed:1,bonus:'iron',amount:1,text:'多一名守卫；全敌气血提高 15%，开场护阵 45%，持续 12 秒。破阵本领可提前除去护阵，强攻会被削弱。'},
 poisonbank:{introduced:2,areas:['marsh','marshnest'],name:'涉毒浅滩',enemy:'snake',hp:1.1,speed:1,bonus:'herb',amount:3,text:'多一条毒蛇；全敌气血提高 10%。涉水者开场中毒，每 2 秒损失 3% 最大气血，共 4 次；用解毒或净化应对。'},
 warbell:{introduced:2,areas:['ruins','ruinsvault'],name:'鸣钟援阵',enemy:'guard',hp:1.15,speed:1.1,bonus:'cloth',amount:2,text:'多一名守卫；全敌气血提高 15%、速度提高 10%。头目蓄势招式改为给全敌恢复 15% 气血，可打断或优先集火。'}
});
Object.assign(SPECIAL_ROUTES,{cutbell:{introduced:3,areas:['forestcamp'],name:'后路潜入',hp:1,speed:1,bonus:'mountain_vine',amount:1,text:'先在古道林后小径固定警铃。潜入后，头目的蓄势攻击只打前排一人；胜利另得山藤。'}});
Object.assign(SPECIAL_ROUTES,{
 boarders:{introduced:4,areas:['water'],name:'接舷追兵',enemy:'guard',hp:1.1,speed:1,bonus:'cloth',amount:2,text:'邻船赶来一名守卫，全敌气血提高 10%。胜利另得粗布；可先集火两侧水匪。'},
 moored:{introduced:4,areas:['waterfort'],name:'系缆稳船',hp:1,speed:1,bonus:'reed_fiber',amount:1,text:'先在渡口地图修好泊船桩。系缆后，回流撞船伤害降低 20%，不再损失怒气；固守仍能再减伤。胜利另得苇丝。'}
});
Object.assign(SPECIAL_ROUTES,{
 shieldpass:{introduced:5,areas:['mountain'],name:'隘口盾阵',enemy:'guard',hp:1.1,speed:1,bonus:'iron',amount:1,text:'增援一名盾兵，全敌气血提高 10%，开场护阵 30%，持续 8 秒。守炉重锤可破去护阵；胜利另得精铁。'},
 highpath:{introduced:5,areas:['mountainhold'],name:'高处绕行',hp:1,speed:1.15,bonus:'copper_sand',amount:1,text:'先修通粮道栈道。绕行后头目不举盾，改为较轻的前排单体突刺；全敌速度提高 15%。可打断或固守。胜利另得赤铜砂。'}
});
Object.assign(SPECIAL_ROUTES,{convoy:{introduced:6,areas:['mountainhold'],name:'护粮回程',enemy:'bandit',hp:1.1,speed:1.05,bonus:'leather',amount:1,text:'先接下车夫来信、查过乱石隘。多一名绕后伏兵，全敌气血 +10%、速度 +5%。头目蓄势三秒后夹击最后一位同伴；击倒最末位伏兵或打断头目可阻止，固守减伤 50%。胜利另得熟皮，随机掉落沿用截粮营。'}});
Object.assign(SPECIAL_ROUTES,{orecart:{introduced:7,areas:['minechief'],name:'截矿夺车',enemy:'guard',hp:1,speed:1,bonus:'magnetite_sand',amount:1,text:'先在旧炉房接老杜的口信，到运矿道查看车辙。多一名运料匪；头目每次蓄势三秒后，若运料匪仍在，恢复自身 10% 气血、全敌护阵 20% 六秒。先击倒最末位运料匪可断供并使头目破甲，也可打断。胜利另得磁铁砂，随机掉落沿用炉底密窟。'}});
Object.assign(SPECIAL_ROUTES,{reedvenom:{introduced:8,areas:['marshnest'],name:'清渠除蛇',hp:3,speed:1,bonus:'marsh_orchid',amount:1,text:'先回草庐接口信，再查看药圃进水沟。此路全敌气血为普通路线的 3 倍。赤背首蛇蓄势时令全队中毒：每 2 秒损失 1% 最大气血，持续 4 秒；三秒后向仍中毒的人追加两跳重毒，每跳 6% 最大气血。提前解毒可避开追毒，固守使本次重毒减半，打断可阻止追加，已中的毒仍需处理。胜利另得泽兰，随机掉落沿用芦荡药船。'}});
export const routeAllowed=(route,id)=>route===undefined||Object.hasOwn(SPECIAL_ROUTES,route)&&(!SPECIAL_ROUTES[route].areas||SPECIAL_ROUTES[route].areas.includes(id));

Object.assign(SPECIAL_ROUTES,{
 bellbreak:{introduced:9,areas:['ruinsvault'],name:'断钟取谱',enemy:'bandit',hp:1.2,speed:1,bonus:'stone_rubbing',amount:1,text:'先到残钟楼听乐和说钟声，查看夹道钟绳。增加一名摇钟人，全敌气血 +20%。头目蓄势三秒后，若最后一位摇钟人仍存活且未眩晕，全队攻击降低 35% 六秒、怒气 -15；击倒或眩晕摇钟人则头目破甲六秒。也可打断头目。胜利必得拓片 1/2/3，其他掉落沿用内室。'},
 crossfire:{introduced:9,areas:['forestcamp'],name:'夺回路引',enemy:'bandit',hp:1.2,speed:1,bonus:'mountain_vine',amount:1,text:'先到茶棚问失货，再查哨台脚印。第二位和最末位是弩手，全敌气血 +20%。头目蓄势三秒后，每名存活且未眩晕的弩手追射气血比例最低的同伴；固守使本招额外减伤 50%。优先击倒弩手可减少连射，也可打断头目；两名弩手失去接应时头目虚弱六秒。胜利必得山藤 1/2/3，其他掉落沿用营地。'},
 backwash:{introduced:9,areas:['waterfort'],name:'夺回渡船',hp:1.4,speed:1,bonus:'reed_fiber',amount:1,text:'先到鱼棚听船户说夜潮，再查看船桩断缆。全敌气血 +40%。头目先蓄势三秒撞前浪，三秒后再蓄势三秒撞回头浪；随后休整十二秒。两波固守各减伤 60%，回头浪未固守还使怒气 -20；两波可分别打断。胜利必得苇丝 1/2/3，其他掉落沿用水寨。'}
});

Object.assign(SPECIAL_ROUTES,{timberguard:{introduced:10,areas:['mine'],name:'护送木料',enemy:'road_raider',hp:1,speed:1,bonus:'wood',amount:1,text:'先与李云查过裂梁，再请汤隆备好铁箍。多一名夺木骑匪，绕击后排；可先集火他，或照应后排。胜利必得木材 1/2/3，其他掉落沿用旧矿洞；不耗体力、粮草，也不带兵。'}});

Object.assign(SPECIAL_ROUTES,{medicineboat:{introduced:11,areas:['waterfort'],name:'药船夜渡',enemy:'bandit',hp:1.15,speed:1,bonus:'herb',amount:2,text:'先办妥三地重访，随安道全、时迁和阮小七查明药船去向。开场弩手眩晕六秒，全队减伤 20% 八秒。头目蓄势三秒，最末位弩手连射伤重者两箭；除去或眩晕弩手可阻止并使头目破甲，固守减伤 50%，也可打断。胜利必得药草 2/4/6，其他掉落沿用水寨。'}});
