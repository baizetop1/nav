import { count, journal, random, requireRule } from './utils.js?v=0.15.0';
import { gainExp } from './hero.js?v=0.15.0';
export function gainItem(state, id, amount, data) {
  requireRule(data.by.items[id] && Number.isInteger(amount) && amount > 0,'无效的道具奖励。');
  state.inventory[id]=(state.inventory[id]||0)+amount;count(state,'gain_'+id,amount);
}
export function pay(state, cost={}) {
  requireRule(state.player.silver >= (cost.silver||0), '碎银不足。');
  requireRule(state.player.merit >= (cost.merit||0), '功勋不足。');
  for(const [id,n] of Object.entries(cost.items||{}))requireRule((state.inventory[id]||0)>=n,'所需材料不足。');
  state.player.silver-=cost.silver||0;state.player.merit-=cost.merit||0;
  for(const [id,n] of Object.entries(cost.items||{}))state.inventory[id]-=n;
}
export function grant(state, reward, data) {
  for(const key of ['silver','merit','prestige'])state.player[key]+=reward[key]||0;
  for(const [id,n] of Object.entries(reward.items||{}))gainItem(state,id,n,data);
  if(reward.exp)for(const id of state.team)gainExp(state,id,reward.exp,data);
}
export function newEquipment(state, id) { const instance={uid:'eq_'+state.nextEquipment++,item:id,plus:0,hero:null};state.equipment.push(instance);return instance; }
export function strengthenQuote(state,data,equip) {
  const rule=data.config.balance.strengthen, next=equip.plus+1, advanced=next>5;
  return {cap:state.progress.flags[rule.advancedFlag]?rule.cap:5,rate:advanced?rule.advancedRate:1,cost:{silver:rule.silverPerLevel*next,items:{iron:next,...(advanced?{[rule.advancedMaterial]:1}:{})}}};
}
export function itemAction(state, data, action) {
  const {type,id,hero}=action, item=data.by.items[id];
  if(type==='buy') {
    // Camp merchants deliver purchases regardless of exploration location.
    requireRule(item && ['consume','material','quest','special'].includes(item.type) && item.price>0 && !item.hero,'这里没有出售这件物品。');
    if(id==='recruit_order')requireRule((state.daily.counters.buyOrder||0)<3,'今日集市的三张招贤令已售罄。');
    pay(state,{silver:item.price});gainItem(state,id,1,data);if(id==='recruit_order')count(state,'buyOrder');journal(state,`购得${item.name}一份。`);return;
  }
  if(type==='use') {
    requireRule(item && state.inventory[id]>0,'行囊里没有这件道具。');
    if(item.effect.exp) {requireRule(state.heroes[hero]?.status==='owned','请选择已入寨的好汉。');requireRule(state.heroes[hero].level<data.config.balance.heroLevelCap,'已达本卷等级上限，不消耗经验丹。');state.inventory[id]--;gainExp(state,hero,item.effect.exp,data);journal(state,`${data.by.heroes[hero].name}收下${item.name}，潜心研习。`);}
    else if(item.effect.stamina){requireRule((state.daily.counters.wine||0)<2,'今日已饮两次村酒，莫再贪杯。');requireRule(state.player.stamina<100,'体力充足，不必饮酒。');state.inventory[id]--;state.player.stamina=Math.min(100,state.player.stamina+item.effect.stamina);count(state,'wine');journal(state,'小饮一碗，精神略振。');}
    else throw new Error('这件物品用于战斗、打造、招贤或后续线索，不能直接使用。');return;
  }
  if(type==='craftOrder') {requireRule(data.by.heroes[id],'未知好汉。');pay(state,{items:{[id+'_token']:10}});gainItem(state,id+'_order',1,data);journal(state,`十枚信物合为${data.by.heroes[id].name}专属招贤令。`);return;}
  if(type==='exchange') {
    const recipes={order:{cost:{recruit_shard:10},reward:{recruit_order:1}},medicine:{cost:{herb:3},reward:{jinchuangyao:2}},ledger:{cost:{lost_ledger:20},reward:{iron:6,exp_pill:3}},charm:{cost:{strength_shard:5},reward:{strength_charm:1}}};
    const recipe=recipes[id];requireRule(recipe,'没有这种合成方式。');pay(state,{items:recipe.cost});grant(state,{items:recipe.reward,silver:id==='ledger'?1000:0},data);journal(state,'材料已换成行路所需之物。');return;
  }
  if(type==='craftEquip'||type==='buyEquip') {
    const model=data.by.equipments[id];requireRule(model,'未知装备。');requireRule(state.equipment.length<200,'装备已达 200 件，请先分解旧物。');
    pay(state,type==='craftEquip'?model.recipe:{silver:model.price*2});newEquipment(state,id);journal(state,`取得${model.quality}·${model.name}。`);return;
  }
  const equip=state.equipment.find(e=>e.uid===id);requireRule(equip,'未找到这件装备。');const model=data.by.equipments[equip.item];
  if(type==='equipLock') {requireRule(typeof action.locked==='boolean','无效的锁定状态。');equip.locked=action.locked;state.commandVersion=1;journal(state,model.name+(equip.locked?'已锁定，不能分解。':'已解除锁定。'));}
  else if(type==='equip') {
    requireRule(hero===null||state.heroes[hero]?.status==='owned','只有入寨好汉能够穿戴。');
    if(hero)for(const e of state.equipment)if(e.hero===hero&&data.by.equipments[e.item].type===model.type)e.hero=null;
    equip.hero=hero;journal(state,`${model.name}${hero?'交给'+data.by.heroes[hero].name:'已卸下'}。`);
  } else if(type==='strengthen') {
    const quote=strengthenQuote(state,data,equip);
    requireRule(equip.plus<quote.cap,quote.cap===5?'当前强化上限为 +5；完成山神庙往事后，可向铁匠请教。':'本版强化上限为 +10。');
    pay(state,quote.cost);const success=quote.rate===1||random(state)<quote.rate;
    if(success){equip.plus++;count(state,'strengthen');journal(state,`${model.name}强化至 +${equip.plus}。`);}
    else journal(state,`${model.name}此次淬炼未成，碎银、精铁与强化符已消耗；装备仍为 +${equip.plus}，没有降级或损毁。`);
  }
  else if(type==='dismantle') {requireRule(!equip.locked,'此装备已锁定，请先解锁再分解。');requireRule(!equip.hero,'请先卸下装备，再分解。');state.equipment=state.equipment.filter(e=>e.uid!==id);gainItem(state,'scrap_iron',model.tier*2+equip.plus,data);journal(state,`${model.name}已分解为碎铁。`);}
  else throw new Error('未知道具操作。');
}
