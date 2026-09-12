import { gameSnapshot, slotId, slotName } from './portable.js?v=0.15.0';
const revision=n=>{if(!Number.isSafeInteger(n)||n<0)throw new Error('云端版本格式无效。');return n;};
const listing=s=>({id:slotId(s.id),name:slotName(s.name),public:s.public===true});
export class CloudError extends Error { constructor(message,status,details={}){super(message);this.status=status;Object.assign(this,details);} }
export class CloudClient {
  constructor(baseUrl,data,fetcher=(...args)=>fetch(...args)){
    this.data=data;this.fetcher=fetcher;this.keys=new Map();this.baseUrl='';
    if(baseUrl){const url=new URL(baseUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('云端地址须为无路径、无凭据的 HTTPS 来源。');this.baseUrl=url.origin;}
  }
  setKey(id,key){id=slotId(id);key=String(key||'').trim();if(key)this.keys.set(id,key);}
  forget(){this.keys.clear();}
  async request(path,{method='GET',id,key,revision,body}={}){
    if(!this.baseUrl)throw new Error('云端服务尚未部署或配置；本机存档与文件备份仍可使用。');
    const headers={};if(body)headers['Content-Type']='application/json';
    const token=key??this.keys.get(id);if(token)headers.Authorization='Bearer '+token;
    if(revision!==undefined)headers['If-Match']=`"${revision}"`;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const res=await this.fetcher(this.baseUrl+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
      const value=await res.json();if(!res.ok)throw new CloudError(this.data.heroes.length===108&&String(value.error).includes('好汉字典')?'云端存档服务仍是旧名册，请先更新存档服务至 0.8.0，再上传 108 将进度。本机进度已保留，可先导出文件备份。':value.error||'云端操作失败。',res.status,{cloudRevision:value.cloudRevision});return value;
    }catch(e){if(e instanceof CloudError)throw e;throw new Error('无法确认云端结果（网络、超时或地址配置问题）。不要反复覆盖提交；请先查看云端，再接续或重试。');}
    finally{clearTimeout(timer);}
  }
  async list(){const r=await this.request('/v1/slots');if(!Array.isArray(r.slots)||r.slots.length!==20)throw new Error('云端列表格式无效。');const slots=r.slots.map(listing);if(new Set(slots.map(s=>s.id)).size!==20)throw new Error('云端编号重复。');return {slots};}
  async download(id){id=slotId(id);const r=await this.request(`/v1/slots/${id}`,{id});if(r.id!==id)throw new Error('云端编号不匹配。');return {...listing(r),cloudRevision:revision(r.cloudRevision),updatedAt:r.updatedAt,state:r.state?gameSnapshot(r.state,this.data):null};}
  async leaderboard(){const r=await this.request('/v1/leaderboard');if(!/^\d{4}-\d{2}-[1-4]$/.test(r.period)||!Array.isArray(r.entries)||r.entries.length>20||r.entries.some(e=>!Number.isInteger(e.id)||e.id<1||e.id>20||!Number.isInteger(e.tier)||e.tier<1||e.tier>5||!Number.isInteger(e.score)||e.score<1000000||e.score>5100180||!Number.isInteger(e.rank)||e.rank<1||e.rank>20))throw new Error('排行榜数据无效。');return {period:r.period,entries:r.entries.map(({id,tier,score,rank})=>({id,tier,score,rank}))};}
  async verifiedLeaderboard(){const r=await this.request('/v1/verified-leaderboard');if(r.verified!==true||!/^\d{4}-\d{2}-[1-4]$/.test(r.period)||!Array.isArray(r.entries)||r.entries.length>20||r.entries.some(e=>!Number.isInteger(e.id)||e.id<1||e.id>20||!Number.isInteger(e.tier)||e.tier<1||e.tier>5||!Number.isInteger(e.score)||e.score<1000000||e.score>5100180||!Number.isInteger(e.rank)||e.rank<1||e.rank>20))throw new Error('服务器演武榜格式无效。');return r;}
  async verify(id,rev,tier){const r=await this.request('/v1/slots/'+slotId(id)+'/verify',{id,method:'POST',revision:rev,body:{tier}});if(r.verified!==true||r.id!==id||!['victory','defeat','retreat'].includes(r.outcome))throw new Error('演武结果格式无效。');return r;}
  async upload(id,revision,state,name){const affairs=state.affairs,strategy=state.strategy,commands=state.commandVersion===1,frontier=state.frontier||state.battle?.frontierRules,advanced=state.development||state.battle?.martial===2,rotations=state.campaign||state.battle?.martial||state.camp?.arm;if(affairs||strategy||commands||frontier||advanced||rotations){const version=await this.request('/v1/game-version');if(commands&&version.commands!==1)throw new Error('请先更新云存档服务至 0.12.0，再上传军令、十连与装备锁定进度。本机进度已保留。');if(frontier&&version.frontier!==1)throw new Error('请先更新云存档服务至 0.11.0，再上传领地生产与新战法进度。本机进度已保留。');if(advanced&&version.development!==1)throw new Error('请先更新云存档服务至 0.10.0，再上传专属兵种与阵容进度。本机进度已保留。');if(rotations&&version.rotations!==1)throw new Error('请先更新云存档服务至 0.9.0，再上传轮换历练与兵种进度。本机进度已保留。');if(affairs&&version.management!==1)throw new Error('请先更新云存档服务至 0.14.0，再上传寨事和外派进度。本机进度已保留。');if(strategy&&version.strategy!==1)throw new Error('请先更新云存档服务至 0.13.0，再上传部队专精和副本机制进度。本机存档已保留。');}id=slotId(id);return this.request(`/v1/slots/${id}`,{id,method:'PUT',revision,body:{state:gameSnapshot(state,this.data),name}});}
  sharing(id,revision,value){return this.request(`/v1/slots/${slotId(id)}/sharing`,{id,method:'POST',revision,body:{public:value}});}
  async history(id){id=slotId(id);const r=await this.request(`/v1/slots/${id}/history`,{id});if(r.id!==id||!Array.isArray(r.history)||r.history.length>10)throw new Error('云端历史格式无效。');return {id,cloudRevision:revision(r.cloudRevision),history:r.history.map(h=>({cloudRevision:revision(h.cloudRevision),name:slotName(h.name),updatedAt:String(h.updatedAt||'')}))};}
  rollback(id,revision,old){return this.request(`/v1/slots/${slotId(id)}/rollback`,{id,method:'POST',revision,body:{revision:old}});}
  admin(id,action,key,revision){return this.request(`/v1/admin/slots/${slotId(id)}/${action}`,{method:'POST',key,revision});}
}
