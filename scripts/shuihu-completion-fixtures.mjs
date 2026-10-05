import {d,fixture,act,win,walk} from './shuihu-campaign-fixtures.mjs';
import {gatheringStart} from './shuihu-gathering-fixtures.mjs';
import {journeyMoment} from '../public/game/js/journey-scenes.js';
export function schemeFixture(success=true){
 let s=gatheringStart();s=act(s,'mapAction',{id:'rumor_dongxi'});s=act(s,'travel',{id:'zhuang'});
 for(let i=0;i<4;i++){const c=journeyMoment(s,d).actions[0].command;s=act(s,c.type,c);}
 s=act(s,'travel',{id:'ridge'});s=act(s,'startScheme');
 for(const id of success?['original','original','original','wait','finish']:['early','early'])s=act(s,'scheme',{id});return s;
}
export function completionFixtures(){
 let trek=act(fixture(),'trekStart');while(trek.realm.trek.node<5)trek=win(act(trek,'trekNode',{kind:trek.realm.trek.node===4?'boss':'fight'}));
 const journey=walk(act(fixture(),'journeyStart',{region:'forest',tier:1,goal:'practice'}));
 let defense=act(fixture(),'ventureStart',{kind:'defense',layout:'reserve'});while(defense.expansion.run.stage<3)defense=win(act(defense,'ventureNext'));
 let relay=act(fixture(81,40),'ventureStart',{kind:'relay'});for(const id of ['linchong','wangjin','shiqian'])relay=win(act(act(relay,'team',{ids:[id]}),'ventureNext'));
 let squad=act(fixture(),'squadSend',{id:'escort',team:['shiqian'],troops:0});squad.clock=squad.realm.squad.readyAt;squad=act(squad,'refresh');
 let affair=fixture();for(let i=0;i<3;i++)affair=act(affair,'campWork');affair=act(affair,'affairChoice',{choice:'dispatch',hero:'shiqian'});affair.clock=affair.affairs.mission.readyAt;affair=act(affair,'refresh');
 return {schemeSuccess:schemeFixture(),schemeFailure:schemeFixture(false),trek,journey,defense,relay,squad,affair};
}
