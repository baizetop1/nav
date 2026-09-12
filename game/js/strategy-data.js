import { CORPS } from './corps-data.js?v=0.15.0';
// Game design, not a claim about historical or novel military organization.
export const TERRAIN_NAMES={land:'平原',forest:'林地',mountain:'山地',water:'水域'};
const group=text=>new Set(text.split(' '));
const naval=group('lijun ruanxiaoer ruanxiaowu ruanxiaoqi zhangheng zhangshun tongwei tongmeng mengkang');
const mountain=group('wusong luzhishen yangzhi likui jiezhen jiebao baoxu fanrui xiangchong ligun lizhong zhoutong liyun');
const forest=group('liutang shijin zhuwu chenda yangchun shixiu yangxiong yanshun wangying zhengtianshou kongming kongliang shien sunerniang zhangqing_gardener');
const smiths=group('tanglong lingzhen jindajian houjian mengkang');
const farmers=group('taozongwang songqing baisheng caozheng zhangqing_gardener sunerniang gudasao huangfuduan andaoquan');
export const JOB_NAMES={farm:'农田',lumber:'伐木场',workshop:'冶铁工坊'};
export const STYLES={
 assault:{name:'破锋',text:'敌人气血高于一半时，直接伤害 +10%。'},
 shield:{name:'坚壁',text:'自身气血不足一半时，承受直接伤害 −12%。'},
 archer:{name:'追射',text:'每第三次普攻后，对仍存活的原目标追加破甲 4 秒。'},
 scout:{name:'扰阵',text:'每第三次普攻后，削减原目标 8 怒气。'},
 medic:{name:'援护',text:'每第三次普攻后，回复气血比例最低同伴 3% 最大气血。'},
 naval:{name:'搏浪',text:'水域每第三次普攻后，为最低气血同伴提供 10% 护阵 4 秒。'}
};
export const HERO_SPECIALTIES=Object.fromEntries(Object.entries(CORPS).map(([id,c])=>[id,{
 terrain:naval.has(id)?'water':mountain.has(id)?'mountain':forest.has(id)||c.profile==='scout'?'forest':'land',
 job:smiths.has(id)?'workshop':farmers.has(id)||naval.has(id)||c.profile==='medic'?'farm':'lumber',style:c.profile
}]));
export const BONDS=[
 {id:'ruan',name:'阮氏三雄',heroes:['ruanxiaoer','ruanxiaowu','ruanxiaoqi'],terrain:'water',stat:'attack',rate:.18},
 {id:'erlong',name:'二龙山聚义',heroes:['wusong','luzhishen','yangzhi'],terrain:'mountain',stat:'hp',rate:.18},
 {id:'spear',name:'禅杖枪林',heroes:['linchong','luzhishen'],stat:'defense',rate:.12},
 {id:'vanguard',name:'双锋开路',heroes:['yangzhi','suochao'],stat:'attack',rate:.10},
 {id:'marksmen',name:'神射浪子',heroes:['huarong','yanqing'],stat:'speed',rate:.12},
 {id:'sun',name:'登州兄弟',heroes:['sunli','sunxin'],stat:'hp',rate:.12},
 {id:'hunters',name:'解氏猎手',heroes:['jiezhen','jiebao'],terrain:'mountain',stat:'attack',rate:.18},
 {id:'river',name:'蛟龙白条',heroes:['lijun','zhangshun'],terrain:'water',stat:'attack',rate:.18},
 {id:'mystic',name:'三才奇阵',heroes:['zhuwu','fanrui','gongsunsheng'],stat:'strategy',rate:.18},
 {id:'cai',name:'蔡氏同心',heroes:['caifu','caiqing'],stat:'rage',rate:10},
 {id:'tong',name:'童氏双桨',heroes:['tongwei','tongmeng'],terrain:'water',stat:'speed',rate:.18},
 {id:'halberds',name:'双戟守门',heroes:['lvfang','guosheng'],stat:'defense',rate:.12}
];
export const DRILLS={assault:{name:'破阵专精',text:'带兵时攻击 +12%，防御 −8%。',attack:1.12,defense:.92},guard:{name:'守备专精',text:'带兵时防御 +15%，攻击 −6%。',attack:.94,defense:1.15}};
export const MECHANICS={
 ore:{name:'重甲矿道',terrain:'mountain',text:'重甲守军存活时，敌方承受普攻伤害 −25%；技能伤害不受此减伤。先集火守军或使用技能。'},
 manual:{name:'演武限时',terrain:'land',text:'须在 45 秒内击破敌阵，超时判负。保留足够输出，避免全程固守。',deadline:45000},
 stable:{name:'护送马队',terrain:'land',text:'马队耐久 100；每 6 秒每名存活敌人造成 12 点损耗。固守军令或收势固守可减半，耐久为 0 判负。',interval:6000},
 siege:{name:'寨门重甲',terrain:'land',text:'前 15 秒敌方承受普攻伤害 −35%；技能不受影响。用谋攻、破甲突破，或等待守势消退。'},
 convoy:{name:'粮车护运',terrain:'land',text:'粮车耐久 100；每 6 秒每名存活敌人造成 15 点损耗。固守军令或收势固守可减半，耐久为 0 判负。',interval:6000},
 tide:{name:'水泊潮汐',terrain:'water',text:'每 10 秒潮汐冲击我方，损失 5% 最大气血；水域专长好汉或收势固守减半。备好治疗。',interval:10000},
 fortress:{name:'连营补给',terrain:'forest',text:'每 12 秒敌军补给一次，为仍存活敌人恢复 8% 最大气血，最多三次。集火先击倒一人可减少恢复收益。',interval:12000}
};
export function battleTerrain(b){const c=b.context;if(c.type==='rotation')return MECHANICS[c.id]?.terrain||'land';if(c.terrain)return c.terrain;if(c.type==='camp')return c.id==='woods'?'forest':'land';if(c.type==='dungeon')return /jingyang|erli|mountain/.test(c.id)?'mountain':'land';return 'land';}
export const activeBonds=(team,terrain)=>BONDS.filter(g=>g.heroes.every(id=>team.includes(id))&&(!g.terrain||g.terrain===terrain));
