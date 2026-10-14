import {MINE_COMPANION_TASKS,mineCompanionTask} from './mine-companion-data.js?v=0.84.0';
import {knowHero,ownHero} from './hero.js?v=0.84.0';
import {requireRule,journal} from './utils.js?v=0.84.0';
export function mineCompanionAction(s,d,id){
 const reason=mineCompanionTask(s,id);requireRule(!reason,reason);
 s.exploration.flags.push(MINE_COMPANION_TASKS[id].flag);
 if(id==='liyun_meet'){knowHero(s,'liyun','known',d);journal(s,'李云拦住矿车：“先别进去。我是替人修屋的，路过看见梁头掉灰。你带我去塌过的那间，我看看。”');}
 if(id==='liyun_survey')journal(s,'李云蹲下量了梁脚，又敲敲裂口：“旧梁不能再用。换两根粗木，箍上铁，底下再垫实。木料我已托车夫送来，铁箍得请炉房那位帮忙。”');
 if(id==='liyun_hoops')journal(s,'汤隆看过短尺上的记号，夹起一截废车轴：“这个能用，别另买铁了。”两人比着梁宽打好铁箍。运木的车快到了，去运矿道接一程。');
 if(id==='liyun_brace')journal(s,'你扶住新梁，李云垫平地脚，汤隆把铁箍打紧。老杜推着空车来回试了两趟，梁上再没落灰。修架用的是刚送来的木料，行囊材料未扣。');
 if(id==='liyun_invite'){
  const owned=s.heroes.liyun.status==='owned';if(!owned)ownHero(s,'liyun',d);
  s.inventory.liyun_token=(s.inventory.liyun_token||0)+2;
  journal(s,owned?'李云收好短尺：“我既在寨里，往后就带人常来看看。”支架委托已办妥，李云信物 2 已收好。':'李云把短尺插回腰间：“寨里也缺修造的人吧？我跟你走。”李云入寨，信物 2 已收好，未消耗招贤令。');
  journal(s,'李云教会采集人手检查矿架，旧矿洞派遣每批碎铁 +1；已暂存的材料不补发。');
 }
}
