import {harborMoment} from './harbor-scenes.js?v=0.69.0';
import {gatheringMoment,storyVoice} from './gathering-scenes.js?v=0.69.0';
import {meets,heroRank} from './map.js?v=0.69.0';
import {storyObjective} from './story-guide.js?v=0.69.0';
export const JOURNEY_ART={harbor:'./art/scenes/liangshan-ferry-v1.webp',village:'./art/scenes/dongxi-manor-v1.webp',huangni:'./art/scenes/huangni-pines-v1.webp',town:'./art/scenes/yuncheng-street-v1.webp',tavern:'./art/scenes/wine-tavern-v1.webp',ridge:'./art/scenes/jingyang-ridge-v1.webp'};
export const JOURNEY_PLACES={liangshan:'harbor',ferry:'harbor',dongxi:'village',zhuang:'village',creek:'village',guesthouse:'village',huangni:'huangni',ridge:'huangni',pines:'huangni',winepath:'huangni',yuncheng:'town',office:'town',gate:'town',tavern:'tavern',inn:'tavern',jingyang:'ridge',path:'ridge',drywood:'ridge',stone:'ridge',tracks:'ridge',deepforest:'ridge'};
export const hasJourneyScene=id=>Object.hasOwn(JOURNEY_PLACES,id);
export function tigerStage(s){const f=s.progress.flags,p=s.progress.stories.wusong_story;return f.tiger_complete||p?.status==='completed'?5:p?.step==='after'?4:f.trail_followed?3:f.tracks_found?2:f.wusong_met?1:0;}
export function journeyMoment(s,d){
 if(!hasJourneyScene(s.location))return null;
 const map=d.by.maps[s.location],stage=tigerStage(s),goal=storyObjective(s,d),key=JOURNEY_PLACES[s.location],time=s.worldMinute<360||s.worldMinute>=1080?'night':s.worldMinute>=960?'evening':'day';
 const voices={liangshan:'船家',ferry:'船家',dongxi:'庄客',zhuang:'庄前',creek:'渡口',guesthouse:'客舍',huangni:'冈口',ridge:'松岗',pines:'松荫',winepath:'小径',yuncheng:'街口',office:'榜文旁',gate:'行脚客',tavern:'邻桌酒客',inn:'店家',jingyang:'冈下木牌',path:'山道',drywood:'树根旁',stone:'大青石',tracks:'草丛边',deepforest:'密林深处'};
 let text=map.description,speaker=voices[s.location],hero=null,label='眼前',actions=[];
 if(stage===5){const after={yuncheng:'车马照旧过街。有人说起冈上的虎，提到武松时，围听的人又多了几个。',office:'榜前多了一张报捷的纸。差役说，那只伤人的大虫已经打死了。',gate:'“如今过冈踏实多了。”行脚客系紧草鞋，向你拱了拱手。',tavern:'“打虎那位，你认得？”邻桌把凳子挪近了些，等着听你说。',inn:'店家认出你，先摆下一只碗：“那日真没拦住他，幸亏没出事。”',jingyang:'警示木牌还立在路边。几个挑担人结伴上冈，脚步比从前快了。',path:'山路上又有脚步声。樵夫扛着柴下山，向你借过。',drywood:'树根旁的爪印还在，边缘已被落叶盖住。有人循着你留下的记号走过。',stone:'石面上落着几片松针。过路人在这里放下担子，歇一歇肩。',tracks:'那几道爪痕仍留在树上。你记得，当时就是从这里进了深林。',deepforest:'折断的树枝还没收拾。风穿过树冠，这回没有别的声响。'};if(after[s.location]){text=after[s.location];label='打虎之后';}}
 else if(stage>=2&&s.location==='drywood'){text='树干上留着你划的记号。沿原路退回山道，便能找到虎踪。';label='爪印已查';}
 else if(stage>=3&&s.location==='tracks'){text='你拨开的枝条还垂在一旁。前面那条窄路通向密林深处。';label='道路已明';}
 const gathering=harborMoment(s)||gatheringMoment(s);if(gathering){text=gathering.text;label=gathering.label;}
 const story=map.stories.map(id=>d.by.stories[id]).find(m=>{const p=s.progress.stories[m.id];return p?.status!=='completed'&&(p?m.steps[p.step].map===s.location&&meets(s,m.steps[p.step].condition):m.map===s.location&&meets(s,m.condition));});
 if(story){const progress=s.progress.stories[story.id],voice=storyVoice(story.id,progress?.step);if(progress){const step=story.steps[progress.step];text=step.text;speaker=voice?.speaker||story.title;hero=voice?.hero||null;label=story.title;actions=step.choices.map(c=>({label:c.label,command:{type:'story',id:story.id,choice:c.id},disabled:!meets(s,c.condition),condition:c.condition}));}else actions.push({label:voice?.start||story.title,command:{type:'story',id:story.id}});}
 const localActions=map.actions.filter(a=>meets(s,a.condition)&&(!a.once||!s.progress.actions[a.id])&&!(stage===5&&a.id==='rumor_tiger')).map(a=>({label:a.label,command:{type:'mapAction',id:a.id}}));
 const people=d.heroes.filter(h=>h.meetMap===s.location&&meets(s,h.meetCondition)&&heroRank[s.heroes[h.id].status]<2).map(h=>({label:h.id==='baisheng'?'与卖酒汉子交谈':h.id==='shiqian'?'与窗边瘦汉交谈':'与'+h.title+'交谈',command:{type:'meet',id:h.id}}));
 if(s.location==='tavern'&&s.heroes.baisheng.status==='known'&&!s.progress.flags.guide)people.unshift({label:'邀白胜作向导',command:{type:'guide'}});
 if(!actions.length){if(['drywood','tracks'].includes(s.location)&&localActions.length)actions=[localActions[0]];else if(s.location==='tavern'){const companion=people.find(p=>p.command.id==='baisheng'||p.command.type==='guide'),rumor=localActions.find(p=>p.command.id==='rumor_tiger');if(companion)actions=[companion];else if(rumor)actions=[rumor];}else if(s.location==='yuncheng'&&stage===0&&!s.progress.visited.includes('tavern'))actions=[{label:'去酒肆看看',command:{type:'move',id:'tavern'}}];}
 if(s.location==='ridge'&&s.progress.flags.seven_stars&&!s.progress.flags.huangni_complete){text='吴用叫众人到树荫下：“先看看军汉们的动静，不急着叫白胜出来。”';speaker='吴用';hero='wuyong';actions=[{label:'商议取纲计策',command:{type:'startScheme'}}];}
 const next={label:goal.action&&goal.map===s.location?goal.title:goal.map?'前往'+d.by.maps[goal.map].name:goal.title,command:goal.action&&goal.map===s.location?goal.action:{type:'ui_storyResume'}};
 if(!actions.length)actions=[next];
 // Full original prose stays available on the text page. Show only the first paragraph in the scene.
 const paragraphs=text.split(/\n+/).filter(Boolean),note=paragraphs.slice(1).join(' ');
 return {map,key,art:JOURNEY_ART[key],time,stage,label,speaker,hero,text:paragraphs[0],note,actions,people,localActions,next,goal};
}
