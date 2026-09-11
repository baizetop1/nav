import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collections,prepareData } from '../public/game/js/data.js';
import { dispatch,newGame } from '../public/game/js/core.js';
import { validateSave } from '../public/game/js/save.js';
import { gameSnapshot,exportSave,importSave } from '../public/game/js/portable.js';
import { awardMountContracts,MOUNT_DROP_RATE } from '../public/game/js/growth.js';
import { gains,rewardDialog } from '../public/game/js/rewards-ui.js';
import { render,esc } from '../public/game/js/ui.js';
import { random } from '../public/game/js/utils.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root)))])));
const act=(s,type,extra={})=>{const next=dispatch(data,s,{type,...extra},s.clock);validateSave(next,data);assert.deepEqual(gameSnapshot(next,data),next);return next;};
let s=newGame(data,Date.now(),5832),old=JSON.stringify(s);assert.deepEqual(gameSnapshot(s,data),s);
s=act(s,'campFound');assert.equal(s.heroes.baisheng.status,'owned');assert.equal(s.team[0],'baisheng');assert.equal(s.camp.buildings.hall,1);assert.throws(()=>act(s,'campFound'));
for(const id of ['lumber','farm','barracks'])s=act(s,'campBuild',{id});
const before=structuredClone(s);s=act(s,'campWork');assert.equal(s.camp.wood-before.camp.wood,28);assert.equal(s.camp.food-before.camp.food,28);assert.equal(before.player.stamina-s.player.stamina,5);
s=act(s,'campRecruit');assert.equal(s.camp.troops,10);s=act(s,'campFormation',{mode:'army',deployment:10,tactic:'guard'});
s=act(s,'campRaid',{id:'woods'});assert.equal(s.battle.expedition.troops,10);assert.equal(s.battle.team.length,1);
assert.deepEqual(importSave(exportSave(s,{id:1,name:'寨子远征'},data),data).state,s,'Mid-battle portable save retains all facilities, troops and battle snapshots');
assert.throws(()=>act(s,'campBuild',{id:'hall'}),'Cannot mutate troops/buildings during battle');
for(let i=0;i<180&&!s.battle.outcome;i++)s=act(s,'battleTick',{delta:1000});assert.equal(s.battle.outcome,'victory','Starter hero + 10 soldiers can win first raid');
const won=structuredClone(s);s=act(s,'finishBattle');assert.ok(s.camp.wounded>0);assert.equal(s.camp.wounded+s.camp.troops,10);assert.equal(s.camp.sorties,1);assert.ok(gains(won,s,data).some(r=>r.name==='木材'));assert.throws(()=>act(s,'finishBattle'),'Settlement cannot be repeated');
assert.ok(s.camp.wood>=30);s=act(s,'campBuild',{id:'clinic'});const wounded=s.camp.wounded;s=act(s,'campHeal');assert.ok(s.camp.wounded<wounded);assert.equal(s.camp.troops+s.camp.wounded,10);
s=act(s,'campFormation',{mode:'solo',deployment:10,tactic:'balanced'});const troops=s.camp.troops;s=act(s,'campRaid',{id:'woods'});assert.equal(s.battle.expedition.troops,0);s=act(s,'battleRetreat');const lost=structuredClone(s);s=act(s,'finishBattle');assert.equal(s.camp.troops,troops);assert.equal(s.camp.sorties,1);assert.deepEqual(gains(lost,s,data),[],'Retreat gives no reward');
for(const mutate of [x=>x.camp.troops=-1,x=>x.camp.buildings.hall=6,x=>x.camp.tactic='bogus',x=>x.camp.deployment=101]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateSave(bad,data));}
const snapshot=JSON.stringify(s);assert.throws(()=>act(s,'campFormation',{mode:'army',deployment:-4,tactic:'balanced'}));assert.equal(JSON.stringify(s),snapshot,'Rejected actions preserve live state');
// Statistically test a continuous seeded stream, not correlated consecutive seeds.
const h=data.by.heroes.wusong,stream={rng:91823812};let hits=0,misses=0,both=0,one=0;
for(let i=0;i<12000;i++){const x={inventory:{},rng:stream.rng};awardMountContracts(x,data,h.mount.dungeon);stream.rng=x.rng;if(x.inventory[h.mount.contract])hits++;else misses++;const contracts=Object.keys(x.inventory).length;if(contracts>1)both++;if(contracts===1)one++;}
assert.equal(MOUNT_DROP_RATE,.2);assert.ok(hits>2100&&hits<2700);assert.ok(misses>9000&&both>0&&one>0,'Independent rolls allow mixed drops and no-drop clears');
const held={inventory:{[h.mount.contract]:1},rng:1234};awardMountContracts(held,data,h.mount.dungeon);assert.equal(held.inventory[h.mount.contract],1);
const mounted={inventory:{},growth:{mounts:{wusong:{rank:1,intimacy:0,riding:true}}},rng:1234};awardMountContracts(mounted,data,h.mount.dungeon);assert.equal(mounted.inventory[h.mount.contract],undefined);
// Force an actual no-contract winning settlement and verify its receipt.
let dungeon=act(s,'dungeon',{id:'jingyanggang'});for(const u of dungeon.battle.enemy)u.hp=0;dungeon=act(dungeon,'battleTick',{delta:1});
let seed=1;for(;;seed++){const r={rng:seed};if(data.heroes.filter(x=>x.mount.dungeon==='jingyanggang').every(()=>random(r)>=.2))break;}dungeon.rng=seed;const settled=act(dungeon,'finishBattle');assert.equal(settled.inventory[h.mount.contract],undefined);assert.ok(!gains(dungeon,settled,data).some(r=>r.name.includes('坐骑契')));
for(const view of ['camp','heroes','save']){const html=render({state:s,data,view});assert.ok(html.includes('activity-log'));if(view==='camp')for(const word of ['农田','点将出征','英雄独行','20%'])assert.ok(html.includes(word));}
const receipt=rewardDialog([{name:'<script>',amount:1}],esc);assert.ok(receipt.includes('&lt;script&gt;'));assert.ok(!receipt.includes('<script>'));
assert.ok(JSON.parse(old).camp===undefined,'Old saves do not gain resources merely by loading');
console.log(`Shuihu camp: build/work/recruit/heal, real starter victory, solo retreat, one-shot rewards, mid-battle import/export, invalid-save guards and 12,000 mount rolls (${hits} drops) passed.`);
