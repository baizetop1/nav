import {CHAPTER_MISSIONS} from './volume-three-data.js?v=0.58.0';
export {ENDING_DEFINITIONS} from './late-mainline-data.js?v=0.58.0';
export const replayId=id=>typeof id==='string'?id.replace(/^echo_/,''):'';
export const REPLAY_DIFFICULTIES={1:{name:'温习',scale:.65},2:{name:'实战',scale:1}};
export const replayMissions=CHAPTER_MISSIONS;
export const replayUnlocked=(s,id)=>!!CHAPTER_MISSIONS[id]&&(s.progress.stories[id]?.status==='completed'||!!s.progress.flags.volume_twelve_complete&&/^v12_(stay|sea|return)_(first|second|third)$/.test(id));
export function validReplayContext(c){return !!c&&c.type==='replay'&&typeof c.id==='string'&&c.id.startsWith('echo_')&&Object.hasOwn(CHAPTER_MISSIONS,replayId(c.id))&&[1,2].includes(c.tier)&&c.terrain===CHAPTER_MISSIONS[replayId(c.id)].terrain&&Object.keys(c).length===4;}
export const replayKey=(id,tier)=>id+'_'+tier;
