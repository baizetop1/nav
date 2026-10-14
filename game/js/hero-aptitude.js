// Aptitude is a fixed character definition, separate from recruitment rarity,
// historical star position and the player's cultivation quality.
export const APTITUDE_GRADES=Object.freeze({
 A:Object.freeze({id:'A',name:'甲等',power:1.16,trainingRate:1}),
 B:Object.freeze({id:'B',name:'乙等',power:1.08,trainingRate:.90}),
 C:Object.freeze({id:'C',name:'丙等',power:1,trainingRate:.80})
});
export const HERO_APTITUDES=Object.freeze({
 // 甲等：阵容核心；五虎将以及六位地煞的战术专长。
 songjiang:'A',lujunyi:'A',wuyong:'A',gongsunsheng:'A',guansheng:'A',
 linchong:'A',qinming:'A',huyanzhuo:'A',huarong:'A',luzhishen:'A',
 wusong:'A',dongping:'A',zhangqing:'A',yangzhi:'A',xuning:'A',
 lijun:'A',zhangshun:'A',yanqing:'A',zhuwu:'A',sunli:'A',
 lingzhen:'A',andaoquan:'A',husanniang:'A',fanrui:'A',
 // 乙等：擅长特定阵容、地形或配合。
 chaijin:'B',liying:'B',zhutong:'B',suochao:'B',daizong:'B',
 liutang:'B',likui:'B',shijin:'B',muhong:'B',leiheng:'B',
 ruanxiaoer:'B',zhangheng:'B',ruanxiaowu:'B',ruanxiaoqi:'B',yangxiong:'B',
 shixiu:'B',jiezhen:'B',jiebao:'B',huangxin:'B',xuanzan:'B',
 haosiwen:'B',hantao:'B',pengqi:'B',shantinggui:'B',weidingguo:'B',
 xiaorang:'B',peixuan:'B',oupeng:'B',dengfei:'B',yanshun:'B',
 yanglin:'B',jiangjing:'B',lvfang:'B',guosheng:'B',huangfuduan:'B',
 wangying:'B',baoxu:'B',xiangchong:'B',ligun:'B',tongwei:'B',
 tongmeng:'B',gongwang:'B',dingdesun:'B',caozheng:'B',jiaoting:'B',
 gudasao:'B',sunerniang:'B',shiqian:'B',
 // 丙等：低成本成队；战斗本领和寨中分工继续保留。
 kongming:'C',kongliang:'C',jindajian:'C',malin:'C',mengkang:'C',
 houjian:'C',chenda:'C',yangchun:'C',zhengtianshou:'C',taozongwang:'C',
 songqing:'C',yuehe:'C',muchun:'C',songwan:'C',duqian:'C',
 xueyong:'C',shien:'C',lizhong:'C',zhoutong:'C',tanglong:'C',
 duxing:'C',zouyuan:'C',zourun:'C',zhugui:'C',zhufu:'C',
 caifu:'C',caiqing:'C',lili:'C',liyun:'C',shiyong:'C',
 sunxin:'C',zhangqing_gardener:'C',wangdingliu:'C',yubaosi:'C',baisheng:'C',
 duanjingzhu:'C'
});
export function heroAptitude(hero){
 if(!hero||hero.group==='external')return null;
 return APTITUDE_GRADES[HERO_APTITUDES[hero.id]]||null;
}
export function starPosition(hero){
 if(!hero||hero.group==='external'||!Number.isInteger(hero.seat)||hero.seat<1||hero.seat>108)return '';
 return hero.seat<=36?'天罡':'地煞';
}
export function aptitudeBadge(hero){
 const grade=heroAptitude(hero);
 return grade?'<span class="hero-aptitude hero-aptitude-'+grade.id+'" aria-label="资质：'+grade.name+'">'+grade.name+'</span>':'';
}

// Silver discounts leave personal ingredients and all previous training intact.
export function aptitudeSilver(hero,amount){const model=typeof hero==='string'?{id:hero}:hero;return Math.ceil(amount*(heroAptitude(model)?.trainingRate||1));}
