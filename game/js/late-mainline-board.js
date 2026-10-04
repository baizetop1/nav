import {meets} from './map.js?v=0.58.0';
import {storyObjective} from './story-guide.js?v=0.58.0';
import {ENDING_DEFINITIONS} from './late-mainline-data.js?v=0.58.0';
const introductions={
  8:'从曾市外营出发，先办选定的一件事，再接齐商旅、核清口供、夺回粮车，最后到东门讨人。',
  9:'与燕青议定暗线或正攻，逐关夺取接应点、打开牢门，再把伤者送过浅渡。每关战后都可整备。',
  10:'接回三路归人，核定军民口粮与守渡安排。安置、接应都办妥后，众人同席聚义。',
  11:'先接流民、追回口粮，再核读两份诏书。可查看两方意见并返回，最后确认才固定终章方向。',
  12:'按已确认的去路办完三段任务。最后回到去路清点营，核齐名册并记下每个人的去处。'
};
export const chapterIntroduction=chapter=>introductions[chapter.number]||'';
export function lateEndingText(s){if(!s.progress.flags.volume_twelve_complete)return '';return Object.values(ENDING_DEFINITIONS).find(e=>s.progress.flags[e.flag])?.text||'';}

export function lateMainlineBoard(s,d,esc,btn){
 const goal=storyObjective(s,d),chapter=d.chapters.find(c=>c.number===goal.chapter),ending=Object.values(ENDING_DEFINITIONS).find(e=>s.progress.flags[e.flag]);
 if(s.progress.flags.volume_twelve_complete)return '<section class="camp-overview late-mainline-board"><h2>主线已完结'+(ending?' · '+esc(ending.name):'')+'</h2><p>十二卷同行已有落幕。可在下方重读后记，也可继续回寨经营、培养好汉与历练。</p></section>';
 return '<section class="camp-overview late-mainline-board"><h2>第 '+chapter.number+' 卷 · '+esc(chapter.title)+'</h2><p>'+esc(goal.reason||goal.detail)+'</p>'+btn(goal.map===s.location?'继续此地事务':'继续当前主线',{type:'ui_storyResume'},'primary')+'<details data-fold="late-mainline-progress"><summary>本卷记录 · '+goal.done+'/'+goal.total+'</summary>'+chapter.requirements.map(r=>'<p>'+(meets(s,r.condition)?'已成':'尚待')+' · '+esc(r.label)+'</p>').join('')+'</details></section>';
}
