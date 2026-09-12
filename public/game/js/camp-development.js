import { helperBonus } from './helpers.js?v=0.12.0';
import { requireRule, journal, random, pick } from './utils.js?v=0.12.0';
import { gainExp } from './hero.js?v=0.12.0';
import { grant, newEquipment } from './item.js?v=0.12.0';

export const DUTIES={
  balanced:{name:'各司其职',description:'木粮银均衡生产。'},
  wood:{name:'集中伐木',description:'木材增产 75%，粮草与碎银减半。'},
  food:{name:'开仓备粮',description:'粮草增产 75%，木材与碎银减半。'},
  silver:{name:'赶集通商',description:'碎银增产 75%，木材与粮草减半。'},
};
const talents={wood:['wusong','linchong','luzhishen','liutang','yangzhi'],food:['baisheng','ruanxiaoqi','gongsunsheng'],silver:['wuyong','songjiang','chaijin','yanqing','huarong','shiqian']};
const rosterTalents={"songjiang":"silver","lujunyi":"wood","wuyong":"silver","gongsunsheng":"silver","guansheng":"wood","linchong":"wood","qinming":"wood","huyanzhuo":"wood","huarong":"food","chaijin":"silver","liying":"food","zhutong":"wood","luzhishen":"wood","wusong":"wood","dongping":"wood","zhangqing":"food","yangzhi":"wood","xuning":"wood","suochao":"wood","daizong":"food","liutang":"wood","likui":"wood","shijin":"wood","muhong":"wood","leiheng":"wood","lijun":"wood","ruanxiaoer":"wood","zhangheng":"wood","ruanxiaowu":"wood","zhangshun":"food","ruanxiaoqi":"wood","yangxiong":"wood","shixiu":"wood","jiezhen":"food","jiebao":"food","yanqing":"food","zhuwu":"silver","huangxin":"wood","sunli":"wood","xuanzan":"wood","haosiwen":"wood","hantao":"wood","pengqi":"wood","shantinggui":"silver","weidingguo":"silver","xiaorang":"silver","peixuan":"silver","oupeng":"wood","dengfei":"wood","yanshun":"wood","yanglin":"food","lingzhen":"silver","jiangjing":"silver","lvfang":"wood","guosheng":"wood","andaoquan":"silver","huangfuduan":"silver","wangying":"wood","husanniang":"food","baoxu":"wood","fanrui":"silver","kongming":"wood","kongliang":"wood","xiangchong":"wood","ligun":"wood","jindajian":"silver","malin":"wood","tongwei":"food","tongmeng":"wood","mengkang":"silver","houjian":"silver","chenda":"wood","yangchun":"wood","zhengtianshou":"food","taozongwang":"wood","songqing":"silver","yuehe":"silver","gongwang":"food","dingdesun":"food","muchun":"wood","caozheng":"wood","songwan":"wood","duqian":"wood","xueyong":"wood","shien":"wood","lizhong":"wood","zhoutong":"wood","tanglong":"silver","duxing":"silver","zouyuan":"wood","zourun":"wood","zhugui":"food","zhufu":"silver","caifu":"wood","caiqing":"food","lili":"food","liyun":"wood","jiaoting":"wood","shiyong":"wood","sunxin":"wood","gudasao":"wood","zhangqing_gardener":"wood","sunerniang":"food","wangdingliu":"food","yubaosi":"wood","baisheng":"silver","shiqian":"food","duanjingzhu":"food"};
export const stewardship=id=>Object.keys(talents).find(k=>talents[k].includes(id))||rosterTalents[id]||'food';
export const steward=s=>Object.keys(s.heroes).find(id=>s.heroes[id].status==='owned'&&s.progress.flags['camp_steward_'+id]);
export function dutyQuote(s,mode='balanced'){
  requireRule(Object.hasOwn(DUTIES,mode),'没有这项寨务。');
  const c=s.camp,id=steward(s),specialty=id&&stewardship(id),bonus=helperBonus(s);
  const base={wood:10+c.buildings.lumber*18,food:8+c.buildings.farm*20,silver:15+c.buildings.market*35};
  return Object.fromEntries(Object.entries(base).map(([key,value])=>[key,Math.floor(value*(mode==='balanced'?1:mode===key?1.75:.5)*(specialty===key?1.2:1))+bonus[key]]));
}
export function finishDuty(s,d,mode){
  const q=dutyQuote(s,mode),id=steward(s);s.camp.wood+=q.wood;s.camp.food+=q.food;s.player.silver+=q.silver;
  if(id)gainExp(s,id,25,d);
  journal(s,`【寨务第 ${s.camp.day} 日 · ${DUTIES[mode].name}】木材 +${q.wood}、粮草 +${q.food}、碎银 +${q.silver}。${id?d.by.heroes[id].name+'主持寨务，历练 +25。':''}`);
}
export const CAMP_GOALS=[
  {id:'foundation',name:'安居立业',requirements:[['修建农田',s=>s.camp.buildings.farm>=1],['修建伐木场',s=>s.camp.buildings.lumber>=1],['修建兵营',s=>s.camp.buildings.barracks>=1]],reward:{wood:40,food:30,silver:100}},
  {id:'first_win',name:'初战扬名',requirements:[['赢得一场寨务出征',s=>s.camp.sorties>=1]],reward:{wood:45,silver:150,items:{exp_pill:2}}},
  {id:'supply',name:'寨中有序',requirements:[['聚义厅达到 2 级',s=>s.camp.buildings.hall>=2],['建成医馆',s=>s.camp.buildings.clinic>=1],['建成集市',s=>s.camp.buildings.market>=1]],reward:{food:60,silver:200,items:{martial_pages:3}}},
  {id:'convoy',name:'粮道畅通',requirements:[['胜利护送粮队一次',s=>(s.stats.camp_win_convoy||0)>=1]],reward:{wood:60,food:50,items:{exp_pill:3,martial_pages:2}}},
  {id:'fort',name:'威震山林',requirements:[['攻下匪寨一次',s=>(s.stats.camp_win_fort||0)>=1]],reward:{wood:80,silver:350,items:{exp_pill:4,martial_pages:5}}},
];
export const goalClaimed=(s,g)=>!!s.progress.flags['camp_goal_'+g.id];
export const goalReady=(s,g)=>g.requirements.every(([,test])=>test(s));
export function developmentAction(s,d,a){
  if(a.type==='campSteward'){
    requireRule(a.id===null||s.heroes[a.id]?.status==='owned','只能委派已入寨的好汉。');
    for(const id of Object.keys(s.heroes))delete s.progress.flags['camp_steward_'+id];
    if(a.id)s.progress.flags['camp_steward_'+a.id]=true;
    journal(s,a.id?`【寨务主事】${d.by.heroes[a.id].name}领命。经营时擅长物资增产 20%，本人获得 25 历练；仍可随队出征。`:'寨务改由乡人主持。');
  }else{
    const g=CAMP_GOALS.find(g=>g.id===a.id);requireRule(g&&!goalClaimed(s,g)&&goalReady(s,g),'阶段目标尚未达成，或奖励已领取。');
    s.progress.flags['camp_goal_'+g.id]=true;s.camp.wood+=g.reward.wood||0;s.camp.food+=g.reward.food||0;grant(s,g.reward,d);
    journal(s,`【建寨目标】${g.name}达成，乡人送来物资相助。`);
  }
}
export const RAID_INTEL={
  woods:{tactic:'balanced',attack:1.15,defense:1.1,loss:1,text:'山路伏兵分散，稳住阵脚逐个清剿。',bonus:'稳扎稳打：本战额外攻击 +15%、防御 +10%。'},
  convoy:{tactic:'guard',attack:1,defense:1.2,loss:.65,text:'匪徒夹击粮队，护住辎重才能少伤人。',bonus:'结阵固守：本战额外防御 +20%，伤兵计算比例降低 35%。'},
  fort:{tactic:'assault',attack:1.2,defense:1,loss:1,text:'匪首据险固守，集中攻势击破守军。',bonus:'强攻破阵：本战额外攻击 +20%，仍承担强攻的防御代价。'},
};
export function raidBonus(b){const i=b.context.type==='camp'&&RAID_INTEL[b.context.id];return i&&i.tactic===b.expedition?.tactic?i:{attack:1,defense:1,loss:1};}
export const EQUIPMENT_DROP_RATE=.25;
export function equipmentPool(d,tier){return d.equipments.filter(e=>e.tier===Math.min(3,tier));}
export function searchEquipment(s,d,tier){
  if(random(s)>=EQUIPMENT_DROP_RATE){journal(s,'【战后搜获】本次未找到完好的装备。');return;}
  const e=pick(s,equipmentPool(d,tier));
  if(s.equipment.length>=200){grant(s,{items:{scrap_iron:e.tier*2}},d);journal(s,`【战后搜获】找到${e.quality}·${e.name}；装备已满，折为碎铁 ${e.tier*2}。`);}
  else{newEquipment(s,e.id);journal(s,`【战后搜获】获得${e.quality}·${e.name}，可在行囊中交给好汉。`);}
}
