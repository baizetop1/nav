export const JOURNEYS={
 forest:{name:'青石古道',terrain:'forest',text:'游匪与商旅交错，适合练习先手与追击。',enemies:['bandit','guard'],boss:['road_raider','guard'],discoveries:['pursuit','desperate','rupture']},
 water:{name:'芦荡渡口',terrain:'water',text:'渡口伏兵擅长拖延，水军与持续照应更稳妥。',enemies:['guard','soldier'],boss:['bandit_chief','guard'],discoveries:['boat','tide','battle_hymn']},
 mountain:{name:'断崖粮道',terrain:'mountain',text:'守路军士披甲结阵，破阵与护阵各有用处。',enemies:['soldier','bandit'],boss:['soldier','road_raider'],discoveries:['breakthrough','bulwark','shield_bash']}
};
export const JOURNEY_TIERS={1:{name:'探路',level:8,scale:.7,stamina:16},2:{name:'险途',level:15,scale:1.35,stamina:20},3:{name:'绝险',level:25,scale:2.5,stamina:24}};
export const JOURNEY_GOALS={arms:{name:'练兵材料',text:'精铁、碎铁，带回即可练兵或强化装备。'},practice:{name:'英雄修习',text:'经验丹、武学残页，用于等级与招式成长。'},camp:{name:'营建补给',text:'木材、粮草、药草，支持扩建、募兵与医治。'}};
export const BOONS={
 riposte:{name:'固守反击',introduced:2,text:'固守或护阵时受普攻，反击 60% 攻击；每人间隔 3 秒。'},heal_guard:{name:'回春护体',introduced:2,text:'招式有效治疗的 40% 化为护盾，上限为受疗者气血的 15%。'},pursuit_chain:{name:'乘隙追击',introduced:2,text:'普攻半血以下敌人，追击 40% 攻击；踏影增至 70%，间隔 3 秒。'},
 rupture:{name:'截势乘胜',introduced:2,region:'forest',text:'直接打断首领后，全员怒气 +12；施招者追加 80% 攻击。'},battle_hymn:{name:'济困振气',introduced:2,region:'water',text:'招式有效治疗让受疗者怒气 +8；每人间隔 3 秒。'},shield_bash:{name:'借盾破阵',introduced:2,region:'mountain',text:'普攻消耗自身护盾，造成等值追加伤害；最多消耗气血上限的 10%。'},
 assault:{name:'轻装突击',text:'本趟攻击 +25%，防御 −12%。'},shield:{name:'结阵护行',text:'本趟防御 +25%。'},vigor:{name:'壮行汤',text:'本趟气血上限 +20%，入场保留当前气血比例。'},ambush:{name:'踏影行军',text:'本趟速度 +20%，更快普攻积攒怒气。'},focus:{name:'击鼓振气',text:'本趟每场开局全员怒气 +25。'},medic:{name:'随行草药',text:'本趟每胜一场，仍在阵英雄恢复 12% 气血。'},forager:{name:'识途采粮',text:'本趟后续战斗节点粮耗降低 30%。'},spoils:{name:'搜寻辎重',text:'本趟战斗胜利暂存的碎银与精铁增加 50%。'},
 pursuit:{name:'掠影追袭',region:'forest',text:'攻击 +10%；已有踏影行军时，改为 +30%。'},desperate:{name:'背水破阵',region:'forest',text:'攻击 +35%，气血上限 −15%；不会复活退阵者。'},boat:{name:'连舟守望',region:'water',text:'防御 +10%；水域中改为 +30%。'},tide:{name:'潮生归息',region:'water',text:'战后恢复 6% 气血；已有随行草药时，两者合计恢复 26%。'},breakthrough:{name:'怒潮破势',region:'mountain',text:'攻击 +10%；已有击鼓振气时，改为 +30%。'},bulwark:{name:'磐石同袍',region:'mountain',text:'气血上限 +10%；已有结阵护行时，改为 +30%。'}
};
export const JOURNEY_NODES={fight:'山路交锋',elite:'强敌辎重',camp:'歇脚营地',trade:'行商货摊',event:'迷途行旅',cache:'隐秘货栈',boss:'归途首领'};
export function boonPool(s){const rules=s.realm?.trek?.journey?(s.realm.trek.journey.rules||1):2;return Object.keys(BOONS).filter(id=>(rules===2||BOONS[id].introduced!==2)&&(!BOONS[id].region||(s.realm?.journey?.best[BOONS[id].region]||0)>0));}
export function journeyGoalReward(goal,tier){return goal==='arms'?{items:{iron:3*tier,scrap_iron:5*tier}}:goal==='practice'?{items:{exp_pill:tier,martial_pages:3*tier}}:{wood:40*tier,food:40*tier,items:{herb:4*tier}};}
export function journeyModifiers(boons,terrain){const has=id=>boons.includes(id);return {attack:(has('assault')?1.25:1)*(has('desperate')?1.35:1)*(has('pursuit')?(has('ambush')?1.3:1.1):1)*(has('breakthrough')?(has('focus')?1.3:1.1):1),defense:(has('shield')?1.25:1)*(has('assault')?.88:1)*(has('boat')?(terrain==='water'?1.3:1.1):1),hp:(has('vigor')?1.2:1)*(has('desperate')?.85:1)*(has('bulwark')?(has('shield')?1.3:1.1):1),speed:has('ambush')?1.2:1,rage:has('focus')?25:0,heal:(has('medic')?1200:0)+(has('tide')?(has('medic')?1400:600):0)};}

export const ROUTE_BOSSES={forest:{name:'伏路箭魁',escort:'号令手',move:'号令齐射',warning:'号令手在阵则齐射全队；先集火后排，或打断首领。',windup:3000},water:{name:'覆舟渠帅',escort:'渡口护卫',move:'回潮浪袭',warning:'浪袭全队；蓄势时固守可额外减少 55% 浪袭伤害，或留招打断。',windup:4000},mountain:{name:'断崖寨主',escort:'铁壁护卫',move:'崩岩双击',warning:'护卫存活时，寨主受到普攻减伤 45%；可先攻护卫或用技能破阵。',windup:3000}};
export const EFFECT_LABELS={riposte:'固守反击',heal_guard:'回春护体',pursuit_chain:'乘隙追击',rupture:'截势乘胜',battle_hymn:'济困振气',shield_bash:'借盾破阵',absorbed:'护盾吸收',bossCasts:'首领绝招',bossInterrupts:'首领受阻'};
export function journeyConsequences(j){const decisions=j?.rules===2?j.decisions:[],at=decisions?.indexOf('event:search')??-1;return {helped:!!decisions?.includes('event:rescue'),pursuit:at>=0&&!decisions.slice(at+1).some(k=>['fight','elite','boss'].includes(k))};}
export const journeyTradeCost=j=>journeyConsequences(j).helped?40:80;
export function journeyBuilds(boons){return [{name:'护盾反击',ids:['heal_guard','riposte']},{name:'借盾破阵',ids:['heal_guard','shield_bash']},{name:'疾行追击',ids:['ambush','pursuit_chain']},{name:'治疗振气',ids:['heal_guard','battle_hymn']},{name:'蓄怒截势',ids:['focus','rupture']}].map(m=>({...m,ready:m.ids.every(id=>boons.includes(id)),missing:m.ids.filter(id=>!boons.includes(id))}));}
