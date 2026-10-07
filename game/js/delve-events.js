import {random} from './utils.js?v=0.68.0';
import {SPECIAL_ROUTES,routeReward} from './special-routes.js?v=0.68.0';
const option=(name,route,hero,help)=>({name,route,hero,help,effect:hero==='tanglong'?'unshield':['ruanxiaoqi','andaoquan'].includes(hero)?'cleanse':['shiqian','yuehe'].includes(hero)?'weaken':'heal'});
export const DELVE_EVENTS={
 mine_collapse:{area:'mine',name:'断梁落石',text:'前面的木梁塌了，石缝里传来敲击声。',rest:'绕山腰走',rescue:option('救出矿工','oreguard','xiangchong','团牌挡住落石，全队恢复 8% 气血。'),cache:option('钻进运矿道','ambush','shiqian','时迁探出伏兵位置，敌军攻击降低 10%。')},
 mine_cart:{area:'mine',name:'遗落矿车',text:'矿车卡在岔口，守卫正往炉房撤。',rest:'沿旧轨撤开',rescue:option('夺下炉房','oreguard','tanglong','汤隆认出炉门机关，移除守卫开场护阵。'),cache:option('追上矿车','ambush','songqing','宋清找到车中口粮，全队恢复 8% 气血。')},
 mine_lamp:{area:'mine',name:'灯下药商',text:'药商被困在石室里，门旁盘着几条蛇。',rest:'沿亮处前进',rescue:option('护送药商','supplies','baisheng','白胜包扎伤口，全队恢复 8% 气血。'),cache:option('查看石室后门','oreguard','shiqian','时迁摸清守卫站位，敌军攻击降低 10%。')},
 marsh_boat:{area:'marsh',name:'搁浅渡船',text:'渡船陷进泥里，船舱里还有人。',rest:'沿岸绕过去',rescue:option('涉水救人','poisonbank','ruanxiaoqi','阮小七找到干净水道，免去涉水开场中毒。'),cache:option('取回船尾药箱','supplies','songqing','宋清分出备用干粮，全队恢复 8% 气血。')},
 marsh_reed:{area:'marsh',name:'芦花暗哨',text:'芦苇里有人吹哨，对岸的脚步声越来越近。',rest:'避开哨声',rescue:option('接应采药人','supplies','yuehe','乐和用哨声误导追兵，敌军攻击降低 10%。'),cache:option('截住岸边骑队','ambush','shiqian','时迁先到侧岸探路，敌军攻击降低 10%。')},
 marsh_mist:{area:'marsh',name:'雾中栈桥',text:'旧栈桥通向药圃，近路的水面泛着紫沫。',rest:'等雾散再走',rescue:option('抢过毒滩','poisonbank','andaoquan','安道全分发解毒药，免去涉水开场中毒。'),cache:option('搜查药圃','supplies','baisheng','白胜照料伤者，全队恢复 8% 气血。')},
 ruins_bell:{area:'ruins',name:'夜半钟声',text:'营中的铜钟响了，残兵正往门楼聚。',rest:'从营外绕行',rescue:option('救下守门伤员','warbell','yuehe','乐和引开援兵，敌军攻击降低 10%。'),cache:option('截下军资车','ambush','songqing','宋清从车上取出干粮，全队恢复 8% 气血。')},
 ruins_cell:{area:'ruins',name:'地窖囚徒',text:'地窖门被铁链锁住，里面有人求救。',rest:'记下位置绕行',rescue:option('打开药材地窖','supplies','baisheng','白胜先救治伤者，全队恢复 8% 气血。'),cache:option('夺下门楼钥匙','warbell','shiqian','时迁摸进门楼，敌军攻击降低 10%。')},
 ruins_watch:{area:'ruins',name:'空营火光',text:'几处帐篷同时亮起火光，营后却传来车轮声。',rest:'退到墙外等候',rescue:option('抢占钟楼','warbell','xiangchong','项充护住前队，全队恢复 8% 气血。'),cache:option('追查营后车辙','ambush','yuehe','乐和辨出假口令，敌军攻击降低 10%。')}
};
export function rollDelveEvents(s,area){const pool=Object.keys(DELVE_EVENTS).filter(k=>DELVE_EVENTS[k].area===area),first=pool.splice(Math.floor(random(s)*pool.length),1)[0];return [first,pool[Math.floor(random(s)*pool.length)]];}
export function delveEvent(r){return r?.events?DELVE_EVENTS[r.events[Math.max(0,r.stage-1)]]:null;}
export function delveOption(r,id){const e=delveEvent(r);return id==='rest'?{name:e?.rest||'绕过守卫'}:e?.[id]||({rescue:{name:'救下采药人',route:'supplies'},cache:{name:'追查藏货',route:'ambush'}})[id];}
export function helperReady(r,q){return !!q?.hero&&r.team.includes(q.hero)&&r.hp[q.hero]>0;}
export function applyDelveHelper(b,r,q){if(!helperReady(r,q))return;for(const u of b.team)if(u.hp>0&&q.effect==='heal')u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.08));if(q.effect==='weaken')for(const u of b.enemy)u.attack=Math.max(1,Math.round(u.attack*.9));if(q.effect==='unshield')for(const u of b.enemy)u.statuses=u.statuses.filter(x=>x.id!=='guard');if(q.effect==='cleanse')for(const u of b.team)u.statuses=u.statuses.filter(x=>x.id!=='poison');b.log.push('【同行】'+q.help);}
export function delveRisk(r,id,d){if(id==='rest')return '存活者气血 +15%；无额外材料。';const q=delveOption(r,id),bonus=routeReward(q.route,r.tier),risk={ambush:'增援骑兵；敌气血、速度 +10%。',supplies:'增援毒蛇（怒气90）；敌气血 +20%。',oreguard:'增援守卫；敌气血 +15%、护阵45%持续12秒。',poisonbank:'增援毒蛇；敌气血 +10%；全队中毒每2秒3%，共4次。',warbell:'增援守卫；敌气血 +15%、速度 +10%；头目蓄势改为全敌回血15%。'}[q.route];return risk+' 胜利加'+d.by.items[bonus.id].name+' ×'+bonus.count+'。'+(q.hero?(helperReady(r,q)?' '+q.help:' 可由'+d.by.heroes[q.hero].name+'相助。'):'');}
