export const hasCasualtyProgress=s=>s.camp?.casualtyCarry!==undefined||s.battle?.expedition?.casualtyRules!==undefined;
export const casualtyProgressPreserved=(before,after)=>(!hasCasualtyProgress(before)||hasCasualtyProgress(after))&&(before.camp?.casualtyCarry===undefined||after.camp?.casualtyCarry!==undefined);
