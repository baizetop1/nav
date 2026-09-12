import { rankSnapshots } from '../../public/game/js/rotations.js';
import { prepareData } from '../../public/game/js/data.js';
import { gameSnapshot, slotName } from '../../public/game/js/portable.js';
import config from '../../public/game/data/config.json';
import heroes from '../../public/game/data/heroes.json';
import skills from '../../public/game/data/skills.json';
import items from '../../public/game/data/items.json';
import equipments from '../../public/game/data/equipments.json';
import enemies from '../../public/game/data/enemies.json';
import maps from '../../public/game/data/maps.json';
import stories from '../../public/game/data/stories.json';
import schemes from '../../public/game/data/schemes.json';
import dungeons from '../../public/game/data/dungeons.json';
import rewards from '../../public/game/data/rewards.json';
import events from '../../public/game/data/events.json';
import quests from '../../public/game/data/quests.json';
import chapters from '../../public/game/data/chapters.json';

const data=prepareData({config,heroes,skills,items,equipments,enemies,maps,stories,schemes,dungeons,rewards,events,quests,chapters});
const MAX_BYTES=2000000;
class HttpError extends Error { constructor(status,message,details={}){super(message);this.status=status;this.details=details;} }
const fail=(status,message,details)=>{throw new HttpError(status,message,details);};
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const normalize=key=>String(key||'').replace(/[\s-]/g,'').toUpperCase();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function generateKey(){return hex(crypto.getRandomValues(new Uint8Array(16))).toUpperCase().match(/.{4}/g).join('-');}
async function digest(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))));
}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'请提交 JSON。');
  if(Number(request.headers.get('Content-Length'))>MAX_BYTES)fail(413,'存档不能超过 2 MB。');
  const reader=request.body?.getReader();if(!reader)fail(400,'缺少请求内容。');let length=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();fail(413,'存档不能超过 2 MB。');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let value;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'JSON 无法解析。');}
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'请求格式不正确。');return value;
}
async function limit(env,identity,max){
  const bucket=await digest(env.KEY_PEPPER,identity),window=Math.floor(Date.now()/60000);
  const row=await env.DB.prepare(`INSERT INTO rate_limits(bucket,window,count) VALUES(?,?,1)
    ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count`).bind(bucket,window).first();
  if(row.count>max)fail(429,'请求过于频繁，请一分钟后重试。');
  await env.DB.prepare('DELETE FROM rate_limits WHERE window < ?').bind(window-2).run();
}
const summary=row=>({id:row.id,name:row.name,public:!!row.public});
const snapshot=row=>({...summary(row),cloudRevision:row.revision,updatedAt:row.updated_at,state:row.raw?gameSnapshot(JSON.parse(row.raw),data):null});
async function getSlot(env,id){const row=await env.DB.prepare('SELECT * FROM slots WHERE id=?').bind(id).first();if(!row)fail(404,'存档位不存在。');return row;}
async function authorize(request,env,row,ip,admin=false){
  await limit(env,`auth:${admin?'admin':row.id}:${ip}`,12);
  const token=normalize(request.headers.get('Authorization')?.replace(/^Bearer /i,''));
  if(!/^[A-F0-9]{32,128}$/.test(token))fail(401,'密钥无效或已被重置。');
  const actual=await digest(env.KEY_PEPPER,`${admin?'admin':row.id}:${token}`);
  const expected=admin?await digest(env.KEY_PEPPER,`admin:${normalize(env.ADMIN_KEY)}`):row.key_hash;
  if(!equal(actual,expected))fail(401,'密钥无效或已被重置。');
  return actual;
}
function expectedRevision(request){const m=/^"(0|[1-9]\d*)"$/.exec(request.headers.get('If-Match')||'');if(!m||!Number.isSafeInteger(Number(m[1])))fail(428,'请先读取云端进度，再提交准确的云端版本号。');return Number(m[1]);}
async function change(request,env,row,hash,values){
  const expected=expectedRevision(request);
  if(expected!==row.revision)fail(412,'存档已有更新。本次没有覆盖云端，请先备份本机，再查看云端进度。',{cloudRevision:row.revision});
  const updated=await env.DB.prepare(`UPDATE slots SET name=?,raw=?,public=?,revision=revision+1,updated_at=?
    WHERE id=? AND revision=? AND key_hash=? RETURNING *`).bind(values.name,values.raw,values.public,new Date().toISOString(),row.id,expected,hash).first();
  if(!updated){const current=await getSlot(env,row.id);if(current.key_hash!==hash)fail(401,'密钥已被重置，请重新授权。');fail(412,'存档已有更新。本次没有覆盖云端，请先备份本机，再查看云端进度。',{cloudRevision:current.revision});}
  return json({id:row.id,cloudRevision:updated.revision,updatedAt:updated.updated_at,public:!!updated.public},200,{ETag:`"${updated.revision}"`});
}
async function route(request,env){
  if(!env.KEY_PEPPER||env.KEY_PEPPER.length<32||!env.ADMIN_KEY||normalize(env.ADMIN_KEY).length<32)fail(503,'站长尚未配置存档服务密钥。');
  const url=new URL(request.url);
  if(url.protocol!=='https:'&&!(env.LOCAL_DEV==='true'&&['localhost','127.0.0.1'].includes(url.hostname)))fail(400,'存档服务只接受 HTTPS。');
  const ip=request.headers.get('CF-Connecting-IP')||'local';await limit(env,`request:${ip}`,120);
  if(url.pathname==='/v1/game-version'&&request.method==='GET')return json({release:data.config.release,heroes:data.heroes.length,rosterVersion:3,rotations:1,development:1,frontier:1,commands:1});
  if(url.pathname==='/v1/leaderboard'&&request.method==='GET'){const rows=await env.DB.prepare('SELECT id,raw FROM slots WHERE raw IS NOT NULL ORDER BY id').all();return json(rankSnapshots(rows.results,Date.now()));}
  if(url.pathname==='/v1/slots'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT id,name,public FROM slots ORDER BY id').all();return json({slots:rows.results.map(summary)});
  }
  const admin=/^\/v1\/admin\/slots\/(\d{1,2})\/(key|delete)$/.exec(url.pathname);
  const adminRead=/^\/v1\/admin\/slots\/(\d{1,2})$/.exec(url.pathname);
  if(adminRead&&request.method==='GET'){const row=await getSlot(env,Number(adminRead[1]));await authorize(request,env,row,ip,true);return json({...summary(row),cloudRevision:row.revision});}
  if(admin&&request.method==='POST'){
    const row=await getSlot(env,Number(admin[1]));await authorize(request,env,row,ip,true);
    if(admin[2]==='key'){
      const key=generateKey(),hash=await digest(env.KEY_PEPPER,`${row.id}:${normalize(key)}`);
      await env.DB.prepare('UPDATE slots SET key_hash=?,revision=revision+1 WHERE id=?').bind(hash,row.id).run();
      return json({id:row.id,key,message:'仅本次显示。旧密钥已失效，请安全交给这个编号的使用者。'});
    }
    const expected=expectedRevision(request);
    const removed=await env.DB.prepare('UPDATE slots SET raw=NULL,public=0,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING revision').bind(new Date().toISOString(),row.id,expected).first();
    if(!removed)fail(412,'存档已有更新，请重新查看后再删除。');return json({cloudRevision:removed.revision,message:'当前云端进度已移至受保护历史，未撤销密钥。'});
  }
  const match=/^\/v1\/slots\/(\d{1,2})(?:\/(sharing|history|rollback))?$/.exec(url.pathname);
  if(!match)fail(404,'接口不存在。');
  const row=await getSlot(env,Number(match[1])),action=match[2];
  if(!action&&request.method==='GET'){
    if(!row.public)await authorize(request,env,row,ip);
    return json(snapshot(row),200,{ETag:`"${row.revision}"`});
  }
  const hash=await authorize(request,env,row,ip);
  if(!action&&request.method==='PUT'){
    const input=await body(request);
    if(row.raw&&JSON.parse(row.raw).rosterVersion===3&&input.state?.rosterVersion!==3)fail(409,'此云端进度已升级为 108 将名册，请刷新游戏后再上传，避免旧页面覆盖新好汉。');
    if(row.raw&&JSON.parse(row.raw).commandVersion===1&&input.state?.commandVersion!==1)fail(409,'此存档已有军令、十连或装备锁定记录，请刷新至新版后上传。');
    if(row.raw&&JSON.parse(row.raw).frontier&&!input.state?.frontier)fail(409,'此存档已有据点与生产进度，请刷新至新版后上传。');
    if(row.raw&&JSON.parse(row.raw).development&&!input.state?.development)fail(409,'此存档已有专属兵种与阵容进度，请刷新至新版后上传。');
    if(row.raw&&JSON.parse(row.raw).campaign&&!input.state?.campaign)fail(409,'此存档已有轮换历练进度，请刷新至新版后上传。');
    let state,name;try{state=gameSnapshot(input.state,data);name=slotName(input.name);}catch(e){fail(400,e.message);}
    return change(request,env,row,hash,{...row,name,raw:JSON.stringify(state)});
  }
  if(action==='sharing'&&request.method==='POST'){
    const input=await body(request);if(typeof input.public!=='boolean')fail(400,'请明确是否公开。');
    if(input.public&&!row.raw)fail(400,'空位置不能公开。');return change(request,env,row,hash,{...row,public:Number(input.public)});
  }
  if(action==='history'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT revision,name,updated_at FROM history WHERE slot=? ORDER BY revision DESC LIMIT 10').bind(row.id).all();
    return json({id:row.id,cloudRevision:row.revision,history:rows.results.map(r=>({cloudRevision:r.revision,name:r.name,updatedAt:r.updated_at}))});
  }
  if(action==='rollback'&&request.method==='POST'){
    const input=await body(request);if(!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'历史版本无效。');
    const old=await env.DB.prepare('SELECT name,raw FROM history WHERE slot=? AND revision=?').bind(row.id,input.revision).first();
    if(!old)fail(404,'该版本已不在最近十份历史中。');
    let raw;try{raw=JSON.stringify(gameSnapshot(JSON.parse(old.raw),data));}catch{fail(400,'旧历史与当前游戏数据不兼容，无法回滚。');}
    return change(request,env,row,hash,{...row,name:old.name,raw});
  }
  fail(405,'此操作不受支持。');
}
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
    if(origin&&!allowed.includes(origin))return json({error:'此网站未获准使用存档接口。'},403);
    let response;
    try{response=request.method==='OPTIONS'?new Response(null,{status:204}):await route(request,env);}
    catch(e){response=json({error:e.status?e.message:'存档服务暂时不可用。原进度未被主动清空，请稍后查看云端版本。',...(e.details||{})},e.status||503);}
    if(origin)response.headers.set('Access-Control-Allow-Origin',origin);
    response.headers.set('Vary','Origin');response.headers.set('Access-Control-Allow-Methods','GET,PUT,POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers','Content-Type,Authorization,If-Match');response.headers.set('Access-Control-Expose-Headers','ETag');
    if(response.status===429)response.headers.set('Retry-After','60');return response;
  }
};
