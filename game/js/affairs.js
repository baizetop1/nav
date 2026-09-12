import { hasOwn, requireRule, journal } from './utils.js?v=0.15.0';
import { grant } from './item.js?v=0.15.0';
export const AFFAIRS={
 caravan:{name:'商队来访',text:'行商带来一批铁料布匹，可以采购，也可派人护送换取酬谢。',cost:{silver:150},reward:{items:{iron:4,cloth:4}},dispatch:{items:{iron:3,cloth:3}}},
 refugees:{name:'流民投奔',text:'山下乡人请求安顿。开仓接济，或请一位好汉护送他们进寨。',cost:{food:30},reward:{prestige:15,items:{exp_pill:2}},dispatch:{prestige:10,items:{exp_pill:2}}},
 famine:{name:'粮仓告急',text:'邻村遭灾，粮道不畅。修整粮仓换取互助粮，也可派人外出筹粮。',cost:{wood:30,silver:80},reward:{food:65},dispatch:{food:40}},
 raiders:{name:'匪徒扰寨',text:'草寇在山路拦截乡人。可出资修固哨卡、派将清理，也可亲自出征。',cost:{wood:20,silver:100},reward:{prestige:12,items:{martial_pages:3}},dispatch:{prestige:8,items:{martial_pages:2}},battle:{prestige:20,items:{martial_pages:4}}}
};
export function openAffair(s){if(s.camp.work%3||s.affairs?.pending||s.affairs?.mission)return;s.affairs??={version:1,lastDay:0,pending:null,mission:null,resolved:0};if(s.affairs.lastDay>=s.camp.day)return;const kind=Object.keys(AFFAIRS)[(Math.floor(s.camp.work/3)-1)%4];s.affairs.lastDay=s.camp.day;s.affairs.pending={kind,day:s.camp.day};journal(s,'【寨中来报】'+AFFAIRS[kind].name+'，可回寨决定如何处理。');}
export function affairReward(s,r,d){for(const k of ['wood','food'])if(r[k])s.camp[k]=Math.min(10000000,s.camp[k]+r[k]);grant(s,{...r,wood:undefined,food:undefined},d);}
export function affairAction(s,d,a){const f=s.affairs;requireRule(f,'暂无待办寨事。');
 if(a.type==='affairCollect'){requireRule(f.mission&&s.clock>=f.mission.readyAt,'外派尚未归来。');const m=f.mission;affairReward(s,AFFAIRS[m.kind].dispatch,d);f.mission=null;f.resolved++;journal(s,'【外派归寨】'+d.by.heroes[m.hero].name+'办妥'+AFFAIRS[m.kind].name+'，酬谢已收好。');return;}
 requireRule(f.pending,'此事已经处理。');const p=f.pending,m=AFFAIRS[p.kind];
 if(a.choice==='dismiss'){f.pending=null;journal(s,'【寨事暂辞】'+m.name+'暂不受理，现有资源保留。');return;}
 if(a.choice==='supplies'){
  for(const [k,n] of Object.entries(m.cost))requireRule((k==='silver'?s.player[k]:s.camp[k])>=n,'处理寨事的物资不足。');
  for(const [k,n] of Object.entries(m.cost))if(k==='silver')s.player[k]-=n;else s.camp[k]-=n;
  affairReward(s,m.reward,d);f.resolved++;f.pending=null;journal(s,'【寨事办妥】'+m.name+'，物资与酬谢已结清。');return;
 }
 requireRule(a.choice==='dispatch','无效的寨事选择。');requireRule(s.heroes[a.hero]?.status==='owned'&&s.heroes[a.hero].level>=10,'外派需要一位已入寨且达到 10 级的好汉。');
 requireRule(!s.progress.flags['camp_steward_'+a.hero]&&!Object.values(s.frontier?.stations||{}).some(p=>p.worker==='hero:'+a.hero)&&!Object.values(s.frontier?.posts||{}).some(p=>p.guard===a.hero),'此人正在任职或驻守，请先撤下原职。');requireRule(s.camp.food>=10,'外派需要粮草 10。');
 s.camp.food-=10;s.team=s.team.filter(id=>id!==a.hero);f.mission={kind:p.kind,hero:a.hero,readyAt:s.clock+600000};f.pending=null;journal(s,'【外派】'+d.by.heroes[a.hero].name+'暂离阵容，10 分钟后回寨领取酬谢。');
}
export function finishAffairBattle(s,b,d){if(!b.context.affair||b.outcome!=='victory')return;const f=s.affairs;if(f?.pending?.kind==='raiders'&&f.pending.day===b.context.affair){affairReward(s,AFFAIRS.raiders.battle,d);f.pending=null;f.resolved++;journal(s,'【寨事亲征】匪患平息，乡人额外酬谢已入库。');}}
export function validateAffairs(s,check){const f=s.affairs;if(f===undefined)return;const int=(n,max=10000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 check(s.camp&&f&&f.version===1&&int(f.lastDay,s.camp.day)&&int(f.resolved),'寨事记录');check(!(f.pending&&f.mission),'寨事互斥');
 if(f.pending)check(hasOwn(AFFAIRS,f.pending.kind)&&int(f.pending.day,s.camp.day)&&f.pending.day>=1&&f.pending.day===f.lastDay,'待办寨事');else check(f.pending===null,'待办寨事');
 if(f.mission){const m=f.mission;check(hasOwn(AFFAIRS,m.kind)&&s.heroes[m.hero]?.status==='owned'&&int(m.readyAt,s.clock+600000)&&!s.team.includes(m.hero)&&!s.progress.flags['camp_steward_'+m.hero]&&!Object.values(s.frontier?.stations||{}).some(p=>p.worker==='hero:'+m.hero)&&!Object.values(s.frontier?.posts||{}).some(p=>p.guard===m.hero),'外派记录');}else check(f.mission===null,'外派记录');
 if(s.battle?.context.affair)check(f.pending?.kind==='raiders'&&f.pending.day===s.battle.context.affair&&s.battle.context.type==='camp'&&s.battle.context.id==='woods','寨事亲征来源');
}
