export const MARSH_NODES = {
 landing:{name:'芦岸渡头',links:['reeds','hut','poison'],text:'木桩上拴着一条空船。浅水处能绕过苇丛，另一边的水面泛着绿沫。',purpose:'认路、整备；浅水苇道与毒水湾都可反复挑战。'},
 reeds:{name:'浅水苇道',links:['landing','garden'],text:'苇叶上挂着蛇蜕。脚下尚能看见泥底，适合慢慢探路。',purpose:'普通蛇群，无额外涉水毒伤；装备与药材概率掉落。',battle:'marsh'},
 hut:{name:'采药草庐',links:['landing','garden'],text:'安道全正替药农冯伯裹伤。药篓空了，他抬头问你有没有带药。',purpose:'帮安道全救治药农，问清药圃与沉船的位置。'},
 poison:{name:'毒水湾',links:['landing','garden'],text:'浑水没过膝盖，多一条毒蛇盘在漂木上。水湾里的药草长得密，却得涉水去取。',purpose:'开场全队中毒、增援一条毒蛇；胜利必得药草 3，其余掉落随机。',battle:'marsh',route:'poisonbank'},
 garden:{name:'泽兰药圃',links:['reeds','hut','poison','nest'],text:'水沟被枯苇堵住，几畦泽兰还活着。冯伯指出埋在泥里的排水口。',purpose:'修好排水沟，芦苇泽派遣每批泽兰额外 +1。'},
 nest:{name:'沉船蛇巢',links:['garden'],text:'船舱里有几只封蜡的药箱，蛇群却占满了船板。先盯住那条盘在箱顶的大蛇。',purpose:'首蛇会蓄势施放全队毒雾。取回药箱，再找安道全。',battle:'marshnest'}
};
export const MARSH_FLAGS=['met','won_reeds','won_poison','rescued','tended','won_nest','invited','cache','care_supplies','return_met','source_checked','won_reedvenom','return_paid'];
export const marshHas=(s,flag)=>!!s?.exploration?.marsh?.flags.includes(flag);
export function marshGate(s,id){
 if(!Object.hasOwn(MARSH_NODES,id))return '没有这个地点。';
 if(!s.camp)return '先建立寨子。';
 if(id==='garden'&&!marshHas(s,'rescued'))return '先到采药草庐救治药农，由他指出药圃的落脚处。';
 if(id==='nest'&&!marshHas(s,'tended'))return '先疏通药圃的水沟，沿退水处寻找沉船。';
 return '';
}
export function marshGoal(s){
 if(!marshHas(s,'met'))return {node:'hut',text:'先到采药草庐，与安道全交谈。'};
 if(!marshHas(s,'won_reeds')&&!marshHas(s,'won_poison'))return {node:'reeds',text:'走通一条水路。浅水苇道较稳妥；毒水湾胜利另得药草 3。'};
 if(!marshHas(s,'rescued'))return {node:'hut',text:marshHas(s,'care_supplies')?'回草庐救治药农：解毒丹 1，或药草 6、粗布 2。':'水路已通。草庐门后有备用药料，可取来救治药农、修整药圃。'};
 if(!marshHas(s,'tended'))return {node:'garden',text:'到泽兰药圃清沟护苗，需要木料 3、粗布 1。'};
 if(!marshHas(s,'won_nest'))return {node:'nest',text:'水沟已通，去沉船取回药箱。首蛇喷毒前可用打断。'};
 if(!marshHas(s,'invited'))return {node:'hut',text:'药箱已找回，回草庐邀请安道全入寨。'};
 if(!marshHas(s,'return_met'))return {node:'hut',text:'冯伯捎来一把发黄的泽兰，安道全想请你去草庐看看。'};
 if(!marshHas(s,'source_checked'))return {node:'garden',text:'到泽兰药圃查看进水沟，找出药苗发黄的缘由。'};
 if(!marshHas(s,'won_reedvenom'))return {node:'nest',text:'蛇群盘住了进水口。去沉船清渠除蛇，带上解毒药或能打断的好汉。'};
 if(!marshHas(s,'return_paid'))return {node:'hut',text:'进水口已疏通，回草庐把新采的泽兰交给安道全。'};
 return {node:'garden',text:'冯伯留好了采药路。清渠除蛇可重复取泽兰；配药间每天可煎一份药引。',label:'回寨煎药',command:{type:'ui_section',view:'camp',id:'exploration',region:'marsh',building:'clinic'}};
}
export const MARSH_REWARDS={supplies:{herb:6,cloth:3,wood:3},thanks:{marsh_orchid:4,andaoquan_token:2,jiedudan:2}};
export const MARSH_DECOCT={items:{marsh_orchid:4,herb:2},silver:20,output:'medicinal_extract'};
export const marshRoute=(id,approach='direct')=>id==='nest'&&approach==='reedvenom'?'reedvenom':MARSH_NODES[id]?.route;
export const hasMarshRevisit=s=>!!s.exploration?.marsh?.flags.some(k=>['care_supplies','return_met','source_checked','won_reedvenom','return_paid'].includes(k))||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>c?.route==='reedvenom'||c?.id==='marshnest'&&(s.specialDungeons?.clears['marsh_'+c.tier]||0)<5)||[1,2,3].some(t=>(s.specialDungeons?.clears['marshnest_'+t]||0)>0&&(s.specialDungeons?.clears['marsh_'+t]||0)<5);
