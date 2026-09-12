import { waterBattle } from './frontier-data.js?v=0.15.0';
export const NAVAL=new Set(['lijun','ruanxiaoer','ruanxiaowu','ruanxiaoqi','zhangheng','zhangshun','tongwei','tongmeng']);
export function doctrineText(id){return ({xuning:'钩镰破骑：每第三次普攻命中骑军后，追加破甲 4 秒和眩晕 1 秒。',lingzhen:'火炮装填：每完成三次普攻，对敌方全体追加 55% 攻击倍率炮击。',shiqian:'潜入侦路：带兵开战时，全队首次行动提前 400 毫秒，并获得 8 怒气。',huyanzhuo:'连环铁甲：带兵时承受普攻的伤害减少 10%。'})[id]||(NAVAL.has(id)?'水营互援：水域作战享受水战加成，每第三次普攻后回复自身最大气血的 3%。':'');}
export function initializeDoctrine(b){if(b.frontierRules!==1)return;for(const u of b.team)if(u.corps?.troops&&doctrineText(u.id)){if(u.id==='shiqian')for(const ally of b.team){ally.nextAttackAt=Math.max(300,ally.nextAttackAt-400);ally.rage=Math.min(100,ally.rage+8);}b.log.push('【本部战法】'+u.name+' · '+doctrineText(u.id));}}
export function doctrineFactor(b,target,normal){return b.frontierRules===1&&normal&&target.side==='team'&&target.id==='huyanzhuo'&&(target.corps?.troops||0)>0 ? .9 : 1;}
export {waterBattle};
