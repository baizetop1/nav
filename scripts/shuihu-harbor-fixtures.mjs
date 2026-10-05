import {gatheringStart} from './shuihu-gathering-fixtures.mjs';import {act} from './shuihu-campaign-fixtures.mjs';
export function harborStart(ready=false){
 let s=gatheringStart();s=act(s,'mapAction',{id:'rumor_dongxi'});s=act(s,'travel',{id:'zhuang'});for(const choice of [undefined,'join','return','pledge'])s=act(s,'story',{id:'seven_stars_story',...(choice?{choice}:{})});s=act(s,'travel',{id:'ridge'});s=act(s,'startScheme');for(const id of ['original','original','original','wait','finish'])s=act(s,'scheme',{id});s=act(s,'finishScheme');s=act(s,'travel',{id:'liangshan'});
 // Isolated test fixture for the chapter threshold, not a gameplay shortcut.
 if(ready){for(const id of ['shiqian','duqian'])s.heroes[id].status='owned';s.stats.clears=10;s.player.prestige=150;s=act(s,'move',{id:'ferry'});s=act(s,'move',{id:'liangshan'});}
 return s;
}
