// Data-only content for volumes VIII–X. Story choices never grant or replace owned heroes.
const flag = id => ({flag:id});
const notFlag = id => ({notFlag:id});
const all = (...conditions) => ({all:conditions});
const any = (...conditions) => ({any:conditions});
const mark = id => ({type:'flag',id});
const item = (id,amount) => ({type:'item',id,amount});
const known = id => ({type:'hero',id,status:'known'});
const link = (target,condition=null) => ({target,condition});
const chapterId = {8:'volume_eight',9:'volume_nine',10:'volume_ten'};
const chapterName = {8:'曾头疑云',9:'大名救援',10:'百川归泊'};
const firstFinished = any(flag('v8_rescue_done'),flag('v8_evidence_done'),flag('v8_supply_done'));
const v8Task = priority => all(flag('v8_chosen'),any(flag('v8_priority_'+priority),firstFinished));
const v8Ready = all(flag('v8_rescue_done'),flag('v8_evidence_done'),flag('v8_supply_done'));
const area = (volume,id,name,description,stories,links) => ({id,name,region:chapterName[volume],type:'area',description,links,actions:[],stories,dungeons:[],chapter:chapterId[volume]});
const stop = (volume,id,name,description,story) => area(volume,id,name,description,[story],[link('v'+volume+'_camp')]);
const finish = (label,effects,condition=null) => ({id:'finish',label,condition,finish:true,effects});
const conversation = (id,title,map,condition,text,choices) => ({id,title,map,condition,start:'start',steps:{start:{map,condition,text,choices}}});
const encounter = (id,title,map,condition,text,enemies,after,effects) => ({id,title,map,condition,start:'fight',steps:{
  fight:{map,condition,text,choices:[{id:'fight',label:'整备出征',condition,next:'settle',battle:{enemies,scale:1}}]},
  settle:{map,condition,text:after,choices:[finish('清点人员与战果',effects)]}
}});

export const maps = [
  area(8,'v8_camp','曾市外营','失踪马队的车辙止在曾头市外。先定下要紧的事，再从营地分路查人、查账、截粮。',['v8_choose','v8_settle'],[
    link('v7_camp'),link('v8_barn',v8Task('rescue')),link('v8_office',v8Task('evidence')),link('v8_road',v8Task('supply')),link('v8_gate',v8Ready),link('v9_camp',flag('volume_eight_complete'))]),
  stop(8,'v8_barn','西郊废马棚','几名商旅被围在漏雨的马棚，后墙外有弩手。先让他们活着走出巷口。','v8_rescue'),
  stop(8,'v8_office','旧税亭','一份写着“梁山劫粮”的口供留在亭内。签押的车夫与账上的行期对不上。','v8_evidence'),
  stop(8,'v8_road','北坡粮车道','押运者把粮车往市内赶，后队弩手专守狭口。先压住后排，再夺车。','v8_supply'),
  stop(8,'v8_gate','曾市东门','人证与账册齐了，史文恭仍不肯打开东门。最后一批押车人关在门后的仓院。','v8_final'),
  area(9,'v9_camp','大名城外营','曾头市转送名册上写着大名牢城。燕青带来了城门换岗的时辰，先在此议定救援路线。',['v9_choose','v9_settle'],[
    link('v8_camp'),link('v9_gate_map',flag('v9_chosen')),link('v9_prison_map',flag('v9_gate_done')),link('v9_river',flag('v9_prison_done')),link('v10_camp',flag('volume_nine_complete'))]),
  stop(9,'v9_gate_map','北门接应口','控制门洞，才能把接应队与伤者送过来。暗线先断传令，正攻则要扛过两阵重甲。','v9_gate'),
  stop(9,'v9_prison_map','牢城后院','石秀在墙根留了三道划痕。牢门里不止卢俊义，还有被一道押来的商旅与脚夫。','v9_prison'),
  stop(9,'v9_river','城西浅渡','船板已经搭好，伤者还得走过暴露的河岸。敌弩手活着时会持续追射。','v9_escape'),
  area(10,'v10_camp','归泊接应营','三条来路都有人等船。先护送归人，再核对仓粮和守备，办妥后众人才肯安心落座。',['v10_report','v10_gather'],[
    link('v9_camp'),link('v10_roads',flag('v10_reported')),link('v10_store',flag('v10_escort_done')),link('v10_ford_map',flag('v10_allocated')),link('v11_camp',flag('volume_ten_complete'))]),
  stop(10,'v10_roads','三路会合口','北来的车队、东岸的渔船、山路的家眷依次过口，前一队过去后才能接下一队。','v10_escort'),
  stop(10,'v10_store','新寨粮仓','军粮与民粮都要留够。余下的力气是多备热饭药汤，还是先加固渡口，需要众人定下。','v10_allocate'),
  stop(10,'v10_ford_map','南泊渡口','敌前阵试探栈桥，后阵藏在芦湾。守住第一阵后，还要截住追向归人船只的第二阵。','v10_ford')
];

export const stories = [
  conversation('v8_choose','城外定先后','v8_camp',flag('volume_seven_complete'),
    '马商把断裂的车辕放在地上，木头上还烙着梁山的记号。失踪的人里有替寨里买药的老周，曾头市却贴出告示，说是梁山先劫了粮。\n晁盖提起外衣：“人扣在里头，我去问他们。”\n吴用拦住营门：“棚里有人受伤，税亭有口供，北路还有粮车。先带齐一件凭据，再去讨说法，别让他们借乱转走人。”\n晁盖停了一会，把刀交给随从：“我在这里等回报。人要一个个接回来。”\n\n先选一项并完成，余下两项可任意安排，三项全做才能进东门。选择免费，本卷仅生效一种准备，确定后不能更换。\n先救人：东门决战开场，全队获得最大气血10%的护盾。\n先查证：东门主将初始怒气由30降为15。\n先截粮：东门决战少一名援兵。',[
      {id:'rescue',label:'先救受伤商旅 · 决战护盾10%',condition:notFlag('v8_chosen'),finish:true,effects:[mark('v8_chosen'),mark('v8_priority_rescue')]},
      {id:'evidence',label:'先查劫粮口供 · 主将初怒减15',condition:notFlag('v8_chosen'),finish:true,effects:[mark('v8_chosen'),mark('v8_priority_evidence')]},
      {id:'supply',label:'先截北路粮车 · 决战少一援兵',condition:notFlag('v8_chosen'),finish:true,effects:[mark('v8_chosen'),mark('v8_priority_supply')]}
    ]),
  encounter('v8_rescue','马棚接人','v8_barn',v8Task('rescue'),
    '老周把门板顶在身前，后面缩着两个走不动的商旅。墙外的弩手一露头，他就让两人伏低。\n“马丢了还能找，人可不能再丢。”晁盖派来的接应手把担架送到墙边，等你压住弩箭。\n\n护送目标：受伤商旅，气血100。敌弩手每4秒造成12点护送伤害，击败弩手即可停射；目标气血归零则救援失败。固守使护送损失减半；弩手眩晕时暂停追射，击倒后停射。先处理弩手，再收拾拦路护院。\n出征门槛：聚义厅4级，队中一人38级。体力12。',
    ['v8_guard','v8_crossbow'],
    '最后一名商旅被抬过破墙，老周这才松开门板。他袖里藏着半截押车单，上面列着马匹数目和被扣人的名字。\n“他们叫我们认劫粮的罪，有人不肯，被押去了税亭。”\n你把单子交回营地，让接应的人继续找名单上未应声的名字。',
    [mark('v8_rescue_done'),item('jinchuangyao',3),item('herb',4)]),
  encounter('v8_evidence','税亭对供','v8_office',v8Task('evidence'),
    '税亭里的车夫一见你便指向桌子：“纸上说初八被劫，可那天车轮断在东铺，修车钱还没付！”\n一名管事伸手抢账，守亭的兵丁跟着拔刀。先护住人和账，再把每张单子的日子对起来。\n\n传令者在后排，动作快；亭前护卫会替他挡路。聚义厅4级，队中一人38级。体力12。',
    ['v8_guard','v8_runner'],
    '吴用把修车收条、粮行出账与口供并排压好。三张纸的日子错了一天，签押却出自同一只手。\n车夫认出押送人的腰牌：“这是给大名府运军粮的。他们扣车，把缺粮的账安在你们头上。”\n你请他照实写下所见，连同冒名签押的旧纸一并收好。',
    [mark('v8_evidence_done'),item('martial_pages',3),item('iron',3)]),
  encounter('v8_supply','北坡夺车','v8_road',v8Task('supply'),
    '北坡上，粮车被横在狭口，两名护院借车挡路。车后弩手正把箭束分开，准备守到天黑。\n花荣看了一眼车辙：“先别推车。把后头那人压住，前边就少一道催命的箭。”\n\n粮车不能自行退走，可集中处理后排弩手。聚义厅4级，队中一人38级。体力14。',
    ['v8_guard','v8_crossbow','v8_runner'],
    '弩手退下北坡，车夫立刻把绳套交给你。几袋粮食里夹着旧封条，戳记与税亭账册相同。\n众人把粮袋重新扎紧，先给商旅留出路上吃的，再把余粮与马匹拉回营地。东门那边终于有人来问，你们拿到了什么。',
    [mark('v8_supply_done'),item('grain',6),item('huiqisan',2)]),
  encounter('v8_final','东门讨人','v8_gate',v8Ready,
    '晁盖将押车单举到门前：“单上还有人没回来。开仓院，我们当面点。”\n史文恭按住枪杆：“账是管事的账，曾头市的门不能任你们进。”\n吴用把三份证据放在门槛外，叫车夫退到盾后。史文恭已带护院冲下来，援兵正在旗边整队。\n\n本卷只应用最初选定的准备：救人得全队10%护盾；查证使史文恭初怒30降至15；截粮使援兵不入场。聚义厅4级，队中一人39级。体力18。',
    ['v8_shiwengong','v8_guard','v8_aid'],
    '史文恭的枪被挡在门柱上，守门人见后路已断，终于取来仓院钥匙。\n晁盖没追出门去。他站在院口，一声声念着押车单上的名字，直到最后一人被扶出来，才把单子折起。\n管事另交出一册转送名簿。上面除了商旅，还有“卢俊义”“石秀”两个名字，落脚处都是大名牢城。',
    [mark('v8_final_done'),item('martial_pages',4),item('jiedudan',2)]),
  conversation('v8_settle','把名册带回去','v8_camp',flag('v8_final_done'),
    '营外摆了几条长凳，伤者换过药，马也吃上了草料。晁盖将空担架收在一边：“这些明日还要带着，别觉得救完这一拨就用不着了。”\n老周指着转送名簿说，石秀曾替同牢的人拦下鞭子，卢俊义则托人给城外送信。那信最后落到了燕青手里。\n吴用把名簿包好：“去大名府之前，先找到燕青。路要从外头留到牢门。”',[
      finish('安置人马，带名簿赴大名',[mark('v8_settled'),known('yanqing'),known('lujunyi'),known('shixiu')])
    ]),

  conversation('v9_choose','北门两条路','v9_camp',flag('volume_eight_complete'),
    '燕青蹲在泥地上画出北门：“小乙试过了。换岗时哨兵走这边，传令的从门洞穿过去。另一边甲兵多，若硬夺门，后头还会补来一阵。”\n他把一条藏着字的布带交给你。石秀记着牢城后门的位置，还添了一行：“船多留一只，有人腿伤。”\n\n两路奖励相同，只选一次，不要求燕青入队，也不消耗物品。\n暗线：门战先击破哨兵、传令者；撤离战少最后一波援军。\n正攻：门战连续迎战两阵重甲；撤离时城门接应使护送目标所受追射伤害减半。\n每关战后分别确认保存，可回营调整同一支队伍再出发。',[
      {id:'covert',label:'走暗线 · 断传令、撤离少一波',condition:notFlag('v9_chosen'),finish:true,effects:[mark('v9_chosen'),mark('v9_covert'),known('yanqing')]},
      {id:'assault',label:'夺城门 · 两阵重甲、护送减伤50%',condition:notFlag('v9_chosen'),finish:true,effects:[mark('v9_chosen'),mark('v9_assault'),known('yanqing')]}
    ]),
  encounter('v9_gate','夺取接应点','v9_gate_map',flag('v9_chosen'),
    '北门灯笼换到另一侧，燕青让接应手贴着墙根等候。门洞里的脚步渐渐密了，不能让传令者跑回去喊齐守军。\n若已选正攻，就由前队撑住门洞，击退第一阵后继续迎击补来的重甲，不能把伤者堵在门外。\n\n暗线敌阵：哨兵、传令者。正攻敌阵：重甲两人，随后重甲与门军队正一阵。聚义厅4级，队中一人39级。体力14。',
    ['v9_sentry','v9_messenger'],
    '接应手在门轴上塞进木楔，牵来一辆空车挡住横街。燕青试了试退路，确定担架能转过弯，才向牢城打出约好的灯号。\n“这里留人。你们进去以后，我们只管把路守住。”',
    [mark('v9_gate_done'),item('iron',4),item('jinchuangyao',3)]),
  encounter('v9_prison','开牢接人','v9_prison_map',flag('v9_gate_done'),
    '墙根的三道划痕还在。你刚叩响后门，里面便传来石秀的声音：“钥匙在管营腰上，别只开最里头那间！”\n牢城甲兵堵住过道，管营退到后排喝令关门。狭道里挪不开身，先稳住前排，再拆开他们的护阵。\n\n聚义厅4级，队中一人39级。体力16。',
    ['v9_armor','v9_jailer','v9_crossbow'],
    '石秀接过钥匙，逐间把门打开。卢俊义扶着一个伤了脚的脚夫出来，没有先问兵马，只问：“这里的人，都在单上么？”\n你把名册递给他。他在漏记的两人旁添上名字，随后与石秀各抬一头担架，跟着接应灯火往河边走。',
    [mark('v9_prison_done'),known('lujunyi'),known('shixiu'),item('martial_pages',4),item('huiqisan',2)]),
  encounter('v9_escape','浅渡护伤者','v9_river',flag('v9_prison_done'),
    '河风把灯笼吹得直晃。第一只船已靠岸，余下的伤者还在坡上；城中追兵抄到树后，弩箭正追着担架走。\n石秀把一块门板竖在伤者身侧：“先把那几张弩压住，我留在这里抬最后一人。”\n\n护送目标：撤离伤者，气血100；追射弩手每4秒造成10点伤害，击破弩手即停止。每阵独立有弩手；眩晕该弩手可暂停追射，固守使当次护送损失再减半（向上取整）。\n暗线：初阵后只来一波援军。正攻：初阵后两波援军，但城门掩护将护送伤害减半。聚义厅4级，队中一人39级。体力18。',
    ['v9_pursuer','v9_crossbow'],
    '最后一副担架放上船板，石秀扶住船沿才喘匀气。卢俊义又从头数了一遍，添上的两个名字也有人答应。\n燕青割断临时牵绳，众船顺水离岸。岸上的追兵止住脚步，灯火渐渐留在身后。',
    [mark('v9_escape_done'),item('herb',5),item('martial_pages',4)]),
  conversation('v9_settle','回泊之前','v9_camp',flag('v9_escape_done'),
    '清早，卢俊义把抄好的名单交到宋江手里：“先照这份安置，伤着的别跟车走。我欠的话，到了寨里再慢慢说。”\n石秀靠着车辕睡着了，燕青把没吃完的饼包好放在他手边。\n信使从梁山赶来：几处山寨愿带家眷归泊，北路车多，东岸船少，山路还有老人落在后头。宋江看了看刚收好的担架，叫人先别拆。',[
      finish('核齐获救名单，筹备三路接应',[mark('v9_settled'),known('lujunyi'),known('shixiu')])
    ]),

  conversation('v10_report','三路来人','v10_camp',flag('volume_nine_complete'),
    '宋江把三封来信摊在桌上：北路车队停在旧桥，东岸渔船等着过汊，山路来的家眷走得最慢。\n林冲按住北路那张：“车一堵，后头的人就动不了。前阵要先接住，别让赶车的掉头。”\n鲁智深提起一捆绳子：“桥口我去看。哪处过完了，就把空担架送下一处。”\n众人先分了接应的活计，聚义的酒席暂且收在棚里。',[
      finish('带名册与担架，接三路归人',[mark('v10_reported')])
    ]),
  encounter('v10_escort','三路归人','v10_roads',flag('v10_reported'),
    '三路人马依次来到会合口。抢掠粮包的散兵从芦苇里钻出，弓手躲在后头，想把赶路的人逼散。\n鲁智深将绳子系到桥柱上：“这一队走完再换下一队，谁也别越过绳子抢路！”\n\n连续三阵：北路车队、东岸渔户、山路家眷。护送目标为归人队伍，气血100，三阵共用；敌弓手每4秒造成8点伤害，击破本阵弓手即停射。射手眩晕时暂停追射，固守使护送损失减半。各阵清完后接入下一阵。聚义厅4级，队中一人39级。体力16。',
    ['v10_raider','v10_raider_archer'],
    '北路车轮终于转过旧桥，东岸的孩子被抱上接应船，山路最后一位老人也扶着绳索走到营门。\n几家人在桥边认出了旧日仇家，手刚伸向腰间，林冲便递来一副担架：“先把这人送进帐。账要说，等他换完药再说。”\n两人各接一头，一路没有再争。',
    [mark('v10_escort_done'),item('jinchuangyao',4),item('herb',4)]),
  conversation('v10_allocate','粮仓分用','v10_store',flag('v10_escort_done'),
    '新来的粮袋堆到了门外，账却分成几本。有人要先足军粮，有人说老人孩子一路没吃过热饭。\n鲁智深敲了敲空锅：“两边嘴里都要有饭，先把口粮划出来。”\n林冲把守渡的人数写在旁边：“剩下这些手，可以熬药送饭，也可以加木桩、补盾牌。”\n宋江将两份口粮都封存入册，余下的安排请众人定一个。\n\n两案均保障军民口粮，不扣物品，只影响下一场守渡口。选定后不能更换。\n补给：第一阵结束、第二阵进入时，存活队员恢复最大气血15%。\n防守：战斗开场，全队获得最大气血15%的护盾。',[
      {id:'supply',label:'多备热饭药汤 · 波间恢复15%',condition:notFlag('v10_allocated'),finish:true,effects:[mark('v10_allocated'),mark('v10_supply')]},
      {id:'defense',label:'加桩补盾守渡 · 开场护盾15%',condition:notFlag('v10_allocated'),finish:true,effects:[mark('v10_allocated'),mark('v10_defense')]}
    ]),
  encounter('v10_ford','守桥再截追兵','v10_ford_map',flag('v10_allocated'),
    '第一队敌兵试探栈桥，水边却另有小船在绕。林冲看见芦丛里的桨影，叫守桥的人留半步，不要追过标好的木桩。\n“桥头这一阵散了，后头会去咬归人的船。先守住，再转身截。”\n\n两阵连续：先击退盾兵与弓手，再迎击追舟队正与快手。粮仓方案只应用一项：补给在两阵之间恢复存活队员最大气血15%；防守在开场给全队15%护盾。聚义厅4级，队中一人39级。体力18。',
    ['v10_shield','v10_raider_archer'],
    '栈桥前的盾阵退下，众人按约让出半条木道，随后转向芦湾，把追舟的第二队截在浅水里。归人的最后一艘船顺利靠岸。\n林冲把湿透的点名册摊在石上，鲁智深去锅边要来两碗热汤。早先在桥头争吵的两人还抬着同一副担架，正等伤者的家属接手。',
    [mark('v10_ford_done'),item('martial_pages',5),item('iron',5)]),
  conversation('v10_gather','把座位留给来人','v10_camp',flag('v10_ford_done'),
    '桌椅搬进厅里，最先放上案的却是人名册和仓粮账。老周报了曾头市接回的人，石秀报了大名牢城的伤者，三路接应手又把各自的名单补齐。\n宋江没有催人落座：“先说谁住哪间屋，伤药归谁领。以后谁领兵、谁押粮，也照今日这样对清。”\n林冲提出，军令要说明接应和退路；鲁智深只添一句：“遇着走不动的，先叫担架，别让人在路边等。”\n卢俊义让开身旁的座位，招呼还在门外的押车人进来。有人递酒，有人给碗添汤，厅内终于安定下来。\n\n聚义按这些已办妥的任务完成，不要求名册收齐108位，也不改变任何已有好汉的等级、品质或培养。',[
      finish('记定分工与口粮，众人同席',[mark('v10_gathered')])
    ])
];

const enemy = (id,name,hp,attack,defense,speed,strategy,skills,telegraph) => ({id,name,attribute:{hp,attack,defense,speed,strategy},skills,telegraphs:[telegraph],description:chapterName[Number(id.match(/^v(\d+)_/)[1])]+'战役敌军'});
export const enemies = [
  enemy('v8_guard','曾市护院',850,106,72,75,30,['guard_wall'],'护院将盾沿并在一处，遮住后排。'),
  enemy('v8_crossbow','曾市弩手',560,108,40,84,36,[],'弩手压低弩臂，瞄向墙边的商旅。'),
  enemy('v8_runner','押粮传令者',600,108,42,98,38,['bandit_cut'],'传令者绕过车辕，准备突向侧翼。'),
  enemy('v8_aid','东门援兵',650,108,48,80,28,[],'援兵正沿旗边靠近门洞。'),
  enemy('v8_shiwengong','史文恭',1620,140,78,92,48,['bandit_cut','guard_wall'],'史文恭压住枪尾，准备从盾侧穿入。'),
  enemy('v9_sentry','北门哨兵',740,114,56,86,32,['bandit_cut'],'哨兵试图退向门钟。'),
  enemy('v9_messenger','城门传令者',570,112,38,106,44,[],'传令者捏住号哨，正寻一处空隙。'),
  enemy('v9_armor','门军重甲',840,106,92,62,26,['guard_wall'],'重甲军士把盾架住，等后队换位。'),
  enemy('v9_captain','门军队正',1040,118,70,76,44,['bandit_cut'],'队正用刀背敲盾，催两翼一齐压上。'),
  enemy('v9_jailer','牢城管营',1370,126,74,78,50,['guard_wall','bandit_cut'],'管营将钥匙收进腰带，喝令封住过道。'),
  enemy('v9_crossbow','追射弩手',540,112,40,88,38,[],'弩手沿河岸移动，追瞄暴露的担架。'),
  enemy('v9_pursuer','城西追兵',760,116,58,88,34,['bandit_cut'],'追兵踏过浅水，向上船的缺口冲来。'),
  enemy('v10_raider','拦路散兵',750,112,55,84,30,['bandit_cut'],'散兵扯住行李绳，试图把归人队伍拉散。'),
  enemy('v10_raider_archer','追粮弓手',510,110,38,88,36,[],'弓手从芦苇后探身，瞄准桥上归人。'),
  enemy('v10_shield','试渡盾兵',890,112,86,68,32,['guard_wall'],'盾兵沿栈桥逼近，身后有人在解小船的缆绳。'),
  enemy('v10_pursuer','追舟快手',700,118,46,98,32,['bandit_cut'],'快手将短刀衔住，准备攀上船舷。'),
  enemy('v10_commander','追舟队正',1360,132,72,86,48,['bandit_cut','guard_wall'],'队正举手指向归人的船，催促后队加桨。')
];

// `waves` lists reinforcements after the initial story battle enemies, never repeats wave zero.
// Branch metadata is consumed by the late-mainline combat adapter, not by story effects.
export const missions = {
  v8_rescue:{level:38,hall:4,scale:6.1,terrain:'land',stamina:12,escort:{name:'受伤商旅',hp:100,pulse:4000,damage:12,source:'v8_crossbow'}},
  v8_evidence:{level:38,hall:4,scale:6.1,terrain:'land',stamina:12},
  v8_supply:{level:38,hall:4,scale:6.2,terrain:'land',stamina:14},
  v8_final:{level:39,hall:4,scale:6.3,terrain:'land',stamina:18,boss:'v8_shiwengong',bossRage:30,preparation:{rescue:{flag:'v8_priority_rescue',shield:.1},evidence:{flag:'v8_priority_evidence',rageReduction:15},supply:{flag:'v8_priority_supply',removeEnemy:'v8_aid'}}},
  v9_gate:{level:39,hall:4,scale:6.2,terrain:'land',stamina:14,variants:{v9_covert:{enemies:['v9_sentry','v9_messenger'],waves:[]},v9_assault:{enemies:['v9_armor','v9_armor'],waves:[['v9_armor','v9_captain']]}}},
  v9_prison:{level:39,hall:4,scale:6.3,terrain:'land',stamina:16},
  v9_escape:{level:39,hall:4,scale:6.2,terrain:'water',stamina:18,escort:{name:'撤离伤者',hp:100,pulse:4000,damage:10,source:'v9_crossbow'},waves:[['v9_pursuer','v9_crossbow'],['v9_captain','v9_crossbow']],variants:{v9_covert:{waves:[['v9_pursuer','v9_crossbow']]},v9_assault:{escortDamageMultiplier:.5}}},
  v10_escort:{level:39,hall:4,scale:6.2,terrain:'land',stamina:16,escort:{name:'三路归人',hp:100,pulse:4000,damage:8,source:'v10_raider_archer'},waves:[['v10_raider','v10_raider_archer'],['v10_pursuer','v10_raider_archer']]},
  v10_ford:{level:39,hall:4,scale:6.5,terrain:'water',stamina:18,waves:[['v10_commander','v10_pursuer']],preparation:{supply:{flag:'v10_supply',waveHeal:.15},defense:{flag:'v10_defense',shield:.15}}}
};
const requirement = (label,id) => ({label,condition:flag(id)});
const chapter = (number,prior,requirements,ending,seal=false) => ({id:chapterId[number],title:chapterName[number],number,entry:'v'+number+'_camp',condition:flag(prior),completeFlag:chapterId[number]+'_complete',requirements,ending,effects:[item('recruit_order',2),item('spirit_essence',5),...(seal?[item('immortal_seal',1)]:[])],baseLevel:1});
export const chapters = [
  chapter(8,'volume_seven_complete',[
    requirement('在曾市外定下先办之事','v8_chosen'),requirement('接出马棚受伤商旅','v8_rescue_done'),requirement('核清税亭口供','v8_evidence_done'),requirement('夺回北坡粮车','v8_supply_done'),requirement('打开东门，点齐押车人','v8_final_done'),requirement('安置人马，带回转送名册','v8_settled')
  ],'【曾头疑云】马匹牵回营中，扣押的商旅各自应了名字。晁盖留下与伤者同走，吴用把三份凭据夹进名册。\n\n燕青已在大名府城外等候。他送来的口信只有两句：“牢门的位置查清了。请多留一条送伤者出城的路。”\n第九卷《大名救援》已开启。'),
  chapter(9,'volume_eight_complete',[
    requirement('与燕青议定暗线或正攻','v9_chosen'),requirement('夺下北门接应点','v9_gate_done'),requirement('打开牢门，接出卢俊义与同行者','v9_prison_done'),requirement('护送伤者通过城西浅渡','v9_escape_done'),requirement('核齐名单，筹备归泊','v9_settled')
  ],'【大名救援】最后一船离开浅渡，名单上的名字全部有了应声。卢俊义与石秀随队归泊，燕青留到最后，将门板和空担架一并搬上船。\n\n梁山又来急信：三路归人已到，要接船，要口粮，也要把旧账与新规说清。第十卷《百川归泊》已开启。'),
  chapter(10,'volume_nine_complete',[
    requirement('接下三路归人的来信','v10_reported'),requirement('护送三路队伍到营','v10_escort_done'),requirement('在粮仓确定补给或防守','v10_allocated'),requirement('守住渡口并截住追舟兵','v10_ford_done'),requirement('核齐安置，议定分工后聚义','v10_gathered')
  ],'【百川归泊】酒席散后，厨房照新册发粮，伤者换到背风的屋里。旧日各寨的人开始按同一张值守表轮班，争执还会有，至少知道该去哪里把话说明白。\n\n两位使者先后上山，各捧一份诏书。一份只谈赦罪，一份附着军粮与安置的条款。山下却传来流民受阻、粮队遭劫的消息，众人先把桌上的诏书压住，起身去接人。第十一卷《两道诏书》已开启。',true)
];

