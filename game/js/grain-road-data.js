export const GRAIN_ROUTES={
 escort:{id:'grain_escort',name:'护送粮商',enemy:['bandit','bandit'],scale:.9,food:6,stamina:6,reward:180,income:24,trust:2,terrain:'land',text:'先护住粮车。货物保得越完整，商人交付的粮食越多。',result:'粮商认下了这条路，答应定期运粮进寨。'},
 scout:{id:'grain_scout',name:'探明山路再剿匪',enemy:['bandit','bandit_chief'],scale:1,food:8,stamina:6,reward:210,income:18,trust:1,terrain:'forest',text:'先派人探路，再绕过寨前的伏兵。准备多一步，敌军攻势较弱。',result:'侧路伏兵已被拔掉，附近村庄恢复向寨中送粮。'},
 assault:{id:'grain_assault',name:'直接攻打匪寨',enemy:['bandit','bandit_chief'],scale:1.5,food:10,stamina:6,reward:260,income:12,trust:0,terrain:'land',text:'不作侦察，直接攻寨。前十五秒寨门抵挡普攻，适合用招式攻坚。',result:'匪寨的存粮被运回来了。商人还在观望，目前只有少量粮车往来。'}
};
export const grainRoute=id=>Object.entries(GRAIN_ROUTES).find(([,m])=>m.id===id)?.[0];
export const GRAIN_RAIDS=Object.fromEntries(Object.values(GRAIN_ROUTES).map(m=>[m.id,{...m,campaign:true,level:1,wood:0,silver:0,exp:120,description:m.text}]));
export const GRAIN_SCOUTS=['baisheng','shiqian','daizong','jiezhen','jiebao'];
export const GRAIN_INVESTMENTS={granary:{name:'扩建路边粮仓',wood:30,silver:60,text:'此粮路每日供粮增加 12，离线最多积存三天。'},infirmary:{name:'设立路边救护站',wood:30,silver:60,text:'每满一天随粮队接回最多 5 名伤兵，免费归队，离线最多积存三天。'}};
export const grainIncome=s=>s.grainRoad?.won?GRAIN_ROUTES[s.grainRoad.route].income+(s.grainRoad.investment==='granary'?12:0):0;
export function grainDelivery(s){const x=s.grainRoad,days=x?.won?Math.min(3,Math.floor(Math.max(0,s.clock-x.lastAt)/86400000)):0;return {days,food:days*grainIncome(s),healed:x?.investment==='infirmary'?Math.min(s.camp?.wounded||0,days*5):0};}
