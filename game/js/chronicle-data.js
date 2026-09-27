// 商路行记：同一条路上的三次往返，营建选择留在各章结语中。
export const CHRONICLES={
 forest:{
  name:'青石开集',project:'三岔路栈',equipment:'route_forest_blade',
  chapters:[
   {
    title:'雨里停着的车',
    intro:'昨夜雨急，青石古道旁的草棚塌了半边。卖陶碗的老周守着车，鞋底还陷在泥里。“村里等着拿碗换盐，这一趟总得走完。”前头有人拦路收钱，后头还有两户人家没赶上来。',
    choices:{
     shelter:{label:'修棚接应',text:'沿途护送一次迷途行旅，把落后的村民带回路栈，再走通古道。',ending:'老周把最后一捆干草铺进新棚，落后的两户人家也赶到了。雨还没停，棚下已架起一口煮粥的锅。'},
     watch:{label:'立哨清路',text:'击败一次强敌辎重，查清拦路人的藏处，再走通古道。',ending:'拦路人丢下绳索逃进林子，村民在路栈旁立起高哨。老周先推着空车试了一趟，回来才招呼众人上路。'}
    },
    cost:{wood:100,iron:8,silver:150},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'一车空筐',
    intro:'三岔路栈修整后，老周又赶来了，这次车上全是空筐。他在桌上摊开几张欠条：“东村的豆子换了西村的盐，钱过两日才结。”林外传来急促的车铃，送豆的人却迟迟不见影子。',
    choices:{
     shelter:{label:'设灶留宿',text:'沿途护送一次迷途行旅，接回误路的送豆人，再走通古道。',ending:'送豆人循着炊烟进了路栈，把湿透的欠条放在灶边烘干。老周认过数，给每户留出一筐盐，天亮再结账。'},
     watch:{label:'巡林寻车',text:'击败一次强敌辎重，赶开尾随货车的游匪，再走通古道。',ending:'巡哨的人从林边带回豆车，车铃上还缠着截路用的细绳。老周把绳结挂在哨旁，叮嘱后来者见着就绕开。'}
    },
    cost:{wood:180,iron:16,silver:300},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'开集这一日',
    intro:'到了约好的集日，三岔路栈外摆出了豆筐、盐袋和新烧的陶碗。老周拿炭在木牌上写价，一个小孩蹲着替他扶牌。午前还缺最后一队赶集的人；路那头尘土扬起，有人认出了旧日截车的旗。',
    choices:{
     shelter:{label:'迎人入集',text:'沿途护送一次迷途行旅，接齐赶集人家，再走通古道。',ending:'末班赶集的人进棚歇脚时，盐摊还替他们留着货。老周收起价牌，让孩子喊了一声：“下月逢五，还在这里。”'},
     watch:{label:'守住集路',text:'击败一次强敌辎重，拆掉游匪新设的路障，再走通古道。',ending:'截车的旧旗被卷进柴堆，巡哨一直送最后一辆货车过了林口。老周在路栈门上钉了集期，商贩逐个记下才散。'}
    },
    cost:{wood:280,iron:26,silver:500},reward:{recruit_order:1,material_choice:1,immortal_seal:1}
   }
  ]
 },
 water:{
  name:'芦荡归舟',project:'芦荡渡站',equipment:'route_water_charm',
  chapters:[
   {
    title:'搁浅的渡船',
    intro:'芦荡水涨，旧渡船横在浅滩，船头只剩一根缆绳。艄公阿顺泡在水里摸漏口，岸上的菜农拢着快蔫的青菜。“日落前过不了河，明早这一担就卖不成了。”芦苇深处又传来两声求救。',
    choices:{
     shelter:{label:'搭棚救人',text:'沿途护送一次迷途行旅，接住失散的乘客，再走通渡口。',ending:'湿衣裳挂满了渡站的新棚，获救的菜农分出一篮青菜煮汤。阿顺补牢漏口，答应明早第一船先载他们过河。'},
     watch:{label:'架台护渡',text:'击败一次强敌辎重，清走苇荡里的劫船人，再走通渡口。',ending:'藏在芦苇里的快船被拖上岸，渡站的望台亮起一盏风灯。阿顺看见灯号才解缆，第一担青菜赶上了晚市。'}
    },
    cost:{wood:110,iron:8,silver:150},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'夜里的一盏灯',
    intro:'芦荡渡站重新用了起来，阿顺却多备了一条空船。对岸村里托人捎信，有几名病人要过河看郎中，约在入夜时点灯。等到月亮升起，苇荡里同时亮了两处火，划船来的孩子分不清哪处才对。',
    choices:{
     shelter:{label:'备铺迎客',text:'沿途护送一次迷途行旅，接回等船的人，再走通渡口。',ending:'病人躺上渡站铺好的干席，郎中挽起袖子逐个看脉。阿顺把旧船灯留在门边，约定往后只认三短一长的灯号。'},
     watch:{label:'辨灯清荡',text:'击败一次强敌辎重，查掉诱船入荡的假灯，再走通渡口。',ending:'假灯下果然藏着钩船的铁链，望台把真灯号一遍遍传过河去。阿顺接回了病人，天将亮时才坐下喝第一口热水。'}
    },
    cost:{wood:190,iron:16,silver:300},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'两岸同一个船期',
    intro:'病人回村后，两岸商贩合送了一块木牌，请阿顺写上每日船期。他刚蘸好墨，一个挑盐的妇人便来报信：下游有人横了铁索，几只运米船都被扣住。岸上排队的人越聚越多，谁也不肯先离开。',
    choices:{
     shelter:{label:'接应滞客',text:'沿途护送一次迷途行旅，把滞留岸边的人带到渡站，再走通渡口。',ending:'渡站的热饭一直留到末班船靠岸，运米人把第一袋米交给了掌灶的妇人。阿顺挂好船期，两岸都照着同一时辰候船。'},
     watch:{label:'断索通航',text:'击败一次强敌辎重，拔掉扣船人的水卡，再走通渡口。',ending:'铁索沉下水去，望台一路打灯送米船出荡。阿顺把船期钉在渡站门口，背面另记下每夜轮值看灯的人名。'}
    },
    cost:{wood:290,iron:26,silver:500},reward:{recruit_order:1,material_choice:1,immortal_seal:1}
   }
  ]
 },
 mountain:{
  name:'断崖送粮',project:'断崖转运站',equipment:'route_mountain_armor',
  chapters:[
   {
    title:'滚下坡的米袋',
    intro:'断崖粮道上散着一串米粒，翻倒的独轮车卡在石缝里。山民石嫂抱住一袋破米，叫同伴先别去追逃走的骡子。“上头三户人家快断炊了，米不能再少。”崖顶有人探头张望，随即推下一块碎石。',
    choices:{
     shelter:{label:'筑棚收粮',text:'沿途护送一次迷途行旅，带回散落的脚夫，再走通粮道。',ending:'脚夫把破袋重新缝好，在转运站的干棚里称过米。石嫂一斗斗补齐三户的份额，自己背起最轻的一袋走在前头。'},
     watch:{label:'设哨排险',text:'击败一次强敌辎重，清掉崖上的落石埋伏，再走通粮道。',ending:'推石的人逃离了崖顶，村民沿险处钉好木桩挂上哨铃。石嫂听见前哨报平安，才牵着寻回的骡子走过窄坡。'}
    },
    cost:{wood:100,iron:10,silver:150},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'雪前的第二趟',
    intro:'断崖转运站收拾妥当，石嫂便来催第二趟粮。山风里已夹着雪粒，她把盐和药材塞进米袋间：“多捎一程，山里少熬几日。”管账的年轻人点到末尾，才发现去接货的两个脚夫还没回来。',
    choices:{
     shelter:{label:'添炭接人',text:'沿途护送一次迷途行旅，寻回被风雪拦住的脚夫，再走通粮道。',ending:'两个脚夫摸进棚时，手指冻得解不开绳扣，石嫂替他们卸下药包。炭盆烧了一夜，第二天出发时每人都领到一壶热水。'},
     watch:{label:'巡隘护运',text:'击败一次强敌辎重，夺回脚夫被扣的货担，再走通粮道。',ending:'山隘的拦索被割断，哨上举起白布，失散的脚夫这才敢露面。石嫂验过药材，把巡路人磨破的鞋也记进补给单。'}
    },
    cost:{wood:180,iron:18,silver:300},reward:{recruit_order:1,material_choice:1}
   },
   {
    title:'封山前的账',
    intro:'第一场雪落在转运站门槛上，石嫂摊开各村按过手印的粮账，还差最远的石背村没收齐。赶骡子的少年坚持再走一趟，他爹正在村口等。偏在这时，守隘的人报来消息：旧寨的人又占了必经的石梁。',
    choices:{
     shelter:{label:'留粮等归',text:'沿途护送一次迷途行旅，接回最后一队送粮人，再走通粮道。',ending:'少年回来时，转运站还给他留着一碗热粥。石嫂在最后一行粮账上按了印，把余粮封进干仓，钥匙交给三村轮流保管。'},
     watch:{label:'守梁送粮',text:'击败一次强敌辎重，夺回石梁让末班粮队通过，再走通粮道。',ending:'石梁两端都换上村民轮哨，末班粮队在落雪前过了隘口。石嫂合上粮账，让少年把收粮的手印一个不落地带回了转运站。'}
    },
    cost:{wood:280,iron:28,silver:500},reward:{recruit_order:1,material_choice:1,immortal_seal:1}
   }
  ]
 }
};

export const CHRONICLE_RANK_CAP=8;
export const FORGE_STEPS=[
 {rank:2,marks:12,iron:20,silver:300},
 {rank:4,marks:24,iron:40,silver:700},
 {rank:6,marks:40,iron:70,silver:1200}
];

export function chronicleGearMultiplier(s,item){
 const region=Object.keys(CHRONICLES).find(id=>CHRONICLES[id].equipment===item);
 return region?1+.15*(s.realm?.journey?.chronicle?.routes?.[region]?.forged||0):1;
}

const PATROL_RULES=[
 {id:'raid',name:'急袭',text:'敌方攻击 +8%、速度 +12%，开战怒气 +35。',attack:1.08,speed:1.12,defense:1,hp:1,rage:35,guard:0},
 {id:'rampart',name:'坚垒',text:'敌方防御 +28%；破甲与谋略伤害更容易撬开阵线。',attack:1,speed:1,defense:1.28,hp:1,rage:0,guard:0},
 {id:'attrition',name:'耗战',text:'敌方气血 +20%，开战获得 12% 护阵，持续 6 秒。',attack:1,speed:1,defense:1,hp:1.2,rage:0,guard:.12}
];

export function patrolRule(rank){
 const level=Math.max(1,Math.min(CHRONICLE_RANK_CAP,Math.floor(Number(rank)||1)));
 return {...PATROL_RULES[(level-1)%PATROL_RULES.length]};
}

// Shared by combat and its preview so displayed multipliers cannot drift.
export function patrolStrength(rank){const q=patrolRule(rank);return {hp:(1+.18*rank+.055*rank*rank)*q.hp,attack:(1+.12*rank+.022*rank*rank)*q.attack,defense:(1+.10*rank)*q.defense};}
