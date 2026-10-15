import {away} from './hero-availability.js?v=0.88.0';
// Character chapters have their own locations, footsteps and challenges. Hero identities and draw pools stay unchanged.
export const COMPANION_FLAGS=['met','checked','prepared','won','delivered','invited'];
export const REGION_COMPANIONS={
 zhangshun:{id:'zhangshun',hero:'zhangshun',name:'张顺',region:'xunyang',area:'江州·浔阳江',scene:'harbor',level:5,start:'dock',needsHero:'andaoquan',title:'苇湾救人',dungeon:'xunyangship',route:'reedrescue',boss:'warehouse',nodes:{dock:{name:'江州码头',links:['ship','shed'],text:'江面停着几条空渡船。张顺晾着湿衣，码头上的船户却都在等人回来。',purpose:'见张顺；送船户上岸，再邀他入寨。'},ship:{name:'芦汊旧船',links:['dock','warehouse'],text:'旧船搁在芦汊里。舱板上挂着新割的缆头，封药箱的蜡还没有散。',purpose:'查船缆，找出药箱和船户被带往哪里。'},shed:{name:'江岸药棚',links:['dock','warehouse'],text:'药棚里摊着货单，纸角压在铜秤下。张顺正把断缆一圈圈盘好。',purpose:'核对药箱，和张顺约好水下接应。'},warehouse:{name:'扣船货栈',links:['ship','shed'],text:'货栈后拴着一条渡船。持钩的水匪站在船尾，岸上有人看着被扣的船户。',purpose:'救回船户；以后仍可挑战，带回药材和水路兵甲。'}},rewards:{herb:2,jiedudan:1},
  steps:[
   {task:'meet',flag:'met',node:'dock',label:'与张顺交谈',text:'张顺把湿衣搭在船头：“安先生托我找一只药箱，沉在苇湾里。箱子倒好找，可有几个船户也没回来。你跟我去看看。”'},
   {task:'inspect',flag:'checked',node:'ship',label:'查看沉船绳索',text:'破船边挂着一截新缆，药箱的封蜡还粘在木板上。张顺摸过水下的绳头：“箱子让人拖走了。船户就在后头那条船上。”'},
   {task:'prepare',flag:'prepared',node:'shed',label:'核对药箱货单',text:'药棚里的货单写着安道全的名字，还记着两名船户。张顺把绳索盘好：“我下水松他们的船缆，你们先截住持钩的，别让他拖走人。”'},
   {task:'battle',flag:'won',node:'warehouse',label:'救回渡船人',text:'持钩水匪站在最末位，接到号令便钩住后排。先击倒或眩晕他，也可打断头目；固守能减轻钩索伤害。'},
   {task:'deliver',flag:'delivered',node:'dock',label:'送船户回码头',text:'船户踩上浅滩，一个劲地谢你。张顺把药箱抬上岸，留下药草 2、解毒丹 1：“这些没浸水，收着吧。”'},
   {task:'invite',flag:'invited',node:'dock',label:'邀请张顺入寨',text:'张顺拧干衣角：“有船有水的地方，叫上我。走，先去认认你们寨门。”'}
  ]},
 jindajian:{id:'jindajian',hero:'jindajian',name:'金大坚',region:'jizhou',area:'济州·刻坊',scene:'jizhou_engraving',level:8,start:'gate',needsHero:'yuehe',title:'残碑取样',dungeon:'jizhouyard',route:'rubbings',boss:'yard',nodes:{gate:{name:'刻坊门前',links:['alley','shed'],text:'门边斜倚着几块碑料。金大坚把刻刀搁在布上，正量一处断口。',purpose:'见金大坚；取回刻样后在这里修碑、邀请入寨。'},alley:{name:'断碑巷',links:['gate','yard'],text:'墙角散着白石屑，路边留下一条拖痕。巷尽头的院门还没有关严。',purpose:'沿搬碑痕迹找出刻样去向。'},shed:{name:'碑样棚',links:['gate','yard'],text:'几张拓纸晾在绳上，乐和寄来的缺字抄件压在桌角。金大坚拿它核对刻样。',purpose:'核对碑上缺笔，认清被夺走的那一筒刻样。'},yard:{name:'藏模院',links:['alley','shed'],text:'刻样筒堆在院里的木架上。看守头目靠在石门旁，护样人一直守在后头。',purpose:'夺回刻样；以后可找拓纸、图样和文士装具。'}},rewards:{stone_rubbing:2,blueprint:1},
  steps:[
   {task:'meet',flag:'met',node:'gate',label:'与金大坚交谈',text:'金大坚蹲在碑前比着断口：“上半截被人搬走了，刻样也丢在他们手里。我答应给乐和补好这碑，不能只留个空口。”'},
   {task:'inspect',flag:'checked',node:'alley',label:'查找搬碑痕迹',text:'夹道里落着石屑，门框上新擦出一道白痕。金大坚量过门宽：“就是从这里抬进去的。那个背竹筒的人，拿的该是我的刻样。”'},
   {task:'prepare',flag:'prepared',node:'shed',label:'核对缺字抄件',text:'乐和寄来的抄件补出了几笔缺字。金大坚收进衣袖：“有这几笔就认得了。刻样先拿回来，碑上的架势才能补全。”'},
   {task:'battle',flag:'won',node:'yard',label:'夺回刻样',text:'护样人站在最末位，每次接令会替头目护阵。先击倒或眩晕他，头目便露出破绽；也可打断头目的号令。'},
   {task:'deliver',flag:'delivered',node:'gate',label:'与金大坚补好残碑',text:'金大坚照着刻样把缺笔补齐，一个刻工在旁读了一遍。旧碑拓片 2、兵器图纸 1 已收好；修碑用的是现场留下的石料。'},
   {task:'invite',flag:'invited',node:'gate',label:'邀请金大坚入寨',text:'金大坚裹好錾子：“寨里的牌匾、印记总得有人刻。你若用得上，我就跟你走。”'}
  ]},
 zhugui:{id:'zhugui',hero:'zhugui',name:'朱贵',region:'nanshan',area:'梁山·南山酒店',scene:'tavern',level:12,start:'inn',needsHero:'shiqian',title:'茶棚接商',dungeon:'nanshanstock',route:'teaconvoy',boss:'fort',nodes:{inn:{name:'酒店门前',links:['fork','pavilion'],text:'门前摆着茶桌，朱贵留了一锅热水。该到的商队还没到，桌边只有一个报信的人。',purpose:'向朱贵问消息；商队回来后，可邀他入寨。'},fork:{name:'柳林岔道',links:['inn','fort'],text:'柳根旁有新车辙，一枚酒店木牌落在断绳边。车队拐进林里，再没出来。',purpose:'查车辙与木牌，辨出假接应。'},pavilion:{name:'望路亭',links:['inn','fort'],text:'望路亭看得见林口。时迁伏在栏边，捏着一枚与酒店相同的木牌。',purpose:'与时迁商量接应，留意营里发令的哨手。'},fort:{name:'劫货寨',links:['fork','pavilion'],text:'货车堵在寨门内，两旁伏兵看着车尾。发令的哨手握着铜哨，没有离开头目身边。',purpose:'接出商队；以后仍可搜寻衣料、干粮与轻装兵甲。'}},rewards:{cloth:2,cured_hide:1},
  steps:[
   {task:'meet',flag:'met',node:'inn',label:'与朱贵交谈',text:'朱贵把茶碗往桌里推：“商队该到了，门前却只来了个报信的。时迁认得那些脚印，你们沿岔路看看，我在这里接人。”'},
   {task:'inspect',flag:'checked',node:'fork',label:'沿车辙查探',text:'车辙压进草里，断绳上系着一枚茶棚木牌。朱贵看过木牌：“他们拿它冒充接应的人。车队还在林子里，先别放出风声。”'},
   {task:'prepare',flag:'prepared',node:'pavilion',label:'与时迁约好接应',text:'时迁蹲在亭栏下，把换过的木牌藏进袖口：“朱掌柜守路口，我去车尾。营里吹哨的站在第二位，先压住他，别让两边一齐动手。”'},
   {task:'battle',flag:'won',node:'fort',label:'接应商队出林',text:'第二位哨手发令，两翼就会夹击后排。先击倒或眩晕哨手，可使夹击停止；也可打断头目，固守则减轻本招伤害。'},
   {task:'deliver',flag:'delivered',node:'inn',label:'把商队带回酒店',text:'朱贵让出炉边的位置，车夫们终于喝上热茶。粗布 2、鞣制硬革 1 已收好，商队的木牌也还给了领队。'},
   {task:'invite',flag:'invited',node:'inn',label:'邀请朱贵入寨',text:'朱贵收起账簿：“这条路有人照应就走得通。寨里若缺个接待来客、打听消息的人，我去。”'}
  ]}
};
export const companionSpec=id=>Object.hasOwn(REGION_COMPANIONS,id)?REGION_COMPANIONS[id]:null;
export const companionByRoute=route=>Object.values(REGION_COMPANIONS).find(r=>r.route===route)||null;
export const companionByDungeon=id=>Object.values(REGION_COMPANIONS).find(r=>r.dungeon===id)||null;
export const companionAwayReason=(s,id)=>s.heroes[id]?.status==='owned'&&away(s,id)?(companionSpec(id)?.name||'这位好汉')+'仍在外派，请等他归寨后继续这段篇章。':'';
export const companionHas=(s,id,flag)=>!!s.regionCompanions?.quests?.[id]?.flags?.includes(flag);
export const companionAvailable=(s,id)=>{const r=companionSpec(id);return !!r&&!!s.camp&&(!!s.regionCompanions?.quests?.[id]||s.team.some(h=>s.heroes[h]?.status==='owned'&&s.heroes[h].level>=r.level));};
export function companionStep(s,id){const r=companionSpec(id);if(!r)return null;const n=r.steps.findIndex(t=>!companionHas(s,id,t.flag));return n<0?{id,region:r.region,node:r.steps.at(-1).node,number:6,kind:'done',task:'done',label:r.title+'已办妥',text:r.name+'已在寨中。'+r.title+'仍可重复挑战，人物信物只在首次邀请时赠送。'}:{...r.steps[n],id,region:r.region,number:n+1,kind:n===3?'battle':'task'};}
export function companionTaskReason(s,id,task){const r=companionSpec(id),t=r?.steps.find(t=>t.task===task),x=s.regionCompanions?.quests?.[id];if(!t||task==='battle')return '没有这件人物事务。';if(companionAwayReason(s,id))return companionAwayReason(s,id);if(companionHas(s,id,t.flag))return '这件事已经办妥。';if(!x)return '先进入'+r.area+'。';if(companionStep(s,id).task!==task)return '先办完'+r.name+'的上一件事。';if(x.position!==t.node)return '先前往'+r.nodes[t.node].name+'。';const items=task==='deliver'?r.rewards:task==='invite'?{[id+'_token']:2}:{};if(Object.entries(items).some(([k,n])=>(s.inventory[k]||0)+n>10000000))return '谢礼库存已满，整理后再来。';return '';}
export function companionRouteReason(s,route,tier=1){const r=companionByRoute(route);if(!r)return '';if(companionAwayReason(s,r.id))return companionAwayReason(s,r.id);if(tier!==1)return '这段人物篇章只有当前难度。';if(!companionHas(s,r.id,'prepared'))return '先进入'+r.area+'，与'+r.name+'查探并约好接应。';return '';}
export function hasRegionCompanions(s){return s.regionCompanions!==undefined||Object.keys(REGION_COMPANIONS).some(id=>s.campLife?.people?.[id]!==undefined)||s.development?.goal?.kind==='companion'||s.development?.goal?.kind==='invite'&&!!companionSpec(s.development.goal.id)||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>!!companionByRoute(c?.route)||!!companionByDungeon(c?.id))||Object.keys(s.specialDungeons?.clears||{}).some(k=>!!companionByDungeon(k.slice(0,-2)));}
