export const ARMS={infantry:{name:'步军',hall:1,beats:'ranged'},ranged:{name:'弓军',hall:2,beats:'cavalry'},cavalry:{name:'骑军',hall:3,beats:'infantry'},neutral:{name:'无兵种克制',hall:1}};
const cavalry=new Set(['guansheng','qinming','huyanzhuo','dongping','xuning','suochao','hantao','pengqi','xuanzan','haosiwen','huangxin','sunli']);
const ranged=new Set(['huarong','zhangqing','yanqing','gongwang','dingdesun','lingzhen']);
export const heroArm=h=>cavalry.has(h.id)?'cavalry':ranged.has(h.id)||h.type==='ranger'?'ranged':['strategist','support','healer'].includes(h.type)?'neutral':'infantry';
export const enemyArm=id=>({soldier:'ranged',guard:'infantry',bandit:'infantry',bandit_chief:'infantry',road_raider:'cavalry'})[id]||'neutral';
export const armFactor=(from,to)=>ARMS[from]?.beats===to?1.2:ARMS[to]?.beats===from ? .85 : 1;
const traits={
  wusong:['孤胆','单英雄出阵且不带兵时，伤害 +20%。'],
  huarong:['神射','对骑军造成的伤害额外 +15%。'],
  wuyong:['运筹','开战时全队怒气 +10。'],
  songjiang:['聚义','开战时全队气血 +8%。'],
  linchong:['枪阵','开战时全队防御 +8%。'],
  luzhishen:['拔山','首次普攻伤害 +30%。'],
  ruanxiaoqi:['弄潮','水泊争锋中伤害 +20%。'],
  shiqian:['潜袭','攻击敌阵末位时伤害 +15%。'],
};
export function heroTrait(h){return traits[h.id]||({fighter:['奋勇','普攻伤害 +8%。'],defender:['坚守','开战时自身防御 +12%。'],ranger:['追猎','攻击气血不足一半的敌人时伤害 +15%。'],strategist:['识隙','谋攻伤害 +10%。'],support:['济困','开战时自身气血 +12%。'],healer:['济困','开战时自身气血 +12%。']})[h.type]||['奋勇','普攻伤害 +8%。'];}
export function initializeMartial(s,b,d){
  if(b.guest||!s.camp||b.context.type==='story')return;b.martial=1;
  for(const u of b.team){const h=d.by.heroes[u.id],name=heroTrait(h)[0];
    if(name==='坚守')u.defense=Math.round(u.defense*1.12);
    if(name==='济困')u.hp=u.maxHp=Math.round(u.maxHp*1.12);
    if(u.id==='wuyong')for(const a of b.team)a.rage=Math.min(100,a.rage+10);
    if(u.id==='songjiang')for(const a of b.team)a.hp=a.maxHp=Math.round(a.maxHp*1.08);
    if(u.id==='linchong')for(const a of b.team)a.defense=Math.round(a.defense*1.08);
    b.log.push(`【特性】${u.name} · ${name}：${heroTrait(h)[1]}`);
  }
  b.log.push('【兵种】步军克弓军，弓军克骑军，骑军克步军；优势伤害 +20%，劣势 -15%。');
}
export function unitArm(b,u,d){return u.side==='enemy'?enemyArm(u.model):b.expedition?.troops?b.expedition.arm||'infantry':heroArm(d.by.heroes[u.id]);}
export function martialFactor(b,u,target,d,{normal=false,strategy=false}={}){
  if(b.martial!==1)return 1;let factor=armFactor(unitArm(b,u,d),unitArm(b,target,d));
  if(u.side!=='team')return factor;
  const name=heroTrait(d.by.heroes[u.id])[0];
  if(name==='孤胆'&&b.team.length===1&&!b.expedition?.troops)factor*=1.2;
  if(name==='神射'&&unitArm(b,target,d)==='cavalry')factor*=1.15;
  if(name==='拔山'&&normal&&u.attacks===0)factor*=1.3;
  if(name==='弄潮'&&b.context.type==='rotation'&&b.context.id==='tide')factor*=1.2;
  if(name==='潜袭'&&target===b.enemy[b.enemy.length-1])factor*=1.15;
  if(name==='奋勇'&&normal)factor*=1.08;
  if(name==='追猎'&&target.hp<target.maxHp/2)factor*=1.15;
  if(name==='识隙'&&strategy)factor*=1.1;
  return factor;
}
