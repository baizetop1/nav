import {mentorshipPlan} from './mentorship.js?v=0.68.0';
import {away} from './progression-paths.js?v=0.68.0';
import {attributes} from './hero.js?v=0.68.0';
import {requireRule,journal} from './utils.js?v=0.68.0';
export function replacementQuote(s,d,from,to){
 const valid=d.by.heroes[from]&&d.by.heroes[to],reason=!valid?'请选择两位好汉':!s.team.includes(from)?'原好汉已不在出阵队伍':s.heroes[to].status!=='owned'?'接替者尚未入寨':s.team.includes(to)?'接替者已经在阵中':away(s,from)||away(s,to)?'须先接回外派或远征好汉':s.battle||s.scheme||s.event?'先结束当前交战或际遇':'';
 const moving=s.equipment.filter(e=>e.hero===from),types=new Set(moving.map(e=>d.by.equipments[e.item].type)),returned=s.equipment.filter(e=>e.hero===to&&types.has(d.by.equipments[e.item].type));
 const next=reason?null:{...s,team:s.team.map(id=>id===from?to:id),equipment:s.equipment.map(e=>moving.includes(e)?{...e,hero:to}:returned.includes(e)?{...e,hero:null}:e)};
 return {training:valid?mentorshipPlan(s,d,from,to):null,from,to,reason,moving,returned,next,before:valid?attributes(s,to,d):null,after:next?attributes(next,to,d):null,expected:JSON.stringify({from,to,team:s.team,equipment:s.equipment,heroes:valid?[s.heroes[from],s.heroes[to]]:[]})};
}
export function replaceHero(s,d,a){const q=replacementQuote(s,d,a.from,a.to);requireRule(!q.reason,q.reason);requireRule(a.expected===q.expected,'阵容或装备已改变，请重新预览');s.team=q.next.team;s.equipment=q.next.equipment;s.formationPending=true;journal(s,d.by.heroes[a.to].name+'接替'+d.by.heroes[a.from].name+'出阵，接过 '+q.moving.length+' 件装备；冲突装备 '+q.returned.length+' 件收回行囊。两人培养进度均保留。');}
