// Targets count current stock, not lifetime drops. Browsing sources never changes a target.
export const STOCK_RESOURCES={silver:'碎银',campWood:'寨仓木材',campFood:'寨仓粮草'};
export const sourceStock=(s,id)=>id==='silver'?s.player.silver:id==='campWood'?s.camp?.wood||0:id==='campFood'?s.camp?.food||0:s.inventory[id]||0;
export const sourceGoal=g=>g?.kind==='stock';
export const validSourceGoal=(g,d)=>sourceGoal(g)&&typeof g.id==='string'&&Object.keys(g).every(k=>['kind','id','amount'].includes(k))&&(Object.hasOwn(STOCK_RESOURCES,g.id)||Object.hasOwn(d.by.items,g.id))&&Number.isSafeInteger(g.amount)&&g.amount>=1&&g.amount<=10000000;
export const sourceName=(d,id)=>STOCK_RESOURCES[id]||d.by.items[id]?.name||d.by.equipments[id]?.name||id;
export function sourceGoalQuote(s,d,g){if(!validSourceGoal(g,d))return null;const stock=sourceStock(s,g.id),done=stock>=g.amount,command={type:'ui_sources',id:g.id,amount:g.amount,...(done?{tab:'use'}:{})};const step={done,text:sourceName(d,g.id)+' '+stock+' / '+g.amount+(done?'，已经备齐。':'，还差 '+(g.amount-stock)+'。'),label:done?'查看用途':'查看来源',command};return {name:'备齐'+sourceName(d,g.id),note:'按目前持有数量计算；使用材料后会重新显示缺口。',done,steps:[step],next:step,completeLabel:'查看用途',completeCommand:command};}
