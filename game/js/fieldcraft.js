import { battleTerrain } from './strategy-data.js?v=0.32.0';
import { CORPS } from './corps-data.js?v=0.32.0';
// Explicit marker: ongoing old battles keep their original combat and casualty rules.
export const FIELD_RULES=2;
export const healingSupply=(b,u)=>fieldRules(b)&&u.side==='enemy'?(b.elapsed>=120000?.25:b.elapsed>=60000?.5:1):1;
export const fieldRules=b=>b.expedition?.fieldRules===FIELD_RULES;
export const FIELD_TERRAIN={land:{infantry:1,ranged:1,cavalry:1.08},forest:{infantry:1.08,ranged:1.05,cavalry:.9},mountain:{infantry:1.08,ranged:1.08,cavalry:.88},water:{infantry:.94,ranged:.94,cavalry:.85}};
export function terrainRate(b,u){if(!fieldRules(b)||!u.corps?.troops)return 1;const terrain=b.depth?.terrain||battleTerrain(b);return terrain==='water'&&CORPS[u.id]?.profile==='naval'?1.12:FIELD_TERRAIN[terrain]?.[u.corps.arm]||1;}
export const SIGNATURES={
 baisheng:{name:'探路接应',text:'带兵时全队首次普攻提前 200 毫秒；收兵时非胜利的伤亡总数减少 10%。'},
 daizong:{name:'神行传令',text:'全队首次普攻提前 300 毫秒，并获得 5 怒气。'},
 guansheng:{name:'长刀压阵',text:'攻击气血高于一半的敌人时，直接伤害 +12%。'},
 qinming:{name:'霹雳先登',text:'开战前 12 秒直接伤害 +18%，自身承受直接伤害 +8%。'},
 dongping:{name:'双枪逐阵',text:'攻击破甲敌人时，直接伤害 +18%。适合配合追射与破甲招式。'},
 yangzhi:{name:'押运守阵',text:'带兵且采用结阵固守时，全队防御 +8%。'},
 shijin:{name:'九纹鏖战',text:'交战满 15 秒后，普攻伤害 +18%。'},
 zhuwu:{name:'审势破阵',text:'对正在蓄势的首领，谋攻伤害 +20%。伤害加成不会直接打断蓄势。'},
 fanrui:{name:'混世法门',text:'攻击有削弱状态的敌人时，谋攻伤害 +18%。'},
 sunerniang:{name:'夜叉截击',text:'攻击被眩晕的敌人时，直接伤害 +20%。'},
 andaoquan:{name:'随军救急',text:'带兵收兵时，阵亡率乘以 75%，减少的阵亡转为伤兵；与通用救护部队效果不叠加。'},
 huangfuduan:{name:'护骑理伤',text:'带兵收兵时，骑军所占比例越高，阵亡率越低，最多乘以 85%；减少的阵亡转为伤兵，与医者救急取较强效果。'}
};
export function initializeSignatures(b){if(!fieldRules(b)||b.martial!==2)return;for(const u of b.team){const spec=SIGNATURES[u.id];if(!spec)continue;
 const haste=u.id==='daizong'?300:u.id==='baisheng'&&u.corps?.troops?200:0;
 if(haste)for(const ally of b.team){ally.nextAttackAt=Math.max(300,ally.nextAttackAt-haste);if(u.id==='daizong')ally.rage=Math.min(100,ally.rage+5);}
 if(u.id==='yangzhi'&&u.corps?.troops&&b.expedition.tactic==='guard')for(const ally of b.team)ally.defense=Math.round(ally.defense*1.08);
 b.log.push('【人物本领】'+u.name+' · '+spec.name+'：'+spec.text);
}}
export function signatureFactor(b,u,target,{normal=false,strategy=false}={}){if(!fieldRules(b)||b.martial!==2)return 1;let n=1;
 if(target.side==='team'&&target.id==='qinming'&&b.elapsed<12000)n*=1.08;if(u.side!=='team')return n;
 if(u.id==='guansheng'&&target.hp>target.maxHp/2)n*=1.12;if(u.id==='qinming'&&b.elapsed<12000)n*=1.18;
 if(u.id==='dongping'&&target.statuses.some(s=>s.id==='armor_break'))n*=1.18;if(u.id==='shijin'&&normal&&b.elapsed>=15000)n*=1.18;
 if(u.id==='zhuwu'&&strategy&&target.boss?.pendingAt>b.elapsed)n*=1.2;if(u.id==='fanrui'&&strategy&&target.statuses.some(s=>s.id==='weaken'))n*=1.18;
 if(u.id==='sunerniang'&&target.statuses.some(s=>s.id==='stun'))n*=1.2;return n;
}
export function casualtyQuote(b,tacticLoss,raidLoss=1,{outcome=b.outcome||'retreat',health,elapsed=b.elapsed}={}){
 const n=b.expedition?.troops||0,ratio=health??(b.team.reduce((sum,u)=>sum+u.hp/u.maxHp,0)/Math.max(1,b.team.length));
 let rate=tacticLoss+(1-ratio)*.2+(outcome==='victory'?0:.2),deathRate=outcome==='victory'?.2:outcome==='retreat'?.35:.45;
 if(fieldRules(b)){const exposure=Math.min(1,.25+Math.max(0,elapsed||0)/60000);rate=tacticLoss*(outcome==='victory'?.35*exposure:1)+(1-ratio)*.2+(outcome==='victory'?0:.2);
 const has=id=>b.team.some(u=>u.id===id&&u.corps?.troops>0);if(outcome!=='victory'&&has('baisheng'))rate*=.9;
 const cavalry=b.team.reduce((sum,u)=>sum+(u.corps?.arm==='cavalry'?u.corps.troops:0),0),medic=b.team.some(u=>u.corps?.troops&&CORPS[u.id]?.profile==='medic');
 deathRate*=Math.min(medic?.9:1,has('andaoquan')?.75:1,has('huangfuduan')?1-.15*cavalry/Math.max(1,n):1);
 }
 deathRate*=b.realm?.medical||1;
 const smoke=b.expansion?.smoke&&outcome==='retreat'&&b.metrics?.reason==='manual'?.75:1;const loss=Math.min(n,Math.ceil(n*Math.max(0,rate)*raidLoss*smoke)),fallen=Math.floor(loss*deathRate),wounded=loss-fallen;
 return {troops:n,loss,fallen,wounded,returned:n-loss,replaceSilver:fallen*3,recoverFood:wounded+fallen*2};
}
