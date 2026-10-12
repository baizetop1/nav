import {buildingQuote} from './camp.js?v=0.82.2';
import {battleItemQuote} from './battle.js?v=0.82.2';
import {totalExperience} from './progression.js?v=0.82.2';
import {away} from './progression-paths.js?v=0.82.2';
// A suggested first outing, derived from existing progress; no extra rewards or gates.
export const isTigerStory=b=>b?.context?.type==='story'&&b.context.id==='wusong_story';
const page=(view,id,hero)=>({type:'ui_section',view,id,...(hero?{hero}:{})});
export function firstSessionGoal(s,d){
 if(!s.camp||s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run||s.progress.flags.volume_complete||s.camp.buildings.hall>2||s.exploration?.activeRegion&&s.exploration.activeRegion!=='mine')return null;
 const owned=d.heroes.filter(h=>s.heroes[h.id]?.status==='owned'&&!away(s,h.id));
 if(!owned.length||owned.some(h=>s.heroes[h.id].level>=15))return null;
 const gear=s.equipment.find(e=>e.item==='guard_pike'),made=(s.stats.regional_craft_mine||0)>0;
 const step=(id,title,text,label,command)=>({id,title,text,label,command});
 if(gear||made)return gear&&!gear.hero?step('wear','把长枪交给同伴','守路长枪已做好。选一位好汉穿戴，下一场便能用。','穿戴守路长枪',{type:'ui_gearModel',id:'guard_pike'}):null;
 const work=(id,title,text)=>s.player.stamina>=5?step('work-'+id,title,text,'采集'+({wood:'木料',silver:'银两'}[id])+' · 5体力',{type:'campWork',id}):step('stamina','补充出行体力','采集物资需要5点体力。已有补给可在行囊使用，也可等自然恢复。','查看补给',page('bag','supplies'));
 const has=k=>s.exploration?.flags.includes(k);
 if(!has('won_chamber')){
  if(!s.progress.flags.tiger_complete&&!owned.some(h=>s.heroes[h.id].level>=5))return step('story','先随武松上冈','打虎后有3枚经验丹。武松临时助阵，交战时可用行囊里的金创药照应他。','继续主线',{type:'ui_storyResume'});
  if(owned.length<2&&s.heroes.duqian.status!=='owned'){
   const count=s.camp.work+s.camp.sorties;if(count<2)return work('wood','找一位同行好汉','白胜擅长照应，杜迁可持枪迎敌。寨务或出征办满2次可邀他入寨，现已办'+count+'次。');
   if(s.player.silver<240)return work('silver','备下邀请杜迁的盘缠','邀请需240碎银，现有'+s.player.silver+'。也可在名册选择其他同伴。');
   return step('invite','邀杜迁同行','寨务条件已满足。付240碎银即可邀请，不消耗招贤令。','邀请杜迁 · 240碎银',{type:'campInvite',id:'duqian'});
  }
  if(owned.length<2&&s.heroes.duqian.status==='owned')return step('recall','先等同伴归队','杜迁正在外出。可以收回派遣，或在名册另选一位同行好汉。','查看外出安排',s.idleDispatch?.mission?.hero==='duqian'?{type:'ui_idleOpen'}:s.realm?.squad?.team.includes('duqian')?page('realm','expeditions'):page('camp','affairs'));
  if(s.team.length<2&&owned.length>=2)return step('team','把同伴编入队伍','矿洞里有人替守卫治疗，建议至少两人同行。先把寨中同伴编入出阵队伍。','安排出阵',page('heroes','formation'));
  const party=s.team.filter(id=>!away(s,id)).slice(0,2);if(party.length<2)return step('team','安排出阵好汉','先选好这次同行的人。','安排出阵',page('heroes','formation'));
  const leader=party[0],spare=s.equipment.find(e=>!e.hero&&['weapon','armor'].includes(d.by.equipments[e.item]?.type)&&!s.equipment.some(x=>x.hero===leader&&d.by.equipments[x.item]?.type===d.by.equipments[e.item].type));
  if(spare)return step('gear','出门前穿好装备','行囊里的'+d.by.equipments[spare.item].name+'还未穿戴，可交给'+d.by.heroes[leader].name+'。','查看'+d.by.equipments[spare.item].name,{type:'ui_gearModel',id:spare.item});
  const learner=party.find(id=>s.heroes[id].level<6);
  if(learner){
   const h=s.heroes[learner],need=Math.max(0,totalExperience({level:6,exp:0})-totalExperience(h)),count=Math.min(s.inventory.exp_pill||0,Math.ceil(need/d.by.items.exp_pill.effect.exp));
   if(count)return step('train','让'+d.by.heroes[learner].name+'练到6级','当前'+h.level+'级。先预览使用'+count+'枚经验丹的变化，确认后才消耗。','预览培养',{type:'ui_batchPreview',kind:'experience',id:learner,count});
   if(!s.progress.flags.tiger_complete)return step('story','随武松上冈取历练','目前经验丹不足。完成打虎故事可得3枚，再回来培养同伴。','继续主线',{type:'ui_storyResume'});
   if(s.camp.mode==='army'&&!s.camp.troops)return step('solo','先准备一次小队清剿','山林清剿首胜能领经验丹。营中暂无士兵，可以先让好汉独行。','改为好汉独行',{type:'campFormation',mode:'solo',tactic:'balanced',deployment:s.camp.deployment,arm:'infantry'});
   if(s.camp.sorties&&!s.progress.flags.camp_goal_first_win)return step('claim','领取首战酬劳','山林清剿已获胜，初战扬名可领2枚经验丹。','领取初战扬名',{type:'campClaim',id:'first_win'});
   return step('experience','补些历练再进矿洞','山林清剿胜利得经验丹与历练，首次获胜还有2枚经验丹。','查看山林清剿',page('camp','raids'));
  }
  return step('explore','去矿洞救出被困矿工','同伴已备好。到塌方石室，先集中对付会治疗的官差，再救人。','前往塌方石室',{type:'ui_regionOpen',region:'mine',node:'chamber'});
 }
 // Existing map objectives take over until the first revisit has been handed in.
 if(!has('return_paid'))return null;
 const build=id=>{const q=buildingQuote(s.camp,id),name=id==='market'?'集市':'聚义厅';if(s.camp.wood<q.wood)return work('wood','备料修'+name,'营建木材'+s.camp.wood+'/'+q.wood+'。守路长枪的地区配方需要2级集市。');if(s.player.silver<q.silver)return work('silver','备银修'+name,'碎银'+s.player.silver+'/'+q.silver+'，木材已齐。');return step('build-'+id,name+'升到'+(s.camp.buildings[id]+1)+'级','需要营建木材'+q.wood+'、碎银'+q.silver+'。','确认营建',{type:'campBuild',id});};
 if(s.camp.buildings.market<1)return build('market');
 if(s.camp.buildings.hall<2)return build('hall');
 if(s.camp.buildings.market<2)return build('market');
 if((s.inventory.magnetite_sand||0)<6)return step('ore','为长枪攒齐矿砂','磁铁砂'+(s.inventory.magnetite_sand||0)+'/6。截矿夺车每胜一场必得1份，不耗体力与粮草。','再去截矿夺车',{type:'ui_regionOpen',region:'mine',node:'vault'});
 for(const [id,n]of Object.entries({iron:2,wood:3}))if((s.inventory[id]||0)<n)return step('material-'+id,'补齐'+d.by.items[id].name,d.by.items[id].name+(s.inventory[id]||0)+'/'+n+'。'+(id==='wood'?'行囊木材用于打造，与寨中营建木材分开。':'可在原料摊按需购买。'),'查看原料采买',{type:'ui_materialBuy',id});
 const price=s.exploration?.buildings.includes('forge')?80:100;
 if(s.player.silver<price)return work('silver','备好打造银两','长枪所需材料已齐，打造需碎银'+price+'，现有'+s.player.silver+'。');
 return step('craft','做一把守路长枪','磁铁砂6、精铁2、行囊木材3已齐。打开地区配方确认打造，矿砂炉不是前置条件。','查看长枪配方',{type:'ui_regionalRecipe',id:'mine'});
}
export function firstBattleHint(s,d,paused=false){
 const b=s.battle;if(!b||b.outcome)return null;
 if(isTigerStory(b)){
  const u=b.team[0],q=battleItemQuote(s,d,'jinchuangyao');
  if(u.hp/u.maxHp<.65&&!q.reason)return {id:'tiger-medicine',title:'照应受伤的武松',text:paused?'武松需要疗伤。先继续交战，再点用金创药；自动施招不会用药。':'武松气血不足，点下方按钮用金创药。自动施招不会替你用药。',targets:[{type:paused?'ui_battlePause':'battleItem',...(!paused?{id:'jinchuangyao'}:{})}],action:{label:paused?'继续交战':'用金创药 · 余'+s.inventory.jinchuangyao,command:paused?{type:'ui_battlePause'}:{type:'battleItem',id:'jinchuangyao'}}};
  return null;
 }
 if(b.context.type==='special'&&['mine','minechief'].includes(b.context.id)&&b.context.tier===1&&Math.max(...b.team.map(u=>s.heroes[u.id].level))<15){
  const healer=(b.context.route==='orecart'&&b.enemy.at(-1).hp>0?b.enemy.at(-1):null)||b.enemy.find(u=>u.hp>0&&u.model==='guard');
  if(healer&&b.orders?.focus!==healer.id)return {id:'mine-focus',title:b.context.route==='orecart'&&healer===b.enemy.at(-1)?'先截住运料匪':'先集火治疗守卫',text:'集中攻击'+healer.name+'，断掉敌方回复。'+(paused?'确认集火后点继续交战。':'也可暂停后再下令。'),targets:[{type:'battleOrder',kind:'focus',target:healer.id}],action:{label:'集火'+healer.name,command:{type:'battleOrder',kind:'focus',target:healer.id}}};
 }
 return null;
}
