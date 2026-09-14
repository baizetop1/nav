// Level and quality bonuses are bounded and require the hero to be present.
export function stewardshipBonus(s,id){const h=s.heroes[id];return h?.status==='owned'?20+Math.floor((h.level-1)/5)*2+(h.quality||0)*5:0;}
export function workerGrowth(s,id){const h=s.heroes[id];return h?.status==='owned'?Math.floor((h.level-1)/10)+(h.quality||0):0;}
