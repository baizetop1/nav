import {meets} from './map.js?v=0.69.0';
// The catalogue describes only chapters present in the playable data.
export const MAINLINE_PLAN=[
 {number:7,title:'破连环马',text:'观阵、备械，破开连环骑阵，再安排卸甲归营。'},
 {number:8,title:'曾头疑云',text:'选定先救人、查证或截粮；查清三件事后，去东门接齐商旅。'},
 {number:9,title:'大名救援',text:'议定暗线或正攻，打开城门与牢门，再护送伤者渡河。'},
 {number:10,title:'百川归泊',text:'接回三路归人，分定口粮、守住渡口，办妥安置后聚义。'},
 {number:11,title:'两道诏书',text:'先接流民、追回民粮，再核对两份诏书，确认护乡或受诏立约。'},
 {number:12,title:'梁山去路',text:'完成所选路线的三段行动，清点人员，落定守泊、迁海或归乡结局。'}
];
export function mainlinePlanPanel(s,d,esc){
 const implemented=MAINLINE_PLAN.filter(row=>d.chapters.some(c=>c.number===row.number));
 return '<details class="mainline-plan" data-fold="mainline-plan"><summary>后半程篇章与结局</summary><p class="note">主线已开放至第十二卷。各卷随前卷结卷依次开启；结局方向在第十一、十二卷明示确认。</p><ol>'+implemented.map(row=>{
  const c=d.chapters.find(c=>c.number===row.number),status=s.progress.flags[c.completeFlag]?'已完成':meets(s,c.condition)?'已开放':'待前卷完成';
  return '<li><div><b>第 '+row.number+' 卷 · '+esc(row.title)+'</b><span>'+status+'</span></div><p>'+esc(row.text)+'</p></li>';
 }).join('')+'</ol><p class="note">聚义按已完成的故事任务推进，不要求抽齐一百零八将。各路线都保留已有队伍与培养。</p></details>';
}
