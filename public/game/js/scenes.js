import {SCENE_LIBRARY} from './scene-library.js?v=0.68.0';
// Scene presentation is derived from existing saves; looking and talking never grants rewards.
import {deployedTroops} from './logistics.js?v=0.68.0';
export const SCENE_ART=Object.fromEntries(Object.entries(SCENE_LIBRARY).map(([id,art])=>[id,art.src]));
const present=(s,id)=>s.heroes[id]?.status==='owned'&&s.affairs?.mission?.hero!==id&&!s.realm?.squad?.team.includes(id)&&!s.realm?.trek?.team.includes(id)&&!s.expansion?.run?.team.includes(id);
export const woodlandReport=s=>s.lastBattle?.context.type==='camp'&&s.lastBattle.context.id==='woods'?s.lastBattle:null;
export function campScene(s,request={}){
 const place=request.place==='woods'?'woods':'gate',topic=['road','camp','tracks'].includes(request.topic)?request.topic:'arrival';
 const repaired=!!s.camp&&s.camp.buildings.hall>=2&&s.camp.buildings.lumber>=1,hour=new Date(s.clock+8*3600000).getUTCHours(),time=hour<6||hour>=19?'night':hour>=16?'evening':'day';
 const person=['baisheng','duqian','songwan'].find(id=>present(s,id))||null,report=woodlandReport(s),n=deployedTroops(s),food=8+Math.ceil(n/2);
 const busy=s.battle||s.scheme||s.event;
 const reason=!s.camp?'先建立寨子。':busy?'先结束当前交战或际遇。':!s.team.length?'先安排出阵好汉。':s.player.stamina<8?'体力不足，需要 8 点。':s.camp.mode==='army'&&!n?'没有可出征乡勇，可先募兵或选择英雄独行。':s.camp.food<food?'粮草不足，需要 '+food+'。':'';
 let text=person==='duqian'?'寨门有人守着。你若出门，把同行的人点齐。':person==='songwan'?'我看着寨门。你们出门，别落下人。':'山路上又有人拦车。修寨的木料还得从那边运。';
 let caption=time==='night'?'门房还亮着灯，水边已没人走动。':time==='evening'?'日头落到水面，扛木料的人正在收工。':'水边有人撑船，门内传来劈柴声。';
 if(repaired)caption='寨门换了新木，旧木料已归到棚下。';
 if(report){if(report.outcome==='victory')text=report.fallen?'木料收好了。阵亡的 '+report.fallen+' 人，名字也记下了。':report.wounded?'木料卸在门边了。先安顿伤着的 '+report.wounded+' 人。':'木料已经卸下。都回来了就好，先歇歇。';else text=report.outcome==='retreat'?'回来了就好。林口那伙人还在，换好人手再去。':'先坐下喘口气。药和人手备齐了，再去不迟。';caption='上次山林出征：'+({victory:'得胜',retreat:'撤回',defeat:'失利'})[report.outcome]+'。';}
 if(s.camp?.wounded)text='医馆那边还有 '+s.camp.wounded+' 个伤兵。先照看他们，出征不急。';
 if(topic==='camp')text=!s.camp?.buildings.lumber?'木料不够，先把伐木场搭起来。总去山里抢，也不是长久办法。':!repaired?'伐木的人已经开工。攒够木料和银子，再扩建聚义厅。':'门修好了，活儿还多着呢。田里、木场，都等着安排人手。';
 if(topic==='road')text=person==='songwan'?'从门前小路上山，过了倒车的地方就是林口。先看清有几个人。':person==='duqian'?'车辙到林口就断了。别急着追，先把人和粮点一遍。':'顺着车辙往上走。见着那辆倒车就放慢些，匪徒藏在林口。';
 if(place==='woods'){caption='寨外山路 · 林口';text=topic==='tracks'?'泥里几道脚印绕到林口，草后露着一截刀鞘。人还没走。':'车倒在路边，散落的筐子还没被人捡走。再往前就是林口。';}
 return {place,topic,repaired,time,person:place==='gate'?person:null,report,art:place==='woods'?SCENE_ART.woods:repaired?SCENE_ART.repaired:SCENE_ART.gate,title:place==='woods'?'林口山路':'白泽寨门',caption,text,reason,food,troops:n};
}
export function sceneReturn(b){return b?.context.type==='camp'&&b.context.id==='woods'?{title:'寨门有人候着',label:'回寨看看',command:{type:'ui_scene',place:'gate'}}:null;}
