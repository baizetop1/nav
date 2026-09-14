export const FIFTH_MISSIONS={
 v5_probe:{level:24,hall:3,scale:3.3,terrain:'forest',stamina:12},
 v5_cut_east:{level:26,hall:3,scale:3.6,terrain:'land',stamina:12},
 v5_cut_west:{level:26,hall:3,scale:3.6,terrain:'forest',stamina:12},
 v5_second:{level:28,hall:3,scale:3.8,terrain:'land',stamina:14},
 v5_third:{level:30,hall:4,scale:4.5,terrain:'land',stamina:18}
};
export const fifthEnemyList=(s,id,enemies)=>id==='v5_third'&&s.progress.flags.v5_east_cut?enemies.filter(id=>id!=='v5_relief_rider'):enemies;
export function siegePreparation(s){return [
 {id:'v5_east_cut',map:'v5_east',name:'截断东援',done:!!s.progress.flags.v5_east_cut,effect:'内院敌军不再出现祝庄援骑'},
 {id:'v5_west_cut',map:'v5_west',name:'截住西粮',done:!!s.progress.flags.v5_west_cut,effect:'内院敌军最大气血、攻击各降低 10%'},
 {id:'v5_inside_support',map:'v5_refuge',name:'庄外济困',done:!!s.progress.flags.v5_inside_support,effect:'内院敌军防御降低 15%'}
 ];}
export function applySiegePreparation(s,b){if(b.context.id!=='v5_third')return;for(const u of b.enemy){if(s.progress.flags.v5_west_cut){u.maxHp=Math.round(u.maxHp*.9);u.hp=u.maxHp;u.attack=Math.round(u.attack*.9);}if(s.progress.flags.v5_inside_support)u.defense=Math.round(u.defense*.85);}for(const p of siegePreparation(s))b.log.push('【攻庄准备】'+p.name+' · '+(p.done?p.effect:'尚未完成，本项未生效')+'。');}
export function hasFifthVolume(s){return !!s.progress.flags.volume_five_complete||Object.keys(s.progress.flags).some(id=>id.startsWith('v5_')&&s.progress.flags[id])||s.progress.visited.some(id=>id.startsWith('v5_'))||Object.keys(s.progress.stories).some(id=>id.startsWith('v5_'))||s.battle?.context.id?.startsWith('v5_')||s.lastBattle?.context.id?.startsWith('v5_');}
