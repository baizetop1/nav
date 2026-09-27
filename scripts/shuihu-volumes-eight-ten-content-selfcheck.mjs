import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {maps,stories,enemies,chapters,missions} from '../public/game/js/volumes-eight-ten-content.js';
import {meets} from '../public/game/js/map.js';

const by = values => Object.fromEntries(values.map(value=>[value.id,value]));
const mapBy = by(maps), storyBy = by(stories), enemyBy = by(enemies);
const existing = kind => JSON.parse(readFileSync(new URL('../public/game/data/'+kind+'.json',import.meta.url)));
const items = by(existing('items')), heroes = by(existing('heroes')), skills = by(existing('skills'));
const flagState = () => ({progress:{flags:{volume_seven_complete:true},stories:{},visited:[]},inventory:{},heroes:{},player:{}});
const allEffects = stories.flatMap(story=>Object.values(story.steps).flatMap(step=>step.choices.flatMap(choice=>choice.effects||[])));
const apply = (state,choice) => {for(const effect of choice.effects||[])if(effect.type==='flag')state.progress.flags[effect.id]=true;};
const complete = (state,id,choiceId='finish') => {
 const story=storyBy[id];assert.ok(meets(state,story.condition),'start dependency '+id);
 const end=story.steps.settle||story.steps.start,choice=end.choices.find(value=>value.id===choiceId);
 assert.ok(choice?.finish,'finish choice '+id);assert.ok(meets(state,end.condition),'step dependency '+id);assert.ok(meets(state,choice.condition),'choice dependency '+id);apply(state,choice);
};
const hubLinks = (state,id) => mapBy[id].links.filter(link=>meets(state,link.condition)).map(link=>link.target);
for(const list of [maps,stories,enemies,chapters])assert.equal(new Set(list.map(value=>value.id)).size,list.length);
for(const map of maps){
 assert.equal(map.type,'area');assert.ok(map.links.length);for(const id of map.stories)assert.ok(storyBy[id]);
 for(const link of map.links){assert.ok(Object.hasOwn(link,'condition'));assert.ok(mapBy[link.target]||['v7_camp','v11_camp'].includes(link.target),'map link '+link.target);}
 if(!map.id.endsWith('_camp'))assert.ok(map.links.some(link=>link.target===map.id.split('_')[0]+'_camp'&&link.condition===null));
}
for(const story of stories){
 assert.ok(mapBy[story.map]);assert.ok(story.condition,'explicit initial dependency '+story.id);
 for(const step of Object.values(story.steps)){
  assert.ok(step.condition,'explicit stage dependency '+story.id);
  for(const choice of step.choices){
   assert.ok(Object.hasOwn(choice,'condition'),'explicit choice condition '+story.id);
   if(choice.battle){assert.ok(missions[story.id]);assert.equal(choice.next,'settle');for(const id of choice.battle.enemies)assert.ok(enemyBy[id]);}
   for(const effect of choice.effects||[]){
    if(effect.type==='flag')assert.ok(choice.finish,'progress only commits on completion');
    if(effect.type==='hero'){assert.ok(heroes[effect.id]);assert.equal(effect.status,'known','story never replaces owned heroes');}
    if(effect.type==='item')assert.ok(items[effect.id]);
   }
  }
 }
}
for(const enemy of enemies)for(const id of enemy.skills)assert.ok(skills[id]);
for(const [id,mission] of Object.entries(missions)){
 assert.ok(storyBy[id]);assert.ok(mission.level>=38&&mission.level<=40);assert.equal(mission.hall,4);assert.ok(mission.stamina>=12&&mission.stamina<=18);
 for(const wave of mission.waves||[])for(const enemy of wave)assert.ok(enemyBy[enemy]);
 for(const variant of Object.values(mission.variants||{}))for(const enemy of [...(variant.enemies||[]),...(variant.waves||[]).flat()])assert.ok(enemyBy[enemy]);
 if(mission.escort){assert.equal(mission.escort.hp,100);assert.ok(enemyBy[mission.escort.source]);assert.ok(storyBy[id].steps.fight.choices[0].battle.enemies.includes(mission.escort.source));}
}
let routes=0;
for(const first of ['rescue','evidence','supply'])for(const reverse of [false,true]){
 const state=flagState();assert.deepEqual(hubLinks(state,'v8_camp'),['v7_camp']);complete(state,'v8_choose',first);
 const other=['rescue','evidence','supply'].filter(value=>value!==first);if(reverse)other.reverse();
 for(const name of ['rescue','evidence','supply'])assert.equal(meets(state,storyBy['v8_'+name].condition),name===first,'first selected task is mandatory');
 assert.equal(meets(state,storyBy.v8_final.condition),false);complete(state,'v8_'+first);
 for(const name of other)assert.ok(meets(state,storyBy['v8_'+name].condition),'remaining jobs may be reordered');
 complete(state,'v8_'+other[0]);assert.equal(meets(state,storyBy.v8_final.condition),false);complete(state,'v8_'+other[1]);
 assert.ok(hubLinks(state,'v8_camp').includes('v8_gate'));complete(state,'v8_final');complete(state,'v8_settle');
 assert.ok(chapters[0].requirements.every(value=>meets(state,value.condition)));
 for(const choice of storyBy.v8_choose.steps.start.choices)assert.equal(meets(state,choice.condition),false,'priority cannot be changed');routes++;
}
for(const route of ['covert','assault'])for(const allocation of ['supply','defense']){
 const state=flagState();state.progress.flags.volume_eight_complete=true;
 assert.equal(meets(state,storyBy.v9_prison.condition),false);complete(state,'v9_choose',route);complete(state,'v9_gate');
 assert.equal(meets(state,storyBy.v9_escape.condition),false);complete(state,'v9_prison');complete(state,'v9_escape');complete(state,'v9_settle');
 assert.ok(chapters[1].requirements.every(value=>meets(state,value.condition)));state.progress.flags.volume_nine_complete=true;
 complete(state,'v10_report');complete(state,'v10_escort');complete(state,'v10_allocate',allocation);complete(state,'v10_ford');complete(state,'v10_gather');
 assert.ok(chapters[2].requirements.every(value=>meets(state,value.condition)));
 for(const id of ['v9_choose','v10_allocate'])for(const choice of storyBy[id].steps.start.choices)assert.equal(meets(state,choice.condition),false,'route cannot be changed');routes++;
}
for(const chapter of chapters){
 const ownEffects=[...chapter.effects,...stories.filter(story=>mapBy[story.map].chapter===chapter.id).flatMap(story=>Object.values(story.steps).flatMap(step=>step.choices.flatMap(choice=>choice.effects||[])))];
 const amount=id=>ownEffects.filter(effect=>effect.type==='item'&&effect.id===id).reduce((total,effect)=>total+effect.amount,0);
 assert.equal(amount('recruit_order'),2);assert.equal(amount('spirit_essence'),5);assert.equal(amount('immortal_seal'),chapter.number===10?1:0);
 for(const requirement of chapter.requirements)assert.ok(allEffects.some(effect=>effect.type==='flag'&&effect.id===requirement.condition.flag));
}
assert.equal(missions.v8_final.bossRage,30);assert.equal(missions.v8_final.preparation.evidence.rageReduction,15);
assert.equal(missions.v9_gate.variants.v9_assault.waves.length,1);assert.equal(missions.v9_escape.waves.length-missions.v9_escape.variants.v9_covert.waves.length,1);
assert.equal(missions.v10_escort.waves.length,2);assert.equal(missions.v10_ford.waves.length,1);
console.log('Volumes VIII–X content PASS: '+routes+' dependency routes, 13 maps, 16 stories, 9 battles, valid references, exclusive preparations, exact rare-reward budgets, explicit escort/wave metadata. Combat runtime is verified separately.');
