// The last two volumes are data-only. The campaign engine owns battle rules and save writes.
const flag = id => ({flag:id});
const not = id => ({notFlag:id});
const all = (...conditions) => ({all:conditions});
const any = (...conditions) => ({any:conditions});
const flags = (...ids) => ids.map(id => ({type:'flag',id}));
const item = (id,amount) => ({type:'item',id,amount});
const choice = (id,label,extra={}) => ({id,label,condition:null,...extra});
const finish = (label,ids,extra={}) => choice('finish',label,{finish:true,effects:flags(...ids),...extra});
const link = (target,condition=null) => ({target,condition});
const routes = ['stay','sea','return'];
const routeFlag = route => 'v12_'+route;
const taskId = (route,stage) => 'v12_'+route+'_'+stage;
const taskDone = (route,stage) => taskId(route,stage)+'_done';
const chosen = route => all(flag(routeFlag(route)),...routes.filter(r=>r!==route).map(r=>not(routeFlag(r))));
const stageDone = stage => any(...routes.map(route=>flag(taskDone(route,stage))));
const finalRewards = () => [item('recruit_order',2),item('spirit_essence',5),item('immortal_seal',1)];
const area = (id,name,description,links,stories,chapter) => ({id,name,region:chapter==='volume_eleven'?'两道诏书':'梁山去路',type:'area',description,links,actions:[],stories,dungeons:[],chapter});

export const ENDING_DEFINITIONS = {
  stay:{id:'stay',name:'守泊护乡',flag:'v12_ending_stay',routeFlag:'v12_stay',text:'乡约抄了三份：一份放在村祠，一份送到集市，一份留在梁山。凡借粮须留凭据，过境军伍不得进村取食；田界与渡税有争执，由村中推人同议，不能只听寨中一句话。\n\n晁盖带人修好了受损的北堤，宋江往来各村核对赔补。林冲把轮守的日子排在木牌上，闲下来的军士回去种地。鲁智深住在渡口附近，遇见独自赶路的老人便送过河；武松修好村边的小桥，替伤愈的人看着新开的药铺。\n\n阮氏兄弟照旧行船，公孙胜常入山采药，逢节才回泊中住几日。卢俊义把旧货栈改作寄存粮种之所，燕青走村串镇，将迁居者的口信一一带回。留下与离开的人都在簿上留了去处，没人因缺席一场酒宴便被划去名字。\n\n入冬时，渡口第一次按乡约退还了一笔多收的船钱。数目不大，来领钱的妇人却把凭据折好，收进了衣襟。泊中灯火仍亮着，这一次，岸上的人知道可以为哪件小事来敲门。'},
  sea:{id:'sea',name:'渡海安家',flag:'v12_ending_sea',routeFlag:'v12_sea',text:'最后一班渡船离岸之前，鲁智深仍站在栈桥上点名。担架、药箱和两袋来不及分开的粮种都搬上船后，他才收起名单。岸上没有留下伤者，也没有留下等人回去接的孩子。\n\n到了约定的海湾，李俊与阮氏兄弟先探潮汐，在避风处钉下第一排桩。晁盖领人起屋，宋江逐户登记粮食与住处。林冲把守夜分成轮次，让白日造屋的人能睡整觉；汤隆支起炉子，徐宁用钩镰卸下木料，刃口终于不必再去找马腿。\n\n卢俊义管往来货物的账，燕青随小船往返旧岸，捎回书信，也替想返乡的人安排路费。鲁智深与武松住在新井边，照看最早上岸的伤者。有人开垦，有人捕鱼，也有人收拾行装另寻亲人，去留都写进名单，不以旧日军令拘束。\n\n开春，第一畦菜长出了叶子。孩子们把空木箱拖到门前当桌子，念的是迁来以后新写的住址。海风吹动屋檐下的旧旗，船册最后一行记着：人已到齐，今后按户记家。'},
  return:{id:'return',name:'护民归乡',flag:'v12_ending_return',routeFlag:'v12_return',text:'界碑旁的乡老按户接走归民，粮袋、伤者与寻亲名单各有签收。宋江把最后一张回执摊在两道诏书旁，要求见证人逐项核对。劫粮军官的口供随违约清单送出，免税、归田和伤者口粮都留下可追查的副本。\n\n军令交还以后，梁山众人不再替使者追补额外的征调。晁盖带愿留的人回泊修屋，林冲在近村教习自卫，轮到农忙便停课。鲁智深陪伤者走完最后一段山路，在村外旧寺借住；武松留下替药铺挑水，直到最重的病人能独自出门。\n\n卢俊义重整商路，答应归民赊用农具，到秋收再结账。燕青替失散的人递送家书，阮氏兄弟把渡船留在两岸，见到旧名单上的名字便少收一程钱。公孙胜仍往山中去，临行留下药方，没有留下必须等他回来的期限。\n\n秋日，营中收到几封字迹各异的来信。有人报收成，有人报新生的孩子，还有人只请代问旧日同行是否平安。宋江把信放进原来装军令的木匣，匣上重新贴了一张纸：各家来书。'}
};

export const missions = {
  v11_escort:{level:39,hall:4,scale:6.5,terrain:'land',stamina:14,escort:{name:'伤者与流民车队',hp:100,pulse:4000,damage:10,source:'v11_marksman'}},
  v11_grain:{level:39,hall:4,scale:6.7,terrain:'land',stamina:14},
  v12_stay_first:{level:40,hall:4,scale:6.8,terrain:'water',stamina:14},
  v12_stay_second:{level:40,hall:4,scale:7,terrain:'land',stamina:16,escort:{name:'出村的老幼与伤者',hp:100,pulse:5000,damage:10,source:'v12_siege_bow'}},
  v12_stay_third:{level:40,hall:4,scale:7.3,terrain:'land',stamina:18,waves:[['v12_siege_captain','v12_heavy_guard']]},
  v12_sea_first:{level:40,hall:4,scale:6.8,terrain:'water',stamina:14},
  v12_sea_second:{level:40,hall:4,scale:7,terrain:'water',stamina:16,escort:{name:'两批家眷的接送船',hp:100,pulse:5000,damage:10,source:'v12_firebow'},waves:[['v12_boarder','v12_firebow']]},
  v12_sea_third:{level:40,hall:4,scale:7.3,terrain:'water',stamina:18,escort:{name:'最后一班渡船',hp:100,pulse:5000,damage:12,source:'v12_firebow'}},
  v12_return_first:{level:40,hall:4,scale:6.8,terrain:'land',stamina:14},
  v12_return_second:{level:40,hall:4,scale:7,terrain:'land',stamina:16},
  v12_return_third:{level:40,hall:4,scale:7.3,terrain:'land',stamina:18,escort:{name:'出境归民队伍',hp:100,pulse:5000,damage:10,source:'v12_road_bow'},waves:[['v12_rear_captain','v12_road_bow']]}
};

const enemy = (id,name,hp,attack,defense,speed,strategy,skills,telegraph,description) => ({id,name,attribute:{hp,attack,defense,speed,strategy},skills,telegraphs:[telegraph],description});
export const enemies = [
  enemy('v11_raider','堵路乱兵',760,111,51,82,25,['bandit_cut'],'乱兵用盾抵住车辕，刀锋向抬担架的人靠近。','以流民车队为饵堵路的溃兵。'),
  enemy('v11_marksman','高坡弩手',510,104,29,90,34,[],'坡上弩手换好弩矢，正瞄准没有甲胄的车队。','弩手在场时会按护送规则持续伤害车队，应尽快击倒。'),
  enemy('v11_grain_chief','截粮头目',1320,135,66,86,39,['bandit_cut'],'头目催人把粮袋推上私车，自己提刀守着岔口。','借官军名号截取民粮，身上带有私卖粮食的账单。'),
  enemy('v11_grain_guard','粮车刀手',830,114,61,80,24,['guard_wall'],'刀手转动粮车，试图挡住通往头目的路。','守在粮队两侧的刀手。'),
  enemy('v12_heavy_guard','压阵重盾兵',920,114,85,69,27,['guard_wall'],'重盾缓缓并拢，后面的军士正借盾缝推进。','依靠盾阵固守狭口，适合以破防招式处理。'),
  enemy('v12_siege_bow','围村弓手',540,111,33,86,35,[],'弓手绕过土墙，寻找出村队伍的位置。','弓手在场时会按护送规则伤害撤出的村民。'),
  enemy('v12_siege_captain','围泊主将',1450,139,76,82,44,['bandit_cut','guard_wall'],'主将收拢溃兵，准备再向渡口冲击。','围泊军的主将，须在击退前锋后迎战。'),
  enemy('v12_boarder','钩船刀手',740,120,44,94,24,['bandit_cut'],'刀手将铁钩甩向船舷，试着拉近两船。','趁船队接人时逼近的水上追兵。'),
  enemy('v12_firebow','火矢弓手',510,107,30,88,38,[],'弓手把箭头伸近火盆，盯住载人的渡船。','火矢弓手在场时会按护送规则损伤渡船。'),
  enemy('v12_water_captain','拦江统领',1430,137,70,88,40,['bandit_cut'],'统领命人横过战船，要截断出海的水道。','带队封锁出海水道的统领。'),
  enemy('v12_road_bow','追路弩手',530,111,32,88,36,[],'弩手登上道旁高处，重新瞄准缓行的归民。','弩手在场时会按护送规则伤害归民队伍。'),
  enemy('v12_levy_guard','擅征军士',840,119,61,82,25,['guard_wall'],'军士把征粮旗插进粮车，举盾拒绝退开。','拿着额外征调令扣住归民口粮的军士。'),
  enemy('v12_levy_captain','违约征粮官',1380,133,72,81,44,['bandit_cut','guard_wall'],'征粮官收起文牒，命亲兵从两侧围上。','无视已签约条擅自征粮，携有本次征调的底账。'),
  enemy('v12_rear_captain','追袭营将',1450,140,70,85,42,['bandit_cut'],'营将听见前队退兵，催马追向界碑。','试图在交接前扣住归民的最后一支追兵。')
];

export const maps = [
  area('v11_camp','诏书议事营','桌上压着两份诏书，门外还停着待修的伤车。先把人接来，再逐字核对能否落在纸上的承诺。',[link('v10_camp'),link('v11_refuge',flag('v11_reported')),link('v11_road',flag('v11_escort_done')),link('v11_archive',flag('v11_grain_done')),link('v12_camp',flag('volume_eleven_complete'))],['v11_report','v11_reply'],'volume_eleven'),
  area('v11_refuge','断桥接应处','河桥只剩半幅，伤者挤在等候修补的车边。坡上的弩手把退路看得很紧。',[link('v11_camp')],['v11_escort'],'volume_eleven'),
  area('v11_road','柳堤粮道','车上粮袋都有村里的记号，截粮人却举着官军旗号，准备改道运走。',[link('v11_camp')],['v11_grain'],'volume_eleven'),
  area('v11_archive','营中文案棚','两名使者在棚外等候。这里存着原诏、增补约条、被劫粮车的底账，以及刚接回来的流民名册。',[link('v11_camp')],['v11_plain','v11_covenant'],'volume_eleven'),
  area('v12_camp','去路清点营','名册摊在长桌上。每走完一程便回营核对，直到名单上的人都有可去的住处。',[link('v11_camp'),...routes.flatMap(route=>['first','second','third'].map((stage,index)=>link(taskId(route,stage)+'_site',all(chosen(route),flag(index===0?'v12_chosen':taskDone(route,['first','second'][index-1]))))))],['v12_choose','v12_epilogue'],'volume_twelve'),
  area('v12_stay_first_site','北汊渡口','北汊是村民入泊的近路。守住这里，粮船与看病的人才不必绕过军营。',[link('v12_camp')],['v12_stay_first'],'volume_twelve'),
  area('v12_stay_second_site','被围的柳湾村','村中粮仓已空，井边还有走不动的老人。围军的弓手守着南墙缺口。',[link('v12_camp')],['v12_stay_second'],'volume_twelve'),
  area('v12_stay_third_site','南堤议约口','围泊军主力压到南堤。村里推来的议事人带着乡约草稿，等渡口的炮声停下。',[link('v12_camp')],['v12_stay_third'],'volume_twelve'),
  area('v12_sea_first_site','旧港修船场','船匠已换好朽板，缆绳和饮水桶还扣在港口。要先取回船料，才能按名单接人。',[link('v12_camp')],['v12_sea_first'],'volume_twelve'),
  area('v12_sea_second_site','双汊接人码头','家眷分两批等船，伤者先上宽底船。外汊的追兵正试着截断第二次接送。',[link('v12_camp')],['v12_sea_second'],'volume_twelve'),
  area('v12_sea_third_site','最后的出海口','大船已经张帆，接应伤者的小渡船还在岸边。拦江战船横在出口，必须给最后一船留出水道。',[link('v12_camp')],['v12_sea_third'],'volume_twelve'),
  area('v12_return_first_site','归民粮道','粮车按户装好，车尾系着归乡村落的布条。路上的关卡还不肯认使者带来的约书。',[link('v12_camp')],['v12_return_first'],'volume_twelve'),
  area('v12_return_second_site','违约征粮营','征粮官把额外征调令贴在营门，扣着归民口粮不放。约书副本与交接见证人都已到场。',[link('v12_camp')],['v12_return_second'],'volume_twelve'),
  area('v12_return_third_site','归乡界碑','前面是乡里接人的车队，后面仍有追骑。过了界碑还要逐户交接，不能只把人赶出营门。',[link('v12_camp')],['v12_return_third'],'volume_twelve')
];

function battleStory(id,title,map,condition,intro,enemies,settlement,rewards=[]) {
  return {id,title,map,condition,start:'fight',steps:{
    fight:{map,text:intro,choices:[choice('fight','按议定职责出战',{condition:not(id+'_done'),next:'settle',battle:{enemies,scale:1}})]},
    settle:{map,text:settlement,choices:[finish('清点人员，记下本段结果',[id+'_done'],{condition:not(id+'_done'),effects:[...flags(id+'_done'),...rewards]})]}
  }};
}

export const stories = [
  {id:'v11_report',title:'使者与伤车',map:'v11_camp',condition:all(flag('volume_ten_complete'),not('v11_reported')),start:'start',steps:{start:{map:'v11_camp',text:'两名使者前后进营，带来的诏书却不一样。第一份只说赦免旧罪，催众人立即听调；第二份附着可会签的约条，军粮、伤者归置和沿途百姓的口粮都留了待核的数目。\n\n宋江正要开口，门外抬进一截断车轴。报信的妇人说，北边流民刚过断桥，粮车便被人截走，伤者还留在坡下。鲁智深把使者的座椅让到一旁：先去接人，回来再谈纸上的事。',choices:[finish('留下两份原件，先去断桥接人',['v11_reported'],{condition:not('v11_reported')})]}}},
  battleStory('v11_escort','断桥接回流民','v11_refuge',all(flag('v11_reported'),not('v11_escort_done')),'林冲让能行走的人先扶车过桥，鲁智深守在最后一辆伤车旁。坡上的弩手并不冲下来，只隔一阵便朝车队放箭。马车每挪一步，抬担架的人便少一处遮挡。\n\n战斗规则：聚义厅4级，队中至少一人39级；消耗体力14。车队完整度100；高坡弩手在场且未被眩晕时，每4秒损失10，降到0即失败；固守使当次损失减半。击倒高坡弩手可停止此项损伤；清除全部敌人且车队完整度大于0才算护送成功。优先处理弩手，再用治疗维持出阵队伍。',['v11_raider','v11_marksman','v11_raider'],'最后一副担架过桥，林冲才让人撤去临时木板。安道全按伤势安排住处，鲁智深把名册从头念到尾，少的三人原来在下游帮忙推车，也都应了声。\n\n车上余下的粮只有半袋。获救的车夫认得劫粮人的车辙，愿带众人到柳堤岔口找回粮食。',[item('herb',10),item('cloth',6)]),
  battleStory('v11_grain','柳堤截回粮车','v11_road',all(flag('v11_escort_done'),not('v11_grain_done')),'车夫从粮袋上的针脚认出了各村的记号。截粮头目声称奉命征用，见到随行使者亮出文书，又忙着把私车推往侧路。石秀绕到岔口拦车，武松指着那人的衣襟：先拿下带账的人，别让他把凭据扔进河里。\n\n战斗规则：聚义厅4级，队中至少一人39级；消耗体力14。击败截粮头目与两名粮车刀手即可取回粮车。本战没有护送目标或后续援军。',['v11_grain_guard','v11_grain_chief','v11_grain_guard'],'粮车清点完毕，短少的粮也在私车中找到。头目衣内藏着售粮的底账，纸上日期比所谓征调令还早。使者低头看了一阵，不能再说这只是沿路误会。\n\n吴用把账、粮袋记号和获救者口供装进同一个匣子：如今可以核对诏书里谁供粮、谁负责，不能把这些人交给一句含混的赦罪。',[item('iron',8),item('martial_pages',5)]),
  {id:'v11_plain',title:'核读第一份诏书',map:'v11_archive',condition:all(flag('v11_grain_done'),not('v11_plain_read')),start:'start',steps:{start:{map:'v11_archive',text:'第一份诏书写明赦免往日罪名，却只在后面添了“即日听调”。吴用翻过纸背，没有军粮拨付、伤者安置，也没有沿途不得征民粮的约束。\n\n使者说，到了军中自有安排。林冲把被截粮车的底账放在旁边：这些车上原也有官印。等受了军令再讨解释，抬伤者的人该到哪里去讨饭？宋江让书吏把三处空白另列一页，请使者当面确认原文确实没有。\n\n核对记录：本件只保证赦罪，未落实军粮来源、伤者去处和百姓口粮。阅读不等于答应受诏，不消耗资源，也不改变路线。',choices:[finish('记下三项缺漏，保存原件',['v11_plain_read'],{condition:not('v11_plain_read')})]}}},
  {id:'v11_covenant',title:'核读立约诏书',map:'v11_archive',condition:all(flag('v11_grain_done'),not('v11_covenant_read')),start:'start',steps:{start:{map:'v11_archive',text:'第二份诏书之外还有约条。粮由沿线官仓先拨，按车留收据；伤者在接收前仍由原队照料，医药另列；百姓按户登记，免受额外征调。完成归民交接后可交还军令，自择去处。\n\n萧让逐条誊出副本，金大坚核验印记。燕青请来两位乡老作见证，又加一条：若有军官违约截粮，梁山可扣存凭据、保护归民，不能因此反坐。使者看过柳堤的底账，终于在增补处用印。\n\n核对记录：选择受诏立约后，终章须守粮道、制止违约劫掠、护送归民出境，完成后交还军令。阅读不等于接受，不消耗资源，也不改变路线。',choices:[finish('收好会签副本与见证名册',['v11_covenant_read'],{condition:not('v11_covenant_read')})]}}},
  {id:'v11_reply',title:'在答复上落名',map:'v11_camp',condition:all(flag('v11_plain_read'),flag('v11_covenant_read'),not('v11_decided')),start:'council',steps:{
    council:{map:'v11_camp',text:'两份原件摊在桌上，旁边是刚接回来的流民名册。晁盖问，若留在水泊，周围村庄下一次遭围时能否赶得及；宋江问，若按约送人归乡，谁愿意一路盯住交接，不因官印便松手。鲁智深只把名册向桌中推了推：无论怎么答，不能让这几页上的人再走散。\n\n路线规则：选择“护乡”后，第十二卷可选“留守水泊”或“有序迁海”；选择“受诏立约”后，第十二卷走“护民归乡”。两路本卷奖励相同，确认不扣资源。可先查看各方意见并返回，只有最后确认才固定本次主线方向。',choices:[choice('homeland','听护乡安排',{next:'homeland'}),choice('charter','听受诏立约安排',{next:'charter'})]},
    homeland:{map:'v11_camp',text:'晁盖愿领人留守，先同各村订下借粮与轮守的规矩；李俊却提醒，若水路一再被封，也可把船备齐，接家眷去已探过的海湾。林冲说，两条路都先按户点人，留在乡里的不强迁，愿随船走的也不能漏下。\n\n确认效果：选择护乡，写入本卷正式答复。第十二卷仍可在“守泊护乡”与“渡海安家”之间选择；将不能进入本次正式主线的护民归乡路线。不扣资源，确认后本卷不能更改。',choices:[choice('confirm_homeland','确认护乡，退回征调诏书',{condition:all(not('v11_decided'),not('v11_charter')),finish:true,effects:flags('v11_homeland','v11_decided')}),choice('back','暂不落名，回去听另一方意见',{next:'council'})]},
    charter:{map:'v11_camp',text:'宋江把自己的名字写在副本旁，仍没交给使者：官仓粮须先到，归民册须两边核验。吴用安排沿路每日留档，鲁智深坚持伤者未交接之前，护送队不得撤。使者答应让乡老持有第三份副本，违约也由见证人留下记录。\n\n确认效果：选择受诏立约，写入本卷正式答复。第十二卷依约护送归民，结局为“护民归乡”；本次正式主线不再选择守泊或迁海。不扣资源，确认后本卷不能更改。',choices:[choice('confirm_charter','确认立约，按会签条款护送归民',{condition:all(not('v11_decided'),not('v11_homeland')),finish:true,effects:flags('v11_charter','v11_decided')}),choice('back','暂不落名，回去听另一方意见',{next:'council'})]}
  }},
  {id:'v12_choose',title:'先定落脚的地方',map:'v12_camp',condition:all(flag('volume_eleven_complete'),not('v12_chosen')),start:'start',steps:{
    start:{map:'v12_camp',text:'长桌上不再摆庆功的酒碗，而是船册、乡图和伤者名单。各处的管事来领各自的一页，领走以前还要核对家眷是否同行。\n\n终章规则：护乡答复可选“留守水泊”或“有序迁海”；立约答复进入“护民归乡”。各路线都有三段任务与一段清点收尾，结卷奖励完全相同，只领取一次。查看安排可返回；最后确认不扣资源，随后固定本次正式结局方向。',choices:[choice('stay','查看留守水泊的三件事',{condition:all(flag('v11_homeland'),not('v11_charter')),next:'stay'}),choice('sea','查看有序迁海的三件事',{condition:all(flag('v11_homeland'),not('v11_charter')),next:'sea'}),choice('return','查看按约护民归乡的三件事',{condition:all(flag('v11_charter'),not('v11_homeland')),next:'return'})]},
    stay:{map:'v12_camp',text:'守泊要先守住北汊渡口，给邻村留一条过河的路；再进柳湾村接出被围老幼；最后击退围泊主力，把轮守、借粮和赔补写进乡约。林冲取下旧军令牌，请各村先报一个能来议事的人。\n\n确认效果：本次结局固定为“守泊护乡”。依次完成北汊守渡、柳湾救人、南堤拒敌三战，再回营订立乡约、清点去处。不扣资源；三路结卷奖励相同。',choices:[choice('confirm','确认留守水泊',{condition:all(flag('v11_homeland'),not('v11_charter'),not('v12_chosen'),not('v12_sea'),not('v12_return')),finish:true,effects:flags('v12_stay','v12_chosen')}),choice('back','还未决定，返回去路安排',{next:'start'})]},
    sea:{map:'v12_camp',text:'李俊带来海湾的潮汐图，阮小二却先问船板和饮水够不够。迁海须先夺回港口船料，接齐愿同行的船匠；再分两批护送家眷；最后守住留给伤者的一班渡船。鲁智深说，第一船与最后一船的人，都得有人照看。\n\n确认效果：本次结局固定为“渡海安家”。依次完成旧港筹船、双汊接人、出海口断后三战，再核对船册、启航安家。不扣资源；三路结卷奖励相同。',choices:[choice('confirm','确认有序迁海',{condition:all(flag('v11_homeland'),not('v11_charter'),not('v12_chosen'),not('v12_stay'),not('v12_return')),finish:true,effects:flags('v12_sea','v12_chosen')}),choice('back','还未决定，返回去路安排',{next:'start'})]},
    return:{map:'v12_camp',text:'会签的约书已经送到前路，各乡接人的日期也写在册上。宋江让每辆粮车带一份收据，燕青负责把归民分送到各村路口。吴用提醒，出了营也不算办完：须守住粮道，追回被违约扣走的口粮，再把人送过界碑交到接应者手上。\n\n确认效果：本次结局固定为“护民归乡”。依次完成守粮道、制止违约征粮、护送出境三战，再逐户交接、交还军令。不扣资源；三路结卷奖励相同。',choices:[choice('confirm','确认按约护送归民',{condition:all(flag('v11_charter'),not('v11_homeland'),not('v12_chosen'),not('v12_stay'),not('v12_sea')),finish:true,effects:flags('v12_return','v12_chosen')}),choice('back','再看一遍约定，返回安排',{next:'start'})]}
  }},
  battleStory('v12_stay_first','北汊守渡','v12_stay_first_site',all(flag('v12_chosen'),chosen('stay'),not('v12_stay_first_done')),'北汊的缆绳被斩断，一艘载着药材的小船横在浅滩。林冲让弓手沿岸遮护，阮小五带人涉水接绳。重盾兵堵住岸上的落脚处，只有夺回渡头，船上的人才能上岸。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力14。击败重盾兵与围村弓手，重新开放北汊渡口。本战无后续援军。',['v12_heavy_guard','v12_siege_bow','v12_heavy_guard'],'药箱先搬上岸，摆渡的老船夫给新接的缆绳试了结。各村派来的人把当天的过渡名册放在一处，按老人、伤者和送粮次序安排。\n\n一个少年一直不肯上船。他说柳湾村还有人被困在井边，母亲叫他先来找援手。鲁智深收起名单，留两人在渡头接应，带其余人去村里。',[item('herb',6),item('iron',4)]),
  battleStory('v12_stay_second','柳湾接出老幼','v12_stay_second_site',all(chosen('stay'),flag('v12_stay_first_done'),not('v12_stay_second_done')),'南墙的缺口只能并行一副担架。武松先把倒塌的门板抬开，鲁智深挨家敲门，叫能走的人搀上走不动的。围村弓手从土墙外探出身来，箭已经压在弦上。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力16。撤离队伍完整度100；围村弓手在场且未被眩晕时，每5秒损失10，降到0即失败；固守使当次损失减半。击倒弓手可停止此项损伤；清除全部敌人且队伍完整度大于0才算成功。',['v12_heavy_guard','v12_siege_bow','v12_heavy_guard'],'井边最后两位老人都上了担架，那个先来求援的少年终于牵到母亲的手。村中的钥匙按户系成一串，由各家自己收着。\n\n林冲派人回北汊报平安，又让斥候查南堤。围军还没散，只是把前锋收回主将身边。要让村民能回去收拾田地，便须让这支军队真正退走。',[item('martial_pages',5),item('cloth',4)]),
  battleStory('v12_stay_third','南堤拒敌','v12_stay_third_site',all(chosen('stay'),flag('v12_stay_second_done'),not('v12_stay_third_done')),'村中推来的议事人守在堤后，纸上已写好借粮留据、损物赔补、轮守不得误农时三条。围泊军却仍向堤口推进。呼延灼把队伍停在能互相照应的距离，林冲等前锋进了窄口才发令。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力18。先击败重盾兵与弓手，随后围泊主将和一队重盾兵入场；两波全部击败才算胜利。后续援军不额外消耗体力。',['v12_heavy_guard','v12_siege_bow'],'第二次冲堤也退了回去。围泊主将收起旗号，答应撤出乡道，留下损坏房舍的登记与返还粮食的清单。晁盖没有摆庆功酒，先叫人带村民去认领车上物件。\n\n回营时，乡约草稿多了几处批注：谁核查收据、何处报损、轮守由谁替班。剩下的事是请各村逐条确认，给每个留下或返乡的人写清去处。',[item('iron',6),item('martial_pages',6)]),
  battleStory('v12_sea_first','旧港筹船接匠','v12_sea_first_site',all(flag('v12_chosen'),chosen('sea'),not('v12_sea_first_done')),'旧港外拦着两艘快船，船匠、缆绳和饮水桶都被扣在里头。李俊不让人点火烧船：能载人的木料一块也不能白损。阮小七带人解开外排空船，把追兵引到可以靠岸接战的水面。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力14。击败钩船刀手与火矢弓手，取回船料并接出船匠。本战无后续援军。',['v12_boarder','v12_firebow','v12_boarder'],'船匠逐块敲过新换的船板，汤隆在岸边补牢铁钉。每艘船的载人数、淡水和粮袋都写在船头，装满便封册，不能临开船再塞人。\n\n李俊安排宽底船先接伤者，阮氏兄弟去双汊接家眷。两批人的名册分开誊写，又各留了一张在岸上，来回都要对数。',[item('herb',6),item('iron',4)]),
  battleStory('v12_sea_second','双汊接齐两批家眷','v12_sea_second_site',all(chosen('sea'),flag('v12_sea_first_done'),not('v12_sea_second_done')),'第一批家眷从内汊上船，外汊却响起钩船的铁声。船夫刚放下跳板，又得撑住向岸边倾斜的船身。鲁智深叫等第二班的人先退到石墙后，不能一听见兵刃声便挤向同一条船。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力16。接送船完整度100；每5秒，场上有未被眩晕的火矢弓手便损失10，降到0即失败；固守使当次损失减半。首波钩船刀手和弓手退去后，第二批同类追兵入场，代表第二次接送；两波全败且接送船完整度大于0才算成功。后续援军不额外消耗体力。',['v12_boarder','v12_firebow'],'第二班船靠回内汊，名册上的两批家眷都有人答应。一个孩子少了鞋，阮小二从湿透的篷布下找回来，让他先裹着干布坐好。\n\n大船已可启航，安道全却还有几位伤者要重新固定夹板。他们留下乘最后一班小渡船；护卫队也留在岸边，等这条船驶过出口才收队。',[item('martial_pages',5),item('cloth',4)]),
  battleStory('v12_sea_third','守住最后一班渡船','v12_sea_third_site',all(chosen('sea'),flag('v12_sea_second_done'),not('v12_sea_third_done')),'最后一副担架放稳时，拦江统领的战船已横过出口。火矢弓手盯住小船的篷顶，钩船刀手试着扯断拖缆。李俊叫大船放慢，等小渡船接上；谁也不能先把伤者甩在水道里。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力18。最后渡船完整度100；火矢弓手在场且未被眩晕时，每5秒损失12，降到0即失败；固守使当次损失减半。击倒弓手可停止此项损伤；击败拦江统领及全部护卫，且渡船完整度大于0，才可启航。',['v12_water_captain','v12_boarder','v12_firebow'],'战船让出了水道。鲁智深在小渡船上把名单又念了一遍，安道全伸手护住最里侧的担架，等船夫说已经接上拖缆，才松开攥着的篷柱。\n\n人都到了，大船却没有立刻起帆。各船把人数、淡水和药箱位置报到主船，再把愿意返回旧岸者的托付另记一页。回营清点的最后一项，是给这些名单写上将要抵达的地址。',[item('iron',6),item('martial_pages',6)]),
  battleStory('v12_return_first','守住归民粮道','v12_return_first_site',all(flag('v12_chosen'),chosen('return'),not('v12_return_first_done')),'前站官仓已经发粮，路上军士却在车前另插了一面征粮旗，说行军吃紧，须先匀给营里。宋江把会签副本与车上收据放在一起，请他们查验；领队只看了一眼便把纸推开，命人解开粮袋。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力14。击败擅征军士和追路弩手，保持按户装好的口粮原样交付。本战无后续援军。',['v12_levy_guard','v12_road_bow','v12_levy_guard'],'粮袋重新封好，每辆车的收据都补记了耽搁时辰。乡老在旁作证，宋江让人把擅征旗和军士口供一并封存。\n\n口供指向前面的征粮营：那里的军官还扣着另一队归民的粮，连牲口也不肯放。若只送眼前这些车过去，约条就只护住了碰巧跟在梁山身后的人。众人决定去营门核账。',[item('herb',6),item('iron',4)]),
  battleStory('v12_return_second','制止违约征粮','v12_return_second_site',all(chosen('return'),flag('v12_return_first_done'),not('v12_return_second_done')),'营门张着额外征调令，落款比会签约书还晚。燕青认出了被扣粮车上的村名，请乡老逐辆指认。征粮官不肯交账，反说归民过境就应另缴一份。鲁智深护住来认粮的人，林冲让他把这句话写进自己的供词。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力16。击败违约征粮官与护卫，取回被扣口粮和征调底账。本战没有后续援军。',['v12_levy_guard','v12_levy_captain','v12_road_bow'],'账上列着几村的数目，粮仓里还能找到对应的封记。书吏当众核销额外征调，把原粮、牲口和被扣的农具按户退还；不够的部分由见证人立单，附在违约清单之后。\n\n宋江把底账送交使者，明确这支护送队不再接受任何临时加征。归民今日就过界，沿路军伍如再拦截，仍按约条留证处置。',[item('martial_pages',5),item('cloth',4)]),
  battleStory('v12_return_third','护送归民过界','v12_return_third_site',all(chosen('return'),flag('v12_return_second_done'),not('v12_return_third_done')),'接应的乡老已站在界碑另一边，缓行的车队却被一支追兵咬住。燕青让年轻人先去报各户姓名，石秀留在队尾掩护最后几辆伤车。追袭营将仍称有新军令，要把归民带回营中再查。宋江展开会签副本，回答只须照约交接。\n\n战斗规则：聚义厅4级，队中至少一人40级；消耗体力18。归民队伍完整度100；每5秒，场上有未被眩晕的追路弩手便损失10，降到0即失败；固守使当次损失减半。击败首波擅征军士与弩手后，追袭营将和另一队弩手入场；两波全败且队伍完整度大于0才算护送成功。后续援军不额外消耗体力。',['v12_levy_guard','v12_road_bow'],'追兵退开以后，石秀仍陪着最后一辆车走到界碑。每户的姓名都在接收册上找到，伤者由当地医者当面接手，未找到亲人的几人也各有临时住处。\n\n宋江把签收单收齐，军令没有立即交出。他要带回营中，再与起程时的名册核对一次：少一个名字都不算办完。',[item('iron',6),item('martial_pages',6)]),
  {id:'v12_epilogue',title:'把名字一一落定',map:'v12_camp',condition:all(stageDone('third'),not('v12_settled')),start:'rollcall',steps:{
    rollcall:{map:'v12_camp',text:'最后一战的旗号收了起来，桌上只留名册与回执。有人来报住处，有人领路费，也有人替尚在休养的同伴签名。吴用对完最后一页，仍把三处看不清的字交还原记名的人重写。\n\n眼前的仗已经打完。还须把安置与交接办妥，才能将这段同行写进梁山志。',choices:routes.map(route=>choice('read_'+route,'清点去处 · '+ENDING_DEFINITIONS[route].name,{condition:all(chosen(route),flag(taskDone(route,'third')),not('v12_settled')),next:route}))},
    ...Object.fromEntries(routes.map(route=>[route,{map:'v12_camp',text:ENDING_DEFINITIONS[route].text+'\n\n结卷规则：完成本段后，主线十二卷完结。本卷结卷发招贤令2、灵蕴5、登仙印1；另有本卷既定招贤补给2，合计招贤令4。三条路线奖励等值，正式存档只领一次。可继续经营、培养与历练。',choices:[finish('记入梁山志，结束这段同行',[ENDING_DEFINITIONS[route].flag,'v12_settled'],{condition:all(chosen(route),flag(taskDone(route,'third')),not('v12_settled'),...routes.map(r=>not(ENDING_DEFINITIONS[r].flag)))})]}]))
  }}
];

export const chapters = [
  {id:'volume_eleven',title:'两道诏书',number:11,entry:'v11_camp',condition:flag('volume_ten_complete'),completeFlag:'volume_eleven_complete',requirements:[
    {label:'留下两份原件，接报出营',condition:flag('v11_reported')},
    {label:'从断桥接回流民与伤者',condition:flag('v11_escort_done')},
    {label:'在柳堤追回被截口粮',condition:flag('v11_grain_done')},
    {label:'核实赦罪诏书的缺漏',condition:flag('v11_plain_read')},
    {label:'核验安置约条与会签副本',condition:flag('v11_covenant_read')},
    {label:'听取两方意见并确认答复',condition:flag('v11_decided')}
  ],ending:'答复已写进正式文书，两位使者各自收回了应带走的一份。留下的原件与会签副本都封入匣中，流民名册则留在桌上，明日还要按它分粮。\n\n晁盖把新削的木牌放在门边，宋江叫各队来领各自的名单。此后要守哪片岸、坐哪班船、走哪条归乡路，都须先把同行的人点齐。第十一卷完，前往去路清点营，开始第十二卷《梁山去路》。',effects:finalRewards(),baseLevel:1},
  {id:'volume_twelve',title:'梁山去路',number:12,entry:'v12_camp',condition:flag('volume_eleven_complete'),completeFlag:'volume_twelve_complete',requirements:[
    {label:'确认终章去路与安置安排',condition:flag('v12_chosen')},
    {label:'完成首段接应：守渡、筹船或护粮',condition:stageDone('first')},
    {label:'接回被围者、接齐家眷或追回民粮',condition:stageDone('second')},
    {label:'完成最后的守备、断后或护送',condition:stageDone('third')},
    {label:'核完名册，交代同行者的去处',condition:flag('v12_settled')}
  ],ending:'名单上的最后一个名字已有着落，同行者各自收好行装与留给旧友的地址。十二卷主线至此完结。\n\n本次正式结局已记入梁山志，队伍与培养继续保留。可回寨经营、安排好汉修习，或前往历练与副本。',effects:finalRewards(),baseLevel:1}
];
