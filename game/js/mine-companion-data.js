// Li Yun shares the existing mine map with Tang Long. No second map or roster entry.
export const MINE_COMPANION_FLAGS=['liyun_met','liyun_checked','liyun_hoops','liyun_won','liyun_braced','liyun_invited'];
export const MINE_COMPANION_TASKS={
 liyun_meet:{flag:'liyun_met',node:'entrance',needs:'return_paid',label:'与李云交谈',missing:'先夺回矿车，回炉房交矿样。'},
 liyun_survey:{flag:'liyun_checked',node:'chamber',needs:'liyun_met',label:'查看裂梁',missing:'先到矿口与李云交谈。'},
 liyun_hoops:{flag:'liyun_hoops',node:'furnace',needs:'liyun_checked',label:'请汤隆打铁箍',missing:'先和李云查清石室的裂梁。'},
 liyun_brace:{flag:'liyun_braced',node:'chamber',needs:'liyun_won',label:'和李云立好支架',missing:'先去运矿道护送木料。'},
 liyun_invite:{flag:'liyun_invited',node:'chamber',needs:'liyun_braced',label:'邀请李云入寨',missing:'先把石室支架立好。'}
};
export const mineCompanionHas=(s,k)=>!!s.exploration?.flags.includes(k);
export const hasMineCompanion=s=>!!s.exploration?.flags.some(k=>MINE_COMPANION_FLAGS.includes(k))||s.development?.goal?.kind==='invite'&&s.development.goal.id==='liyun'||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>c?.route==='timberguard');
export function mineCompanionGoal(s){const has=k=>mineCompanionHas(s,k);
 if(!has('return_paid'))return null;
 if(!has('liyun_met'))return {node:'entrance',text:'矿口来了个带短尺的汉子，正拦着运矿的人。去问问他。',label:'去矿口见李云'};
 if(!has('liyun_checked'))return {node:'chamber',text:'李云说石室的旧梁撑不住了，先跟他看看裂口。'};
 if(!has('liyun_hoops'))return {node:'furnace',text:'梁脚已经量好。去炉房请汤隆打一副铁箍。'};
 if(!has('liyun_won'))return {node:'rail',text:'铁箍已备好，去运矿道接木料。夺木骑匪会绕击后排，先集火他。'};
 if(!has('liyun_braced'))return {node:'chamber',text:'木料送到了，回石室和李云一起立支架。'};
 if(!has('liyun_invited'))return {node:'chamber',text:'支架已立稳。李云正在收短尺，问他愿不愿意到寨里帮忙。'};
 return {node:'chamber',done:true,text:'李云定期带人修整矿架，旧矿洞派遣每批碎铁 +1。运矿道仍可护送木料。',label:'安排矿洞采集',command:{type:'ui_idleOpen',region:'mine'}};
}
export function mineCompanionTask(s,id){
 const task=Object.hasOwn(MINE_COMPANION_TASKS,id)?MINE_COMPANION_TASKS[id]:null;
 if(!task)return '没有这件事。';
 if(mineCompanionHas(s,task.flag))return '这件事已经办妥。';
 if(!mineCompanionHas(s,task.needs))return task.missing;
 if(s.exploration?.position!==task.node)return '先前往'+({entrance:'矿口',chamber:'塌方石室',furnace:'旧炉房'})[task.node]+'。';
 if(id==='liyun_invite'&&(s.inventory.liyun_token||0)>9999998)return '李云信物库存已满，整理后再邀。';
 return '';
}
