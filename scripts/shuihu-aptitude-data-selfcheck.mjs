import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APTITUDE_GRADES,HERO_APTITUDES,heroAptitude,starPosition,aptitudeBadge} from '../public/game/js/hero-aptitude.js';
const heroes=JSON.parse(readFileSync(new URL('../public/game/data/heroes.json',import.meta.url),'utf8'));
const canonical=heroes.filter(h=>h.group!=='external'),external=heroes.filter(h=>h.group==='external');
assert.equal(canonical.length,108);
assert.deepEqual(Object.keys(HERO_APTITUDES).sort(),canonical.map(h=>h.id).sort(),'every canonical hero has exactly one assignment; external heroes are not assigned');
const counts={A:0,B:0,C:0};for(const h of canonical){const a=heroAptitude(h);assert.ok(a);assert.equal(a.id,HERO_APTITUDES[h.id]);counts[a.id]++;}
assert.deepEqual(counts,{A:24,B:48,C:36});
assert.deepEqual(APTITUDE_GRADES,{A:{id:'A',name:'甲等',power:1.16,trainingRate:1},B:{id:'B',name:'乙等',power:1.08,trainingRate:.9},C:{id:'C',name:'丙等',power:1,trainingRate:.8}});
assert.ok(APTITUDE_GRADES.A.power/APTITUDE_GRADES.C.power<=1.2,'aptitude-only attribute gap stays within 20%');
assert.ok(APTITUDE_GRADES.A.trainingRate>APTITUDE_GRADES.B.trainingRate&&APTITUDE_GRADES.B.trainingRate>APTITUDE_GRADES.C.trainingRate,'lower aptitude has lower training costs');
const byId=Object.fromEntries(heroes.map(h=>[h.id,h]));
for(const id of ['guansheng','linchong','qinming','huyanzhuo','dongping'])assert.equal(heroAptitude(byId[id]).id,'A','all five tiger generals are A');
assert.equal(heroAptitude(byId.chaijin).id,'B');
for(const id of ['zhuwu','sunli','lingzhen','andaoquan','husanniang','fanrui'])assert.equal(heroAptitude(byId[id]).id,'A');
const top=canonical.filter(h=>heroAptitude(h).id==='A');
assert.equal(top.filter(h=>starPosition(h)==='地煞').length,6);
assert.deepEqual([...new Set(top.map(h=>h.type))].sort(),['defender','fighter','ranger','strategist','support']);
assert.equal(canonical.filter(h=>starPosition(h)==='天罡').length,36);
assert.equal(canonical.filter(h=>starPosition(h)==='地煞').length,72);
assert.equal(starPosition({...byId.songjiang,group:'disha'}),'天罡','star position follows the historical seat, not combat aptitude or group text');
for(const h of external){assert.equal(heroAptitude(h),null);assert.equal(starPosition(h),'');assert.equal(aptitudeBadge(h),'');}
assert.ok(external.some(h=>h.obtain.type==='wanderer')&&external.some(h=>h.obtain.type==='external'));
for(const value of [null,undefined,{}, {id:'missing',group:'tiangang'}]){assert.equal(heroAptitude(value),null);assert.equal(aptitudeBadge(value),'');}
assert.equal(starPosition({group:'tiangang',seat:0}),'');assert.equal(starPosition({group:'tiangang',seat:109}),'');
// Definitions are not save fields, recruitment outcomes or mutable cultivation ranks.
const original=JSON.stringify(heroes),random=Math.random;let randomCalls=0;
try{
 Math.random=()=>{randomCalls++;throw new Error('Aptitude must never consume random numbers');};
 for(const h of canonical){
  const expected=heroAptitude(h);
  for(const rawStar of [1,3,5])for(const quality of [0,1,2]){
   const candidate={...h,star:rawStar,quality,status:'owned',rng:143,level:40,recruit:{number:98}};
   assert.equal(heroAptitude(candidate),expected,'same hero keeps its grade through recruitment and cultivation');
   assert.equal(candidate.rng,143);
   assert.equal(starPosition(candidate),starPosition(h));
  }
  const guarded={...h};Object.defineProperty(guarded,'star',{get(){throw new Error('raw star cannot determine aptitude');}});
  assert.equal(heroAptitude(guarded),expected);
  const html=aptitudeBadge(h);
  assert.ok(html.includes('class="hero-aptitude hero-aptitude-'+expected.id+'"'));
  assert.ok(html.includes('aria-label="资质：'+expected.name+'"'));
  assert.ok(html.endsWith('>'+expected.name+'</span>'));
 }
}finally{Math.random=random;}
assert.equal(randomCalls,0);assert.equal(JSON.stringify(heroes),original,'reading aptitude never mutates hero definitions or investments');
assert.ok(Object.isFrozen(HERO_APTITUDES));assert.ok(Object.isFrozen(APTITUDE_GRADES));for(const grade of Object.values(APTITUDE_GRADES))assert.ok(Object.isFrozen(grade));
console.log('Aptitude data PASS: exact 108 assignments (24 A/48 B/36 C), five tiger generals, five professions in A, six disha in A, 36 tiangang/72 disha, external exclusion, raw-star/quality/recruitment independence, immutable definitions, accessible badges and zero RNG consumption.');
