import {REPLAY_CHALLENGES} from './replay-challenges.js?v=0.64.0';
import {CHAPTER_MISSIONS} from './volume-three-data.js?v=0.64.0';
export {ENDING_DEFINITIONS} from './late-mainline-data.js?v=0.64.0';
export const replayId=id=>typeof id==='string'?id.replace(/^echo_/,''):'';
export const REPLAY_DIFFICULTIES={1:{name:'温习',scale:.65},2:{name:'实战',scale:1}};
export const replayMissions=CHAPTER_MISSIONS;
export const replayUnlocked=(s,id)=>!!CHAPTER_MISSIONS[id]&&(s.progress.stories[id]?.status==='completed'||!!s.progress.flags.volume_twelve_complete&&/^v12_(stay|sea|return)_(first|second|third)$/.test(id));
export function validReplayContext(c){return !!c&&c.type==='replay'&&typeof c.id==='string'&&c.id.startsWith('echo_')&&Object.hasOwn(CHAPTER_MISSIONS,replayId(c.id))&&[1,2].includes(c.tier)&&c.terrain===CHAPTER_MISSIONS[replayId(c.id)].terrain&&Object.keys(c).length===(c.challenge===undefined?4:5)&&Object.keys(c).every(k=>['type','id','tier','terrain','challenge'].includes(k))&&(c.challenge===undefined||c.tier===2&&Object.hasOwn(REPLAY_CHALLENGES,c.challenge));}
export const replayKey=(id,tier)=>id+'_'+tier;
