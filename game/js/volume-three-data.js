import { SIXTH_MISSIONS } from './volume-six-data.js?v=0.28.0';
import { FIFTH_MISSIONS } from './volume-five-data.js?v=0.28.0';
import { FOURTH_MISSIONS } from './volume-four-data.js?v=0.28.0';
import { hasOwn } from './utils.js?v=0.28.0';
export const CHAPTER_MISSIONS={...FOURTH_MISSIONS,...FIFTH_MISSIONS,...SIXTH_MISSIONS,
 v3_grain:{level:10,scale:1.35,terrain:'land',stamina:8},
 v3_timber:{level:10,scale:1.3,terrain:'forest',stamina:8},
 v3_ferry:{level:12,scale:1.8,terrain:'water',stamina:10,intel:true},
 v3_defense:{level:15,scale:2.4,terrain:'land',stamina:12,intel:true},
 v3_veteran:{level:30,scale:8,terrain:'land',stamina:20,intel:true}
};
export const isChapterBattle=b=>b?.context?.type==='story'&&hasOwn(CHAPTER_MISSIONS,b.context.id);
