import {promotionCoreSourceRows,promotionCoreUses} from './promotion-sources.js?v=0.83.0';
import {recruitmentBanner} from './recruitment-banner.js?v=0.83.0';
import {CAMP_PEOPLE,CAMP_PROJECTS} from './camp-life-data.js?v=0.83.0';
import {jobQuote,talkQuote,serviceQuote,salvageable} from './camp-life.js?v=0.83.0';
import {chronicleQuote} from './hero-chronicles.js?v=0.83.0';
import {equipmentPool,EQUIPMENT_DROP_RATE,DUTIES,dutyQuote} from './camp-development.js?v=0.83.0';
import {POSTS,postPlan} from './frontier.js?v=0.83.0';
import {questReady} from './core.js?v=0.83.0';
import {STOCK_RESOURCES,sourceStock,sourceName} from './source-goals.js?v=0.83.0';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialDropTable,specialPlan} from './special-dungeons.js?v=0.83.0';
import {SPECIAL_ROUTES,routeAllowed,routeReward} from './special-routes.js?v=0.83.0';
import {ALL_DAILY_ROUTES,rotationCalendar,rotationPlan,dailyUses} from './rotations.js?v=0.83.0';
import {RECIPES,BOX_OPTIONS} from './provisions.js?v=0.83.0';
import {REGIONAL_RECIPES,GATHERING_REGIONS} from './gathering-data.js?v=0.83.0';
import {regionalQuote} from './gathering.js?v=0.83.0';
import {IDLE_ROUTES,idleUnlocked,idleRates,idleAvailable} from './idle-data.js?v=0.83.0';
import {REGION_CONTACTS,EXPLORATION_REGIONS,MINE_REWARDS,MINE_SMELT,REGION_BUILDINGS} from './exploration-data.js?v=0.83.0';
import {MARSH_REWARDS,MARSH_DECOCT} from './marsh-data.js?v=0.83.0';
import {REGION_REVISITS} from './region-revisit-data.js?v=0.83.0';
import {revisitWorkQuote} from './region-revisit.js?v=0.83.0';
import {CROSS_REWARDS,CROSS_WORK,crossHas,crossAvailable} from './cross-region-data.js?v=0.83.0';
import {crossWorkQuote} from './cross-region.js?v=0.83.0';
import {mineSmeltQuote} from './exploration.js?v=0.83.0';
import {marshDecoctQuote} from './marsh.js?v=0.83.0';
import {ROUTE_PRIZES,ROUTE_PRICE,routeBalance} from './journey-rewards.js?v=0.83.0';
import {recruitOffers} from './recruit-support.js?v=0.83.0';
import {isExternal,isWanderer} from './roster.js?v=0.83.0';
import {dungeonEntry,meets} from './map.js?v=0.83.0';
import {MOUNT_DROP_RATE} from './growth.js?v=0.83.0';
export {sourceName,sourceStock};
export const sourcePage=(view,id,hero)=>id?{type:'ui_section',view,id,...(hero?{hero}:{})}:{type:'ui_sourcePage',view};
const pct=n=>Number((n*100).toFixed(2))+'%';
export const canBuy=i=>!!i&&['consume','material','quest','special'].includes(i.type)&&i.price>0&&!i.hero;
export function sourceCatalog(d){return [...Object.entries(STOCK_RESOURCES).map(([id,name])=>({id,name,kind:'resource',group:'资源'})),...d.items.map(i=>({id:i.id,name:i.name,kind:'item',group:i.type==='token'?'信物':i.type==='consume'?'药品':i.type==='material'?'材料':'其他'})),...d.equipments.map(e=>({id:e.id,name:e.name,kind:'equipment',group:'装备'}))];}
export function sourceUses(d,id){
 const needed=r=>id==='silver'?r.silver:id==='campFood'?r.food:r.items?.[id],rows=[...Object.entries(REGIONAL_RECIPES).filter(([,r])=>needed(r)).map(([key,r])=>({name:EXPLORATION_REGIONS[key]+'配方 · '+sourceName(d,r.output),command:{type:'ui_regionalRecipe',id:key}})),...Object.entries(RECIPES).filter(([,r])=>needed(r)).map(([key,r])=>({name:r.name,command:{type:'ui_recipeSource',id:key}})),...d.equipments.filter(e=>(!e.source||e.source==='forge')&&needed(e.recipe)).map(e=>({name:'打造'+e.name,command:{type:'ui_forgeTarget',id:e.id}}))];
 for(const [region,r]of Object.entries({...REGION_REVISITS,mine:{...MINE_SMELT,building:'forge',work:'汤隆淬钢'},marsh:{...MARSH_DECOCT,building:'clinic',work:'安道全煎药'}}))if(needed(r))rows.push({name:r.work,command:{...sourcePage('camp','exploration'),region,building:r.building}});
 for(const [key,r]of Object.entries(REGION_BUILDINGS))if(id==='campWood'?r.wood:needed(r))rows.push({name:'营建'+r.name,command:{...sourcePage('camp','exploration'),building:key}});
 if(needed(CROSS_WORK))rows.push({name:'药船方子',command:sourcePage('camp','crossRegion')});
 if(['silver','campWood'].includes(id))rows.push({name:'寨中设施升级',command:sourcePage('camp','buildings')});
 if(['silver','campFood'].includes(id))rows.push({name:'募兵与医治',command:sourcePage('camp','troops')});
 for(const [key,r]of Object.entries(CAMP_PROJECTS))if(r.cost[id])rows.push({name:'添置'+r.name,command:{...sourcePage('camp','life'),lifeTab:'buildings',lifeBuilding:key}});
 for(const [hero,r]of Object.entries(CAMP_PEOPLE))if(r.cost[id])rows.push({name:r.job,command:{...sourcePage('camp','life'),lifeTab:'people',lifeHero:hero}});
 if(['herb','cloth','campFood','martial_pages'].includes(id))rows.push({name:id==='martial_pages'?'客舍讲习':'寨中诊疗与讲习',command:{...sourcePage('camp','life'),lifeTab:'buildings',lifeBuilding:id==='martial_pages'?'lodge':'clinic'}});
 return [...rows,...promotionCoreUses(d,id)];
}
// All entries are navigation previews. Actual spending and rewards remain in the original actions.
export function acquisitionSources(s,d,id){
 const item=d.by.items[id],equip=d.by.equipments[id],resource=Object.hasOwn(STOCK_RESOURCES,id);if(!item&&!equip&&!resource)return [];
 const rows=[],add=(key,name,mode,detail,command,reason='',extra={})=>rows.push({key,name,mode,detail,command,reason,...extra});
 for(const hero of Object.keys(CAMP_PEOPLE))if(id===hero+'_token'){const q=talkQuote(s,hero);add('life:thanks:'+hero,'寨中近况','一次奖励','在不同日期帮忙三次，听完三段近况，得信物 1；不要求连续登录',{...sourcePage('camp','life'),lifeTab:'people',lifeHero:hero,lifeMode:'talk'},s.campLife?.people[hero]?.talks===3?'谢礼已领':s.heroes[hero]?.status!=='owned'?'这位好汉尚未入寨':q.reason,{priority:3});}
 for(const [hero,r]of Object.entries(CAMP_PEOPLE))if(r.reward[id]){const q=jobQuote(s,hero);add('life:'+hero,d.by.heroes[hero].name+' · '+r.job,'换取','每次 '+r.reward[id]+' · 每人每日一次，全寨两件',{...sourcePage('camp','life'),lifeTab:'people',lifeHero:hero},q.reason,{cost:{silver:r.cost.silver||0,items:Object.fromEntries(Object.entries(r.cost).filter(([k])=>k!=='silver'))},priority:2});}
 if(['iron','scrap_iron'].includes(id))add('life:salvage','拆料台','拆解','闲置且未锁定、未培养的普通凡／良品兵甲 1 件 → 精铁 3、碎铁 4；每日一次',{...sourcePage('camp','life'),lifeTab:'buildings',lifeBuilding:'forge'},serviceQuote(s,d,'forge',s.equipment.find(e=>salvageable(s,d,e))?.uid).reason,{priority:3});
 const funds=cost=>s.player.silver<(cost.silver||0)?'碎银不足':Object.entries(cost.items||{}).some(([k,n])=>sourceStock(s,k)<n)?'材料不足':'';
 const busy=s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run;
 if(canBuy(item)){const remaining=id==='recruit_order'?Math.max(0,3-(s.daily.counters.buyOrder||0)):null;add('shop','集市采买','购买',item.price+' 银 / 份'+(remaining===null?'':' · 今日剩 '+remaining+' / 3'),{type:'ui_sourceShop',id},remaining===0?'今日售罄':s.player.silver<item.price?'碎银不足':'',{cost:{silver:item.price},priority:4});}
 if(equip&&(!equip.source||equip.source==='forge'))add('forge','铁匠铺','打造','消耗 '+equip.recipe.silver+' 银及配方材料',{type:'ui_forgeTarget',id},equip.source==='forge'&&!(s.camp?.buildings.hall>=3&&s.camp?.buildings.market>=2)?'聚义厅 3 级、集市 2 级':funds(equip.recipe),{cost:equip.recipe,priority:2});
 if(equip&&!equip.source)add('gearShop','兵甲采买','购买',equip.price*2+' 银 / 件',{type:'ui_forgeTarget',id},s.player.silver<equip.price*2?'碎银不足':'',{cost:{silver:equip.price*2},priority:4});
 for(const [region,r] of Object.entries(REGIONAL_RECIPES))if(r.output===id){const q=regionalQuote(s,d,region);add('regional:'+region,EXPLORATION_REGIONS[region]+'配方','加工','每份 '+r.count+' · 今日 '+q.used+' / '+q.limit,{type:'ui_regionalRecipe',id:region},q.reason,{cost:{silver:q.recipe.silver,items:q.recipe.items},priority:1});}
 if(RECIPES[id]){const r=RECIPES[id],used=s.daily.counters['craft_'+id]||0,known=s.expansion?.recipes.includes(id),reason=!s.camp||s.camp.buildings[r.building]<2?({farm:'农田',clinic:'医馆',market:'集市'}[r.building])+' 2 级':used>=r.limit?'今日加工次数用完':!known?'先花 60 银学习配方':(s.camp.food||0)<(r.food||0)?'寨仓粮草不足':funds(r);add('recipe','寨中加工','加工','每份 1 · 今日 '+used+' / '+r.limit+(known?'':' · 尚未学会'),{type:'ui_recipeSource',id},reason,{cost:{silver:r.silver,items:{...r.items,...(r.food?{campFood:r.food}:{})}},priority:2});}
 for(const [region,r] of Object.entries(REGION_REVISITS))if(r.output===id)add('work:'+region,r.work,'加工','每份 1 · 每日一次，共用普通加工额度',sourcePage('camp','exploration'),revisitWorkQuote(s,region).reason,{command:{...sourcePage('camp','exploration'),region,building:r.building},cost:{silver:r.silver,items:r.items},priority:1});
 if(id==='tempered_steel')add('mineSmelt','汤隆淬钢','加工','每份 1 · 每日一次，共用普通淬钢额度',{...sourcePage('camp','exploration'),region:'mine',building:'forge'},mineSmeltQuote(s).reason,{cost:MINE_SMELT,priority:1});
 if(id==='medicinal_extract')add('marshDecoct','安道全煎药','加工','每份 1 · 每日一次，共用普通煎药额度',{...sourcePage('camp','exploration'),region:'marsh',building:'clinic'},marshDecoctQuote(s).reason,{cost:MARSH_DECOCT,priority:1});
 if(id===CROSS_WORK.output)add('crossWork','药船方子','加工','每份 1 · 每日一次，共用金疮膏额度',sourcePage('camp','crossRegion'),crossWorkQuote(s).reason,{cost:CROSS_WORK,priority:1});
 for(const [area,m] of Object.entries(SPECIAL_DUNGEONS))for(const tier of [1,2,3]){
  const row=specialDropTable(area,tier).find(r=>r.id===id),command={type:'ui_specialView',id:area,tier,tab:'drops',category:equip?'equipment':item?.type==='consume'?'medicine':'material'};
  if(row){const q=specialPlan(s,area,tier);add('drop:'+area+':'+tier,m.name+' · '+SPECIAL_TIERS[tier].name,'概率',pct(row.rate)+' · 命中得 '+(row.min===row.max?row.min:row.min+'—'+row.max)+' · 不耗体力、粮草',command,q.reason,{rate:row.rate,min:row.min,max:row.max,priority:3});}
  // Alternate routes have their own guaranteed reward and unlock rules.
  if(tier===1)for(const [route,r] of Object.entries(SPECIAL_ROUTES))if(r.bonus===id&&routeAllowed(route,area)){const q=specialPlan(s,area,tier,route),bonus=routeReward(route,tier);add('route:'+area+':'+route,m.name+' · '+r.name,'必得','寻常胜利 '+bonus.count+'；险境 '+r.amount*2+'、深处 '+r.amount*3+' · 不耗体力、粮草',{type:'ui_specialView',id:area,tier,route,tab:'overview'},q.reason,{priority:1});}
 }
 for(const r of ALL_DAILY_ROUTES){const amount=r.resource?(r.resourceKey==='silver'&&id==='silver'||r.resourceKey==='wood'&&id==='campWood'||r.resourceKey==='food'&&id==='campFood'||r.resourceKey==='herb'&&id==='herb'?r.amounts[0]:0):r.reward[id];if(!amount)continue;const q=rotationPlan(s,'daily',r.id,1),days=r.days.length===7?'每日开放':'周'+r.days.map(n=>['日','一','二','三','四','五','六'][n]).join('、');add('daily:'+r.id,r.name,'必得','一阶胜利 '+amount+' · '+days+' · 今日 '+dailyUses(s,r.id)+'/3 · 体力 '+q.stamina+(q.food?'、粮草 '+q.food:''),r.resource?{type:'ui_resourceSource',id:r.id}:{type:'ui_materialSource',kind:'daily',id:r.id},q.reason,{priority:0});}
 if(['spirit_essence','immortal_seal','martial_pages','mount_token'].includes(id)){const cal=rotationCalendar(s.clock),old=s.campaign?.weekly[cal.period]?.tier||0,tier=Math.min(5,old+1),q=rotationPlan(s,'weekly',cal.route.id,tier);add('weekly',cal.route.name+' · 本期周本','首通','每层首次 '+({spirit_essence:2,immortal_seal:1,martial_pages:5,mount_token:2}[id])+' · 已通 '+old+'/5 层 · 体力 '+q.stamina+'、粮草 '+q.food,{type:'ui_materialSource',kind:'weekly',id:cal.route.id},old>=5?'本期首通奖励已领完':q.reason,{priority:1,claimed:old>=5});}
 for(const dungeon of d.dungeons){const r=d.by.rewards[dungeon.reward],fixed=id==='silver'?r.silver:r.guaranteed?.[id],random=r.items.find(x=>x.id===id),mount=d.heroes.find(h=>h.mount.contract===id&&h.mount.dungeon===dungeon.id);if(!fixed&&!random&&!mount)continue;const used=s.daily.dungeons[dungeon.id]||0,done=mount&&(s.growth?.mounts[mount.id]||(s.inventory[id]||0)>0);const reason=done?'已持有契或已领骑':!dungeonEntry(s,dungeon)?'尚未开放，需主线条件或对应聚义厅等级':!s.team.length||!s.team.some(h=>s.heroes[h].level>=dungeon.level)?'队中一人 '+dungeon.level+' 级':used>=dungeon.limit?'今日次数用完':s.player.stamina<dungeon.cost?'体力不足':'';add('dungeon:'+dungeon.id,dungeon.name,fixed?'必得':'概率',(fixed?'胜利 '+fixed:pct(mount?MOUNT_DROP_RATE:random.rate)+' · 命中得 '+(random?.count||1))+' · 体力 '+dungeon.cost+' · 今日 '+used+'/'+dungeon.limit+'；带兵另耗粮',{type:'ui_sourceDungeon',id:dungeon.id},reason,{claimed:!!done,rate:mount?MOUNT_DROP_RATE:random?.rate,priority:2});}
 for(const [region,r] of Object.entries(IDLE_ROUTES)){const token=REGION_CONTACTS[region]+'_token',matches=token===id||r.items[id]||GATHERING_REGIONS[region].item===id;if(!matches)continue;const mission=s.idleDispatch?.mission,hero=mission?.region===region?mission.hero:d.heroes.find(h=>idleAvailable(s,h.id))?.id,unlocked=idleUnlocked(s,region);const detail=token===id?'开启顺路寻访，每 4 小时 1 枚，最多暂存 2 枚':'每 30 分钟 '+idleRates(region,hero,s)[id]+' 份'+(hero?'（按'+d.by.heroes[hero].name+'计算）':'（基础量）')+'，最多累计 8 小时';add('idle:'+region,r.name+'派遣',token===id?'寻访':'派遣',detail,{type:'ui_idleOpen',region},!unlocked?'先通关该地区':!hero?'需一位空闲、未出阵好汉':token===id&&!s.exploration?.visiting?'先开启顺路寻访':'',{priority:1});}
 if(resource){const mode={campWood:'wood',campFood:'food',silver:'silver'}[id],amount=s.camp?dutyQuote(s,mode)[mode]:0;add('duty',DUTIES[mode].name,'采集',(s.camp?'本次 '+amount+' 份':'建寨后查看产量')+' · 体力 5',sourcePage('camp','duties'),!s.camp?'先建立寨子':s.player.stamina<5?'体力不足':'',{priority:2});}
 if(['campWood','campFood'].includes(id)){const building=id==='campWood'?'lumber':'farm';add('production',id==='campWood'?'伐木场生产':'农田生产','生产','按设施、人手与仓储结算，领取前可预览', {type:'ui_idleTab',id:'production'},!s.camp?'先建立寨子':!s.frontier?'先开办寨中生产':!s.camp.buildings[building]?'先建好'+(building==='lumber'?'伐木场':'农田'):'',{priority:3});}
 for(const [key,m]of Object.entries(POSTS))if(({wood:'campWood',food:'campFood'}[m.resource]||m.resource)===id){const post=s.frontier?.posts[key],reason=!s.camp?'先建立寨子':!post?'先占领据点'+(postPlan(s,key).reason?'：'+postPlan(s,key).reason:''):post.threat?'据点告急，解围后可领取':'';add('post:'+key,m.name+'补给','生产','每半小时 '+m.yield+' 份，最多暂存八小时。生产领地 → 山外据点。',sourcePage('camp','production'),reason,{priority:3});}
 if(id==='liyun_token'){const claimed=!!s.exploration?.flags.includes('liyun_invited');add('liyun','李云 · 矿洞立架','一次','办妥立架并邀请入寨，信物 2 枚',{type:'ui_regionOpen',region:'mine',node:'chamber'},claimed?'已领取':s.exploration?.flags.includes('liyun_braced')?'':'先完成查梁、护木与立架',{claimed,priority:0});}
 const thanks={mine:{name:'夺回矿车',items:MINE_REWARDS.thanks,won:'won_orecart',flags:s.exploration?.flags||[]},marsh:{name:'清渠除蛇',items:MARSH_REWARDS.thanks,won:'won_reedvenom',flags:s.exploration?.marsh?.flags||[]},mountain:{name:'护粮回程',items:{copper_sand:4,xiangchong_token:2,strength_charm:1},won:'won_convoy',flags:s.exploration?.mountain?.flags||[]},...Object.fromEntries(Object.entries(REGION_REVISITS).map(([k,v])=>[k,{name:v.title,items:v.rewards,won:'won_return',flags:s.exploration?.[k]?.flags||[]}]))};
 for(const [region,r] of Object.entries(thanks))if(r.items[id]){const claimed=r.flags.includes('return_paid');add('thanks:'+region,r.name+'谢礼','一次',r.items[id]+' 份 · 只领一次',{type:'ui_regionOpen',region},claimed?'已领取':!r.flags.includes(r.won)?'先办妥该地重访':'',{claimed,priority:0});}
 if(CROSS_REWARDS[id]){const claimed=crossHas(s,'delivered');add('crossThanks','药船夜渡谢礼','一次',CROSS_REWARDS[id]+' 份 · 只领一次',sourcePage('camp','crossRegion'),claimed?'已领取':!crossAvailable(s)?'先完成三地重访':!crossHas(s,'won')?'先护送药船':'',{claimed,priority:0});}
 if(item?.type==='token'){const h=d.by.heroes[item.hero],active=recruitmentBanner(d,s.clock).heroes.some(x=>x.id===h.id);add('recruit','当期招募 · '+h.name,'随机','首次抽中即入寨；重复抽中得 3 枚本人信物。',sourcePage('recruit','ordinary'),!active?'此人不在本期名单，请查看月度招募日历':!(s.inventory.recruit_order>0)?'需要招贤令':'',{priority:7});}
 const hero=d.heroes.find(h=>id===h.id+'_manual'||id===h.id+'_order');
 if(hero){const book=id.endsWith('_manual'),cost={items:{[book?'martial_pages':hero.id+'_token']:book?2:10}};if(book||!isExternal(hero))add('heroCraft',book?'抄录'+hero.name+'招式书':'合成专属招贤令','兑换','每份消耗 '+(book?'武学残页 2':'本人信物 10'),book?sourcePage('heroes','skills',hero.id):{type:'ui_sourceExclusive',id:hero.id},book&&s.heroes[hero.id].status!=='owned'?'先邀本人入寨':!book&&!recruitmentBanner(d,s.clock).headliners.some(h=>h.id===hero.id)?'此人不在本期名单，请查看月度招募日历':funds(cost),{cost,priority:1});}
 if(hero&&id.endsWith('_manual')&&isWanderer(hero)){const cost={items:{[hero.id+'_token']:3}};add('tokenBook','散人信物换书','兑换','本人信物 3 枚换招式书 1 本',sourcePage('heroes','skills',hero.id),s.heroes[hero.id].status!=='owned'?'先邀本人入寨':funds(cost),{cost,priority:1});}
 for(const [region,r] of Object.entries(ROUTE_PRIZES))if(r.equipment===id)add('journey:'+region,r.title,'兑换',r.name+' '+routeBalance(s,region)+' / '+ROUTE_PRICE+'；需走通路线带回路契',sourcePage('realm','rewards'),routeBalance(s,region)<ROUTE_PRICE?'路契不足':'',{priority:0});
 if(BOX_OPTIONS[id])add('box','军需自选箱','自选','每箱可选 '+BOX_OPTIONS[id]+' 份',sourcePage('bag','supplies'),s.inventory.material_choice>0?'':'尚无军需自选箱',{priority:0});
 for(const q of d.quests){const amount=id==='silver'?q.reward?.silver:q.reward?.items?.[id];if(!amount)continue;const claims=q.type==='daily'?s.daily.claimed:s.progress.claims,claimed=claims.includes(q.id);add('quest:'+q.id,q.name,q.type==='daily'?'每日':'一次',amount+' 份 · '+(q.type==='daily'?'仅今日派发的差事可领取':'只领一次'),sourcePage('quests'),claimed?'已领取':q.type==='daily'&&!s.daily.ids.includes(q.id)?'今日未派发这份差事':!questReady(s,q)?'尚未完成差事':'',{claimed,priority:0});}
 if(id==='recruit_order')for(const q of recruitOffers(s,d))add('recruitSupply:'+q.id,q.name,'补给',q.amount+' 张',sourcePage('recruit','support'),q.reason,{priority:0,claimed:q.reason.includes('领取')});
 if(['vital_pill','material_choice'].includes(id)){
  for(const c of d.chapters){const claimed=!!s.progress.flags['kit_chapter_'+c.id];add('milestone:'+c.id,c.name||('第 '+c.number+' 卷补给'),'一次','每卷通关补给 1 份',sourcePage('bag','supplies'),claimed?'已领取':!s.progress.flags[c.completeFlag]?'先完成本卷主线':'',{claimed,priority:0});}
  const cal=rotationCalendar(s.clock),claimed=!!s.progress.flags['kit_week_'+cal.period.replaceAll('-','_')];add('weeklyKit','本期周本补给','每期','本期周本达到二层，补给 1 份',sourcePage('bag','supplies'),claimed?'已领取':!(s.campaign?.weekly[cal.period]?.tier>=2)?'先通关本期周本二层':'',{claimed,priority:0});
 }
 const exchanges={recruit_order:{name:'合成招贤令',items:{recruit_shard:10},amount:1},jinchuangyao:{name:'药草换药',items:{herb:3},amount:2},strength_charm:{name:'合成强化符',items:{strength_shard:5},amount:1},iron:{name:'碎铁重熔',items:{scrap_iron:5},silver:20,amount:2}};
 if(exchanges[id]){const r=exchanges[id];add('exchange',r.name,'兑换','每次得 '+r.amount+' 份',sourcePage(id==='iron'?'forge':'bag',id==='iron'?'sets':'craft'),funds(r),{cost:r,priority:2});}
 for(const event of d.events)for(const option of event.options){const amount=(option.effects||[]).filter(e=>e.type==='item'&&e.id===id).reduce((n,e)=>n+e.amount,0);if(amount){const claimed=s.daily.events.includes(event.id);add('event:'+event.id+':'+option.id,event.name+' · '+option.label,'际遇','遇见后选择此项可得 '+amount+' 份；寻访不保证遇到。',{type:'ui_mapInspect',id:event.maps[0]},claimed?'今日已遇见':!meets(s,event.condition)?'先满足此际遇条件':'',{claimed,priority:6});}}
 // Map actions retain their own prerequisites and once-only markers.
 for(const m of d.maps)for(const a of m.actions){const n=(a.effects||[]).filter(e=>e.type===(resource?'currency':'item')&&e.id===id).reduce((n,e)=>n+e.amount,0);if(n<=0)continue;const claimed=!!(a.once&&s.progress.actions[a.id]);add('map:'+m.id+':'+a.id,m.name+' · '+a.label,a.once?'一次':'差事',n+' 份'+(a.limit?' · 每日限 '+a.limit:'') ,{type:'ui_mapInspect',id:m.id},claimed?'已领取':!meets(s,a.condition)?'先完成该处人物与主线条件':'',{claimed,priority:2});}
 for(const h of d.heroes){const q=chronicleQuote(s,h.id);if(!q)continue;const supplies=q.step===3?{[h.id+'_token']:3,spirit_essence:3}:q.model.materials,amounts=q.step?{...supplies,[h.id+'_manual']:q.step,exp_pill:Math.max(supplies.exp_pill||0,q.step)}:{};if(amounts[id])add('chronicle:'+h.id,h.name+' · '+q.model.title,'一次','本段可选择相关酬谢；两种酬谢只能领一种。',sourcePage('heroes','tasks',h.id),q.reason,{priority:2});}
 for(const story of d.stories){const found=Object.values(story.steps).some(step=>step.choices.some(c=>(c.effects||[]).some(e=>e.type==='item'&&e.id===id)));if(found){const claimed=s.progress.stories[story.id]?.status==='completed';add('story:'+story.id,story.title,'剧情','随剧情选择取得，查看剧情中的交付与奖励。',{type:'ui_mapInspect',id:story.map},claimed?'此段剧情已完成':'继续对应主线',{claimed,priority:8});}}
 if(equip&&!equip.source)for(const dungeon of d.dungeons){const pool=equipmentPool(d,Math.min(3,1+Math.floor(dungeon.level/15)));if(!pool.some(e=>e.id===id))continue;const rate=EQUIPMENT_DROP_RATE/pool.length,used=s.daily.dungeons[dungeon.id]||0;add('ordinaryGear:'+dungeon.id,dungeon.name+' · 战后搜获','概率','先判定 '+pct(EQUIPMENT_DROP_RATE)+' 出装备，再从 '+pool.length+' 件中等概率抽取；此件约 '+pct(rate)+'，体力 '+dungeon.cost+'。',{type:'ui_sourceDungeon',id:dungeon.id},!dungeonEntry(s,dungeon)?'需主线条件或对应聚义厅等级':used>=dungeon.limit?'今日次数用完':!s.team.some(h=>s.heroes[h].level>=dungeon.level)?'队中一人 '+dungeon.level+' 级':s.player.stamina<dungeon.cost?'体力不足':'',{rate,priority:5});}
 rows.push(...promotionCoreSourceRows(s,d,id));
 if(!rows.length)add('none','暂无常规来源','线索',item?.description||'这件物品尚无可重复取得的入口。',sourcePage('map'), '暂无可重复来源',{priority:9});
 for(const row of rows){if(busy&&!row.reason)row.reason='先结束当前交战或行程';}
 return rows.sort((a,b)=>(a.claimed?3:a.reason?1:0)-(b.claimed?3:b.reason?1:0)||(a.priority??5)-(b.priority??5));
}
