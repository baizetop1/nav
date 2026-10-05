import {d,act} from './shuihu-campaign-fixtures.mjs';
import {newGame} from '../public/game/js/core.js';
import {battleStep} from './shuihu-battle-test-helpers.mjs';
export function gatheringStart(){
 let s=act(newGame(d,Date.now(),12345),'campFound');s=act(s,'travel',{id:'inn'});s=act(s,'story',{id:'wusong_story'});s=act(s,'story',{id:'wusong_story',choice:'introduce'});s=act(s,'travel',{id:'drywood'});s=act(s,'mapAction',{id:'tracks'});s=act(s,'travel',{id:'tracks'});s=act(s,'mapAction',{id:'follow'});s=act(s,'travel',{id:'deepforest'});s=act(s,'story',{id:'wusong_story',choice:'battle'});for(let i=0;i<400&&!s.battle.outcome;i++)s=battleStep(d,s);if(s.battle.outcome!=='victory')throw Error('Opening fixture did not win');s=act(s,'finishBattle');s=act(s,'story',{id:'wusong_story',choice:'finish'});s=act(s,'travel',{id:'tavern'});return s;
}
