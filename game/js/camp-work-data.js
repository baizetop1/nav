import {heroTier} from './hero-tiers.js?v=0.91.0';
export const WORK_CYCLE=30*60*1000,WORK_OFFLINE_CAP=8*60*60*1000,WORK_STOCK_CAP=10000000;
export const WORK_RESOURCE_NAMES={herb:'药草',cloth:'粗布',food:'粮草'};
// Personal trades are distinct from battle aptitude. Pending trades have no hidden bonuses.
export const CAMP_PROFESSIONS={
 andaoquan:{name:'辨症坐诊',job:'clinic',text:'每批接诊较多，药草和粗布用量较省。',implemented:true},
 tanglong:{name:'铁匠主事',job:'workshop',text:'增加冶铁工坊每批加工额度；仍须支付原料。',implemented:true},
 huangfuduan:{name:'相马照料',job:'stable',text:'坐骑照料专长；养马订单尚未开办。',implemented:false},
 taozongwang:{name:'农务营建',job:'farm',text:'增加农田每批粮草产量。',implemented:true},
 jiangjing:{name:'钱粮清点',job:'farm',text:'清点粮袋，增加农田每批粮草产量。',implemented:true},
 linchong:{name:'兵营教习',job:'training',text:'教习专长；自动训练尚未开办。',implemented:false},
 liangxing:{name:'小诊省药',job:'clinic',text:'小批诊疗省药，接诊人数少于安道全。',implemented:true},
 xuezhen:{name:'基础铁工',job:'workshop',text:'专做基础铁料，工坊额度高于普通散人。',implemented:true},
 jitang:{name:'马厩看护',job:'stable',text:'马厩照料专长；养马订单尚未开办。',implemented:false},
 zhuli:{name:'药材照管',job:'herbs',text:'药材整理专长；药圃订单尚未开办。',implemented:false},
 yinmiao:{name:'粮仓保管',job:'farm',text:'擅长粮袋整理，农田每批增产。',implemented:true},
 fangpu:{name:'甲料缝制',job:'armor',text:'甲料加工专长；制甲订单尚未开办。',implemented:false}
};
export function professionProfile(hero){
 if(!hero)return null;const rarity=heroTier(hero).rarity,trade=CAMP_PROFESSIONS[hero.id];
 return {id:hero.id,rarity,name:trade?.name||'寨中帮工',job:trade?.job||'general',text:trade?.text||'可以协助生产与基础包扎；星级、等级和品阶影响任职效果。',implemented:trade?.implemented??true,
 supportedJobs:['farm','lumber','workshop','clinic'],pendingJobs:trade&&!trade.implemented?[trade.job]:[],specialist:!!trade&&trade.implemented};
}
