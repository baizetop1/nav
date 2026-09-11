import { requireRule, journal, count } from './utils.js?v=0.5.0';
import { ownHero } from './hero.js?v=0.5.0';
import { startBattle } from './battle.js?v=0.5.0';
import { grant } from './item.js?v=0.5.0';

export const BUILDINGS={hall:{name:'聚义厅',wood:40,silver:100,description:'提高寨子规模，吸引更多好汉。'},farm:{name:'农田',wood:25,silver:60,description:'每次经营产出粮草，用于募兵与出征。'},lumber:{name:'伐木场',wood:20,silver:50,description:'每次经营产出木材，用于修建与扩建。'},barracks:{name:'兵营',wood:35,silver:80,description:'每级提供 20 名兵额，可随英雄出征。'},clinic:{name:'医馆',wood:30,silver:80,description:'治疗伤兵，降低补员的粮草支出。'},market:{name:'集市',wood:30,silver:80,description:'每次经营增加碎银收入。'}};
export const TACTICS={balanced:{name:'稳扎稳打',attack:1,defense:1,loss:.12},assault:{name:'强攻破阵',attack:1.2,defense:.85,loss:.24},guard:{name:'结阵固守',attack:.9,defense:1.25,loss:.06}};
export const RAIDS={woods:{name:'山林清剿',enemy:['bandit'],scale:.7,level:1,food:8,wood:24,silver:90,exp:100,description:'清除山林匪徒，取回修寨木料。'},convoy:{name:'护送粮队',enemy:['bandit','bandit'],scale:1,level:2,food:12,wood:15,silver:160,exp:170,description:'保住运粮队，补充粮草与碎银。'},fort:{name:'攻打匪寨',enemy:['bandit','bandit_chief'],scale:1.4,level:3,food:18,wood:45,silver:280,exp:280,description:'强敌守寨，适合培养英雄后带兵攻打。'}};
export const freshCamp=()=>({version:1,day:1,wood:110,food:100,troops:0,wounded:0,buildings:{hall:1,farm:0,lumber:0,barracks:0,clinic:0,market:0},mode:'army',tactic:'balanced',deployment:10,work:0,sorties:0});
export function buildingQuote(c,id){const b=BUILDINGS[id],lv=c.buildings[id];return {wood:b.wood*(lv+1),silver:b.silver*(lv+1)};}
export function campAction(s,d,a){
  if(a.type==='campFound'){requireRule(!s.camp,'寨子已经建立。');s.camp=freshCamp();if(s.heroes.baisheng.status!=='owned')ownHero(s,'baisheng',d);journal(s,'【立寨】白胜领乡人搭起聚义厅。先修农田、伐木场，再建兵营；经营与出征都由你安排。');return;}
  const c=s.camp;requireRule(c,'请先建立寨子。');
  if(a.type==='campBuild'){
    requireRule(Object.hasOwn(BUILDINGS,a.id),'没有这项设施。');const lv=c.buildings[a.id],q=buildingQuote(c,a.id);requireRule(lv<5,'设施已满级。');requireRule(a.id==='hall'||lv<c.buildings.hall,'先扩建聚义厅。');
    requireRule(c.wood>=q.wood&&s.player.silver>=q.silver,'木材或碎银不足，先经营或出征。');c.wood-=q.wood;s.player.silver-=q.silver;c.buildings[a.id]++;journal(s,`【营建】${BUILDINGS[a.id].name}升至 ${lv+1} 级。`);
  }else if(a.type==='campWork'){
    requireRule(s.player.stamina>=5,'经营需要 5 点体力。');s.player.stamina-=5;c.day++;c.work++;
    const wood=10+c.buildings.lumber*18,food=8+c.buildings.farm*20,silver=15+c.buildings.market*35;c.wood+=wood;c.food+=food;s.player.silver+=silver;journal(s,`【寨务第 ${c.day} 日】木材 +${wood}、粮草 +${food}、碎银 +${silver}。`);
  }else if(a.type==='campRecruit'){
    requireRule(c.buildings.barracks>0,'先建造兵营。');const n=Math.min(10,c.buildings.barracks*20-c.troops-c.wounded);requireRule(n>0,'兵额已满，可扩建兵营或治疗伤兵。');requireRule(c.food>=n*2&&s.player.silver>=n*3,'募兵需要每人粮草 2、碎银 3。');c.food-=n*2;s.player.silver-=n*3;c.troops+=n;journal(s,`【募兵】${n} 名乡勇入营。`);
  }else if(a.type==='campHeal'){
    requireRule(c.buildings.clinic>0&&c.wounded>0,'需要医馆和待治伤兵。');const n=Math.min(c.wounded,5*c.buildings.clinic);requireRule(c.food>=n,'治疗需要每人粮草 1。');c.food-=n;c.wounded-=n;c.troops+=n;journal(s,`【医馆】${n} 名伤兵归队。`);
  }else if(a.type==='campFormation'){
    requireRule(['solo','army'].includes(a.mode)&&Object.hasOwn(TACTICS,a.tactic)&&Number.isInteger(a.deployment)&&a.deployment>=1&&a.deployment<=100,'出征配置无效。');c.mode=a.mode;c.tactic=a.tactic;c.deployment=a.deployment;journal(s,'出征配置已保存：'+(c.mode==='solo'?'英雄独行':'英雄带兵')+' · '+TACTICS[c.tactic].name+'。');
  }else if(a.type==='campInvite'){
    const h=d.by.heroes[a.id];requireRule(h&&s.heroes[a.id].status!=='owned','这位好汉已入寨。');requireRule(c.buildings.hall>=Math.max(1,h.star-2)&&c.work+c.sorties>=h.star,'寨子规模或经营历练不足。');const price=h.star*120;requireRule(s.player.silver>=price,'迎贤碎银不足。');s.player.silver-=price;ownHero(s,a.id,d);journal(s,`【迎贤】${h.name}听闻寨中气象，前来共举义事。`);
  }else if(a.type==='campRaid'){
    const r=RAIDS[a.id];requireRule(r&&c.buildings.hall>=r.level,'先提高聚义厅等级。');requireRule(s.team.length>0,'先安排出阵英雄。');requireRule(s.player.stamina>=8,'出征需要 8 点体力。');const n=c.mode==='army'?Math.min(c.troops,c.deployment):0;requireRule(c.mode==='solo'||n>0,'没有可出征乡勇，可先募兵或选择英雄独行。');const food=r.food+Math.ceil(n/2);requireRule(c.food>=food,'出征粮草不足。');c.food-=food;s.player.stamina-=8;
    startBattle(s,d,{enemies:r.enemy,scale:r.scale,context:{type:'camp',id:a.id}});attachTroops(s,n);
  }else throw new Error('未知寨务。');
}
export function attachTroops(s,n){
  const c=s.camp,b=s.battle;if(!c||!b||b.guest)return;const t=TACTICS[c.tactic];b.expedition={troops:n,tactic:c.tactic};
  for(const u of b.team){const share=n/b.team.length;u.attack=Math.round((u.attack+share*3)*t.attack);u.defense=Math.round((u.defense+share)*t.defense);u.hp=u.maxHp=Math.round(u.maxHp+share*18);}
  b.log.push(`【军令】${n?'乡勇 '+n+' 人随行':'英雄独行'} · ${t.name}。`);
}
export function settleCampBattle(s,d,b){
  const c=s.camp;if(!c)return;
  if(b.expedition){const n=b.expedition.troops;const ratio=b.team.reduce((sum,u)=>sum+u.hp/u.maxHp,0)/b.team.length;const loss=Math.min(n,Math.ceil(n*(TACTICS[b.expedition.tactic].loss+(1-ratio)*.2+(b.outcome==='victory'?0:.2))));c.troops-=loss;c.wounded+=loss;journal(s,`【收兵】${n-loss} 人安然归营，伤兵 ${loss} 人，可到医馆治疗。`);}
  if(b.context.type==='camp'&&b.outcome==='victory'){const r=RAIDS[b.context.id];c.sorties++;c.wood+=r.wood;c.food+=b.context.id==='convoy'?55:15;grant(s,{silver:r.silver,merit:8,exp:r.exp,items:{exp_pill:1,martial_pages:1}},d);count(s,'campWins');journal(s,`【回寨战果】木材 +${r.wood}、粮草 +${b.context.id==='convoy'?55:15}、碎银 +${r.silver}、经验丹 +1、武学残页 +1。`);}
}
export function validateCamp(s,check){
  if(s.camp===undefined)return;const c=s.camp,num=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
  check(c&&c.version===1&&c.buildings&&Object.keys(c.buildings).length===6,'寨子');for(const id of Object.keys(BUILDINGS))check(num(c.buildings[id],5)&&(id!=='hall'||c.buildings[id]>=1),'设施等级');
  for(const k of ['day','wood','food','troops','wounded','work','sorties'])check(num(c[k]),'寨务资源');check(c.troops+c.wounded<=c.buildings.barracks*20,'兵额');check(['solo','army'].includes(c.mode)&&Object.hasOwn(TACTICS,c.tactic)&&num(c.deployment,100)&&c.deployment>=1,'军令');
  if(s.battle?.expedition){const e=s.battle.expedition;check(num(e.troops,100)&&e.troops<=c.troops&&Object.hasOwn(TACTICS,e.tactic)&&!s.battle.guest,'出征兵力');}
}
