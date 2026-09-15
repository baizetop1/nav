// Derived capacities preserve old saves without inventing spent resources or healing troops.
export const barracksCapacity=c=>(c?.buildings.barracks||0)*200;
export const heroCommand=(s,id)=>s.heroes[id]?.status==='owned'?150+10*(s.heroes[id].level-1)+50*(s.heroes[id].quality||0):0;
export const commandCapacity=s=>Math.min(1000,s.team.reduce((n,id)=>n+heroCommand(s,id),0));
export const deployedTroops=s=>s.camp?.mode==='army'?Math.min(s.camp.troops,s.camp.deployment,commandCapacity(s)):0;
export function troopShares(s,ids,n){const shares=ids.map(()=>0);for(let left=n;left>0;){let added=0;for(let i=0;i<ids.length&&left;i++)if(shares[i]<heroCommand(s,ids[i])){shares[i]++;left--;added++;}if(!added)break;}return shares;}
export const troopPower=n=>n<=34?n:Math.round(34+2*Math.sqrt(n-34));
export function staminaCap(s){const max=Math.max(1,...Object.values(s.heroes||{}).filter(h=>h?.status==='owned').map(h=>h.level));return 100+10*Math.max(0,(s.camp?.buildings.hall||1)-1)+5*Math.floor((max-1)/5);}
