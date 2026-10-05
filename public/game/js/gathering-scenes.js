// Presentation only: never creates story flags, items, or a scheme outcome.
export function gatheringMoment(s){
 const id=s.location,f=s.progress.flags;
 if(['dongxi','zhuang','creek','guesthouse'].includes(id)){
  if(f.huangni_complete)return {label:'取纲之后',text:{dongxi:'村口的船少了两只。庄客见你回来，低声说：“都平安，先进去歇脚。”',zhuang:'厅里的茶已凉了。晁盖让庄客添上一壶，问起回程有没有官差。',creek:'渔船已重新系好，湿网搭在船边。阮小七洗去脚上的泥，朝你招手。',guesthouse:'路图已经收起。吴用留了盏灯，正等探路的人回来报个平安。'}[id]};
  if(f.seven_stars)return {label:'聚义之后',text:{dongxi:'庄门半掩着，屋里的人已各自准备行装。庄客告诉你，黄泥冈那条路要趁早去看。',zhuang:'刘唐试了试扁担的分量。吴用看过枣筐，叫众人先照常说笑，别让乡人起疑。',creek:'三阮把渔网收进船舱，留下空处。阮小七说：“去探路罢，水上的事有我们。”',guesthouse:'吴用将路图推到你面前：“官道旁有片松林，押担子的必会歇脚。你先去看。”'}[id]};
  if(!s.progress.stories.seven_stars_story&&id==='guesthouse')return {label:'庄后客舍',text:'屋里备着茶，桌上压着一张路图。庄客请你先去前厅见晁盖。'};
 }
 if(['huangni','ridge','pines','winepath'].includes(id)&&f.huangni_complete)return {label:'取纲之后',text:{huangni:'押担子的队伍早已散去。路边只剩几根草绳，风一吹，贴着黄土打转。',ridge:'松荫里留着一只空碗。吴用将它拾起，催你沿来路下冈。',pines:'树后的脚印乱作一片，枣筐已搬走了。枝头的蝉还在叫。',winepath:'白胜挑着空酒桶走远了。小径上洒出的酒已晒干，只留下两道深色的印子。'}[id]};
 return null;
}
export function storyVoice(id,step){
 if(id==='linchong_story')return {speaker:'林冲',hero:'linchong',start:'与林冲说话'};
 if(id==='wusong_story')return {speaker:'武松',hero:'wusong',start:'与武松说话'};
 if(id==='seven_stars_story')return {speaker:step==='brothers'?'阮小七':step==='pledge'?'吴用':'晁盖',hero:step==='brothers'?'ruanxiaoqi':step==='pledge'?'wuyong':'chaogai',start:'进厅见晁盖'};
 if(id==='external_chaogai')return {speaker:'晁盖',hero:'chaogai',start:'问问庄前的乡人'};
 return null;
}
