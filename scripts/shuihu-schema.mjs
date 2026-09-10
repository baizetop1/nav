// Print the structural JSON Schema. Runtime cross-file references are checked by data.js.
import {readFileSync} from 'node:fs';
import {collections} from '../public/game/js/data.js';
const raw=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))]));
function infer(values,key=''){
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
const schema={$schema:'https://json-schema.org/draft/2020-12/schema',title:'白泽水浒内容数据集 v2',description:'以文件名为键合并 config 和各数据集合；引用由 data.js 验证。',...infer([raw])};
schema.properties.config.properties.version.const=2;
console.log(JSON.stringify(schema,null,2));
