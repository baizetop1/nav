import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {data,fixture,cases,exercise,digest,advance,withoutLog} from './shuihu-skill-log-fixtures.mjs';
import {castSkill,advanceBattle,setBattleSkillMode,addStatus,skillReason} from '../public/game/js/battle.js';
import {skillEffectLog} from '../public/game/js/battle-log-format.js';
import {parseSave} from '../public/game/js/save.js';
import {exportSave,importSave} from '../public/game/js/portable.js';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/shuihu-skill-log-baseline.json',import.meta.url),'utf8'));
let checked=0;
for(const row of cases()){
 const {state,castLogs}=exercise(row);
 assert.equal(digest(state),baseline.records[row.key],row.key+' changes combat beyond log text');
 assert.ok(castLogs.some(line=>line.includes(row.hero.name)&&line.includes('【'+row.skill.name+'】')),row.key+' must identify the real actor and skill');
 assert.deepEqual(parseSave(JSON.stringify(state),data),state,row.key+' round trip');checked++;
}
assert.equal(checked,Object.keys(baseline.records).length);
const active=(id,name)=>{const s=fixture([id,'wusong']);const start=s.battle.log.length;castSkill(s,data,id,name);return {s,logs:s.battle.log.slice(start)};};
const protectedParty=active('luzhishen','luzhishen_advanced');
for(const status of ['嘲讽','护阵'])assert.ok(protectedParty.logs.some(t=>t.includes(status)&&t.includes('鲁智深')&&t.includes(data.by.skills.luzhishen_advanced.name)));
assert.ok(protectedParty.logs.some(t=>t.includes('武松获得【护阵')&&t.includes('鲁智深')),'The recipient and source are distinct');
const purify=active('gongsunsheng','gongsunsheng_advanced');assert.ok(purify.logs.some(t=>t.includes('负面状态已清除')&&t.includes('公孙胜')&&t.includes(data.by.skills.gongsunsheng_advanced.name)));
assert.ok(!purify.s.battle.team[1].statuses.some(t=>t.id==='poison'));
const rally=active('songjiang','songjiang_advanced');assert.ok(rally.logs.some(t=>t.includes('怒气 +')&&t.includes('宋江')&&t.includes(data.by.skills.songjiang_advanced.name)));
const combo=active('wusong','wusong_advanced');assert.ok(combo.logs.some(t=>t.includes('流血衔接')&&t.includes('武松')&&t.includes('损失 ')));
const controlled=fixture(['linchong','ruanxiaoqi'],31415,{enemies:['tiger_king']});castSkill(controlled,data,'linchong','linchong_advanced');const from=controlled.battle.log.length;castSkill(controlled,data,'ruanxiaoqi','ruanxiaoqi_advanced');
assert.ok(controlled.battle.log.slice(from).some(t=>t.includes('抗控')&&t.includes('阮小七')&&t.includes(data.by.skills.ruanxiaoqi_advanced.name)),'A resisted stun is attributed and does not claim a hit');
const interrupted=fixture(['yanqing']);advance(interrupted,6000);assert.equal(interrupted.battle.enemy[0].boss.pendingAt,8000);castSkill(interrupted,data,'yanqing','yanqing_advanced');
assert.ok(interrupted.battle.log.some(t=>t.includes('本次蓄势被截住')&&t.includes('燕青')&&t.includes(data.by.skills.yanqing_advanced.name)));
assert.equal(interrupted.battle.enemy[0].boss.pendingAt,0);
const chief=fixture(['baisheng']);advance(chief,8000);assert.ok(chief.battle.log.some(t=>t.includes('【结阵护众】')&&t.includes('获得【护阵')&&t.includes(chief.battle.enemy[0].name)));
const normal=fixture(['wusong']);advance(normal,10000);assert.ok(normal.battle.log.some(t=>t.includes('【普攻】进击')&&t.includes('损失 ')));
for(const hero of ['luzhishen','wusong','gongsunsheng','baisheng','wuyong']){
 const manual=fixture([hero]),auto=structuredClone(manual),skill=data.by.skills[hero+'_advanced'];
 castSkill(manual,data,hero,skill.id);setBattleSkillMode(auto,'auto');advanceBattle(auto,data,1);
 const a=withoutLog(manual),b=withoutLog(auto);delete a.battleSkillMode;delete b.battleSkillMode;b.battle.elapsed=0;
 assert.deepEqual(a,b,hero+' auto/manual effects, costs, cooldown and RNG match');
 const expected=manual.battle.log.filter(t=>t.includes(skill.name));for(const line of expected)assert.ok(auto.battle.log.includes(line),hero+' actual effect logs match automatic skills');
 assert.ok(auto.battle.log.some(t=>t.includes('【自动技能】')&&t.includes(skill.name)));
 const saved=parseSave(JSON.stringify(auto),data);assert.deepEqual(saved,auto);
 assert.deepEqual(importSave(exportSave(auto,{id:1,name:'技能日志'},data),data).state,auto);
}
const rejected=fixture(['wusong']);rejected.battle.team[0].rage=0;const before=JSON.stringify(rejected);assert.match(skillReason(rejected.battle,rejected.battle.team[0],data.by.skills.wusong_advanced),/怒气/);assert.throws(()=>castSkill(rejected,data,'wusong','wusong_advanced'));assert.equal(JSON.stringify(rejected),before,'Rejected input does not invent a cast or change RNG');
const direct='武松施展【景阳冈】，山匪损失 200 点气血。';assert.equal(skillEffectLog(direct,'武松','景阳冈'),direct);assert.equal(skillEffectLog('普通行','武松',undefined),'普通行');
console.log('Skill log PASS: '+checked+' frozen pre-change combat/RNG states, all real active skills, actor/skill/target/effects, protection, healing, rage, cleanse, combo, resist, interrupt, chief skill, auto/manual parity and save/export round trips.');
