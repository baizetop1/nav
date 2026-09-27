// Print the structural JSON Schema. Runtime cross-file references are checked by data.js.
import {readFileSync} from 'node:fs';
import {collections} from '../public/game/js/data.js';
const raw=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))]));
const conditionRef={$ref:'#/$defs/condition'};
function infer(values,key=''){
  if(key==='condition'||key==='meetCondition')return conditionRef;
  const typeOf=v=>v===null?'null':Array.isArray(v)?'array':typeof v==='number'&&Number.isInteger(v)?'integer':typeof v;
  const types=[...new Set(values.map(typeOf))];
  if(types.length>1)return {anyOf:types.map(t=>infer(values.filter(v=>typeOf(v)===t),key))};
  const type=types[0];if(!type)return {};
  if(type==='array')return {type,items:infer(values.flat(),key)};
  if(type==='object'){
    const keys=[...new Set(values.flatMap(Object.keys))];
    return {type,required:keys.filter(k=>values.every(v=>Object.hasOwn(v,k))),additionalProperties:false,properties:Object.fromEntries(keys.map(k=>[k,infer(values.filter(v=>Object.hasOwn(v,k)).map(v=>v[k]),k)]))};
  }
  return {type,...(key==='id'&&type==='string'?{pattern:'^[a-z][a-z0-9_]*$'}:{})};
}
// Conditions are a recursive language, independent of a story's depth or step name.
const knownFlags=new Set(raw.chapters.map(c=>c.completeFlag));
function collectFlags(value){
  if(!value||typeof value!=='object')return;
  if(value.type==='flag')knownFlags.add(value.id);
  for(const [key,entry]of Object.entries(value)){
    if(['flag','notFlag'].includes(key)&&typeof entry==='string'&&entry)knownFlags.add(entry);
    collectFlags(entry);
  }
}
collectFlags(raw);
const string={type:'string'},integer={type:'integer',minimum:0};
const flag={type:'string',enum:[...knownFlags].sort()};
const condition={anyOf:[{type:'null'},{type:'object',minProperties:1,additionalProperties:false,properties:{
  all:{type:'array',minItems:1,items:conditionRef},any:{type:'array',minItems:1,items:conditionRef},flag,notFlag:flag,
  item:string,hero:string,visited:string,count:integer,status:{type:'string',enum:['unknown','heard','known','available','owned']},
  campBuilding:{type:'string',enum:['hall','farm','lumber','barracks','clinic','market']},campMode:{type:'string',enum:['solo','army']},
  time:{type:'string',enum:['day','night']},liangshanLevel:integer,ownedCount:integer,heroLevel:integer,equipmentCount:integer,unvisited:integer,feature:string,stat:string,prestige:integer
}}]};
const schema={$schema:'https://json-schema.org/draft/2020-12/schema',title:'白泽水浒内容数据集 v2',description:'以文件名为键合并 config 和各数据集合；引用由 data.js 验证。',...infer([raw]),$defs:{condition}};
schema.properties.config.properties.version.const=2;
// Ordinary recipes require a known positive material amount; journey items are not craftable.
const craftable=infer(raw.equipments.filter(e=>e.source!=='journey'));
const materials=craftable.properties.recipe.properties.items;materials.minProperties=1;
for(const rule of Object.values(materials.properties))rule.minimum=1;
const journey=infer(raw.equipments.filter(e=>e.source==='journey'));
journey.properties.source.const='journey';journey.properties.price.const=0;journey.properties.recipe.properties.silver.const=0;
schema.properties.equipments.items={anyOf:[craftable,journey]};
// Paid preparations must keep their advertised exact costs, including the full material set.
function exact(value){const rule=infer([value]);if(value&&typeof value==='object'&&!Array.isArray(value))for(const [key,entry]of Object.entries(value))rule.properties[key]=exact(entry);else if(typeof value==='number')rule.const=value;return rule;}
const startCosts=raw.stories.filter(s=>s.id!=='v7_prepare').flatMap(s=>s.steps.start?.choices||[]).map(c=>c.cost).filter(Boolean);
const plans=raw.stories.find(s=>s.id==='v7_prepare').steps.start.choices.map(c=>c.cost);
schema.properties.stories.items.properties.steps.properties.start.properties.choices.items.properties.cost={anyOf:[...(startCosts.length?[infer(startCosts)]:[]),...plans.map(exact)]};
console.log(JSON.stringify(schema,null,2));
