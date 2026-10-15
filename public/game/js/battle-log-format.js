// Log presentation only: no state, random draws, combat effects or timers.
export function skillEffectLog(text,actor,name){
 if(!name||text.includes(actor+'施展【'+name+'】'))return text;
 return '【'+name+'】'+actor+'：'+text;
}
export function skillLogApi(api,actor,name){
 return name?{...api,log:(battle,text)=>api.log(battle,skillEffectLog(text,actor,name))}:api;
}
