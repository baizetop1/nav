import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {attributes} from '../public/game/js/hero.js';
import {advanceBattle,battleItemQuote,BATTLE_ITEMS} from '../public/game/js/battle.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {RECIPES} from '../public/game/js/provisions.js';
import {inventoryGroup,inventoryEntry,recipePanel} from '../public/game/js/provisions-ui.js';
import {CRAFT_MATERIALS,EXTRA_BATTLE_ITEMS,EXTRA_EQUIPMENT,RAW_WORKSHOP_ITEMS,WORKSHOP_RECIPES} from '../public/game/js/supplies-data.js';

const copy=structuredClone;
const amount=(s,id)=>s.inventory[id]||0;
const reload=s=>importSave(exportSave(s,{id:1,name:'行囊加工回归'},d),d).state;
function unchanged(s,type,a,pattern){const before=copy(s);assert.throws(()=>act(s,type,a),pattern);assert.deepEqual(s,before);}
function stock(s,items){for(const [id,n] of Object.entries(items))while(amount(s,id)<n){if(CRAFT_MATERIALS.includes(id))s=make(s,id);else s=act(s,'buy',{id});}return s;}
function make(s,id){const r=WORKSHOP_RECIPES[id];if(!s.expansion?.recipes.includes(id))s=act(s,'provisionUnlock',{id});s=stock(s,r.items);const before=copy(s);s=act(s,'provisionCraft',{id});assert.equal(amount(s,id)-amount(before,id),1);assert.equal(before.player.silver-s.player.silver,r.silver);for(const [raw,n] of Object.entries(r.items))assert.equal(amount(before,raw)-amount(s,raw),n);assert.equal(s.daily.counters['craft_'+id],(before.daily.counters['craft_'+id]||0)+1);return s;}
const button=(label,a)=>'<button data-action='+JSON.stringify(a)+'>'+label+'</button>';

// The four intermediates all have both an existing-resource source and an actual consumer.
assert.equal(CRAFT_MATERIALS.length,4);assert.equal(EXTRA_BATTLE_ITEMS.length,3);assert.equal(EXTRA_EQUIPMENT.length,6);
for(const id of CRAFT_MATERIALS){assert.equal(d.by.items[id].price,0);assert.equal(d.by.items[id].type,'material');assert.equal(inventoryGroup(d.by.items[id]),'材料与线索');assert.ok(WORKSHOP_RECIPES[id]);assert.ok(Object.values(WORKSHOP_RECIPES).some(r=>r.items[id])||EXTRA_EQUIPMENT.some(e=>d.by.equipments[e].recipe.items[id]));}
for(const id of EXTRA_BATTLE_ITEMS){assert.ok(BATTLE_ITEMS.includes(id));assert.equal(d.by.items[id].price,0);assert.equal(inventoryGroup(d.by.items[id]),'战斗药品');assert.equal(WORKSHOP_RECIPES[id].limit,3);}
for(const [id,r] of Object.entries(WORKSHOP_RECIPES)){assert.deepEqual(RECIPES[id],r);for(const raw of Object.keys(r.items))assert.ok(CRAFT_MATERIALS.includes(raw)||RAW_WORKSHOP_ITEMS.includes(raw));}
for(const raw of RAW_WORKSHOP_ITEMS)assert.ok(d.by.items[raw].price>0&&!d.by.items[raw].hero);
assert.equal(new Set(EXTRA_EQUIPMENT.map(id=>d.by.equipments[id].type)).size,6);

// Obtain resources, learn each recipe and manufacture every new item through normal actions.
let supplied=fixture(157,30);supplied.inventory={};supplied.player.silver=100000;
const lowClinic=copy(supplied);lowClinic.camp.buildings.clinic=1;unchanged(lowClinic,'provisionUnlock',{id:'medicinal_extract'},/设施/);
unchanged(supplied,'provisionCraft',{id:'tempered_steel'},/配方/);unchanged(supplied,'buy',{id:'jinchuang_gao'},/出售/);
for(const id of EXTRA_BATTLE_ITEMS)supplied=make(supplied,id);
const owned=[];
for(const id of EXTRA_EQUIPMENT){const e=d.by.equipments[id];supplied=stock(supplied,e.recipe.items);const poor=copy(supplied);poor.inventory[Object.keys(e.recipe.items)[0]]=0;unchanged(poor,'craftEquip',{id},/材料/);const before=copy(supplied);supplied=act(supplied,'craftEquip',{id});assert.equal(before.player.silver-supplied.player.silver,e.recipe.silver);for(const [raw,n] of Object.entries(e.recipe.items))assert.equal(amount(before,raw)-amount(supplied,raw),n);owned.push(supplied.equipment.at(-1).uid);assert.equal(supplied.equipment.at(-1).item,id);}
assert.ok(Object.keys(WORKSHOP_RECIPES).every(id=>supplied.expansion.recipes.includes(id)));assert.deepEqual(reload(supplied),supplied);
const badRecipe=copy(supplied);badRecipe.expansion.recipes.push('invented_recipe');assert.throws(()=>gameSnapshot(badRecipe,d));
for(const id of Object.keys(WORKSHOP_RECIPES))unchanged(supplied,'provisionUnlock',{id},/学会/);
const exhausted=copy(supplied);exhausted.daily.counters.craft_tempered_steel=WORKSHOP_RECIPES.tempered_steel.limit;unchanged(exhausted,'provisionCraft',{id:'tempered_steel'},/次数/);
const poorMedicine=copy(supplied);poorMedicine.inventory.medicinal_extract=0;unchanged(poorMedicine,'provisionCraft',{id:'jinchuang_gao'},/材料/);
const poorSilver=copy(supplied);poorSilver.player.silver=0;unchanged(poorSilver,'provisionCraft',{id:'medicinal_extract'},/碎银|材料/);

// All six slots are equippable; their real attribute gains survive strengthening and portable saves.
const beforeGear=attributes(supplied,'linchong',d);let dressed=copy(supplied);
for(const id of owned)dressed=act(dressed,'equip',{id,hero:'linchong'});
const afterGear=attributes(dressed,'linchong',d);for(const key of ['hp','attack','defense','speed','strategy'])assert.ok(afterGear[key]>beforeGear[key]);
assert.equal(dressed.equipment.filter(e=>e.hero==='linchong').length,6);
dressed=stock(dressed,{iron:1});const oldAttack=attributes(dressed,'linchong',d).attack;dressed=act(dressed,'strengthen',{id:owned[0]});assert.equal(dressed.equipment.find(e=>e.uid===owned[0]).plus,1);assert.ok(attributes(dressed,'linchong',d).attack>oldAttack);assert.deepEqual(reload(dressed),dressed);
unchanged(dressed,'dismantle',{id:owned[0]},/卸下/);let dismantled=act(dressed,'equip',{id:owned[0],hero:null});const scraps=amount(dismantled,'scrap_iron');dismantled=act(dismantled,'dismantle',{id:owned[0]});assert.equal(amount(dismantled,'scrap_iron')-scraps,7);
for(const id of EXTRA_EQUIPMENT){const before=copy(supplied),bought=act(supplied,'buyEquip',{id});assert.equal(before.player.silver-bought.player.silver,d.by.equipments[id].price*2);assert.equal(bought.equipment.at(-1).item,id);}

// The inventory shows real uses and visible routes to every raw ingredient.
const html=recipePanel(supplied,d,button);assert.ok(!html.includes('undefined'));assert.ok(html.includes('<details'));
for(const [category,count] of [['materials',4],['medicines',3],['supplies',5],['raw',0]]){const categoryHTML=recipePanel(supplied,d,button,true,category);assert.ok(!categoryHTML.includes('<details'));assert.equal((categoryHTML.match(/data-recipe=/g)||[]).length,count);assert.ok(categoryHTML.includes('data-recipe-category="'+category+'"'));}assert.equal((recipePanel(supplied,d,button,true).match(/data-recipe=/g)||[]).length,4);
for(const id of [...CRAFT_MATERIALS,...EXTRA_BATTLE_ITEMS,...RAW_WORKSHOP_ITEMS])assert.ok(html.includes(d.by.items[id].name));
for(const id of CRAFT_MATERIALS){const entry=inventoryEntry(supplied,d,d.by.items[id],String,button);assert.ok(entry.includes('用途'));assert.ok(entry.includes('加工配方')||entry.includes('前往打造'));}

// Medicines are crafted above, then consumed by the real battleItem command in actual started battles.
const battle=()=>act(copy(supplied),'campRaid',{id:'fort'});
let realDamage=battle();for(let i=0;i<20&&!realDamage.battle.outcome&&!realDamage.battle.team.some(u=>u.hp<u.maxHp);i++)advanceBattle(realDamage,d,250);
assert.ok(realDamage.battle.team.some(u=>u.hp<u.maxHp));const realQuote=battleItemQuote(realDamage,d,'jinchuang_gao');assert.equal(realQuote.reason,'');const hp=realQuote.target.hp,maximum=realQuote.target.maxHp,targetId=realQuote.target.id;const realHealed=act(realDamage,'battleItem',{id:'jinchuang_gao'});assert.equal(realHealed.battle.team.find(u=>u.id===targetId).hp,Math.min(maximum,hp+900));assert.equal(amount(realHealed,'jinchuang_gao'),amount(realDamage,'jinchuang_gao')-1);assert.deepEqual(reload(realHealed),realHealed);

// Controlled, valid combat states isolate targeting, mixed effects, caps and no-resurrection boundaries.
let wounded=battle();wounded.battle.team[0].hp=0;wounded.battle.team[1].hp-=1200;wounded.battle.team[2].hp-=200;const beforeHeal=copy(wounded);wounded=act(wounded,'battleItem',{id:'jinchuang_gao'});assert.equal(wounded.battle.team[0].hp,0);assert.equal(wounded.battle.team[1].hp-beforeHeal.battle.team[1].hp,900);assert.equal(wounded.battle.metrics.medicine-beforeHeal.battle.metrics.medicine,900);assert.equal(wounded.battle.metrics.medicineUses,(beforeHeal.battle.metrics.medicineUses||0)+1);assert.equal(wounded.battle.itemReadyAt,wounded.battle.elapsed+3000);unchanged(wounded,'battleItem',{id:'zhuanggu_tang'},/间隔/);assert.deepEqual(reload(wounded),wounded);
const healthy=battle();unchanged(healthy,'battleItem',{id:'jinchuang_gao'},/暂无需要/);unchanged(healthy,'battleItem',{id:'xing_shen_san'},/暂无需要/);
let cleansing=battle();const cleansed=cleansing.battle.team[1];cleansed.hp-=400;cleansed.statuses=[{id:'poison',value:.02,expiresAt:6000,nextTickAt:2000},{id:'stun',value:1,expiresAt:4000},{id:'guard',value:.15,expiresAt:8000}];const cleanBefore=copy(cleansing);assert.equal(battleItemQuote(cleansing,d,'xing_shen_san').target.id,cleansed.id);cleansing=act(cleansing,'battleItem',{id:'xing_shen_san'});assert.equal(cleansing.battle.team[1].hp-cleanBefore.battle.team[1].hp,240);assert.deepEqual(cleansing.battle.team[1].statuses,[{id:'guard',value:.15,expiresAt:8000}]);assert.equal(amount(cleanBefore,'xing_shen_san')-amount(cleansing,'xing_shen_san'),1);assert.deepEqual(reload(cleansing),cleansing);
let combined=battle();combined.battle.team.forEach((u,i)=>u.rage=[60,10,80][i]);combined.battle.team[1].hp-=500;const combinedBefore=copy(combined);combined=act(combined,'battleItem',{id:'zhuanggu_tang'});assert.equal(combined.battle.team[1].rage,35);assert.equal(combined.battle.team[1].hp-combinedBefore.battle.team[1].hp,360);assert.equal(combined.battle.team[0].rage,60);assert.equal(amount(combinedBefore,'zhuanggu_tang')-amount(combined,'zhuanggu_tang'),1);assert.deepEqual(reload(combined),combined);
const capped=battle();capped.battle.team.forEach(u=>u.rage=100);capped.battle.team[1].hp-=100;unchanged(capped,'battleItem',{id:'zhuanggu_tang'},/暂无需要/);capped.battle.team[1].rage=90;const capHealed=act(capped,'battleItem',{id:'zhuanggu_tang'});assert.equal(capHealed.battle.team[1].rage,100);assert.equal(capHealed.battle.team[1].hp,capHealed.battle.team[1].maxHp);
const lesson=copy(healthy);lesson.battle.context.type='lesson';for(const id of EXTRA_BATTLE_ITEMS)assert.match(battleItemQuote(lesson,d,id).reason,/演武/);
const prohibited=copy(healthy);prohibited.battle.context={type:'elite',kind:'hard',id:'siege'};for(const id of EXTRA_BATTLE_ITEMS)assert.match(battleItemQuote(prohibited,d,id).reason,/禁药/);
let resumed=reload(combined),continued=copy(combined);for(let i=0;i<10&&!resumed.battle.outcome;i++)advanceBattle(resumed,d,100);advanceBattle(continued,d,1000);assert.deepEqual(resumed,continued);
export {supplied as expandedSupplyState};
console.log('Supply expansion PASS: four closed-loop processed materials, seven learned recipes with exact costs/limits, six craftable and equippable roles, strengthen/dismantle/buy paths, three crafted medicines consumed through battle actions, mixed effects and targeting, no resurrection/waste, cooldowns and banned contexts, inventory/source visibility, portable deterministic continuation.');
