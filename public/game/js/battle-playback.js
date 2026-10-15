// Local presentation timing does not change battle rules or saved combat data.
export const BATTLE_SPEEDS=[1,2,3], BATTLE_BASE_RATE=.35, BATTLE_LOG_INTERVAL=1800;
export function battleAdvance(delta,speed=1){if(!Number.isFinite(delta)||delta<0||!BATTLE_SPEEDS.includes(speed))throw new Error('无效战斗速度或时间。');return Math.min(1000,Math.floor(delta*BATTLE_BASE_RATE*speed));}
export function battleLogDelay(text,speed=1){if(!BATTLE_SPEEDS.includes(speed))throw new Error('无效战斗速度。');const body=String(text).replace(/^【[\d.]+秒】/,'');const normal=Math.max(BATTLE_LOG_INTERVAL,Math.min(4200,600+Array.from(body).length*45));return Math.max(({1:1800,2:1000,3:750})[speed],normal/speed);}
export function battleLogView(raw,knownOpening=[]){const logs=[],openingLogs=[];let opening=String(raw[0]||'').startsWith('【交战开始】'),skip=0;if(!opening)for(let n=Math.min(knownOpening.length,raw.length);n>0;n--)if(knownOpening.slice(-n).every((text,i)=>text===raw[i])){skip=n;break;}for(const [i,text]of raw.entries()){if(i<skip)continue;if(/^【[\d.]+秒】/.test(text))opening=false;if(opening&&i>0&&/^【[^】]+】/.test(text))openingLogs.push(text);else logs.push(text);}return {logs,openingLogs};}
export class BattleLogPlayback{
 constructor(){this.reset([]);}
 get busy(){return this.reading||this.pending.length>0;}
 reset(lines,restored=false){this.source=[...lines];this.lines=restored?[...lines]:lines.slice(0,1);this.pending=restored?[]:lines.slice(1);this.credit=0;this.reading=!restored&&this.lines.length>0;}
 feed(lines){let overlap=0;for(let n=Math.min(this.source.length,lines.length);n>0;n--)if(this.source.slice(-n).every((text,i)=>text===lines[i])){overlap=n;break;}this.pending.push(...lines.slice(overlap));this.source=[...lines];}
 advance(delta,speed=1){if(!Number.isFinite(delta)||delta<0||!BATTLE_SPEEDS.includes(speed))throw new Error('无效战斗速度或时间。');if(!this.busy){this.credit=0;return 0;}if(this.reading){this.credit+=Math.min(delta,1000);if(this.credit<battleLogDelay(this.lines.at(-1),speed))return 0;this.credit=0;this.reading=false;}if(!this.pending.length)return 0;this.lines.push(this.pending.shift());this.lines=this.lines.slice(-120);this.reading=true;this.credit=0;return 1;}
 flush(){this.lines.push(...this.pending);this.lines=this.lines.slice(-120);this.pending=[];this.reading=false;this.credit=0;}
}
