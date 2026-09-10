import { parseSave, validateSave, SAVE_KEY, BACKUP_KEY, SaveConflict } from './save.js?v=0.4.1';
import { slotId, slotName, slotNumber } from './portable.js?v=0.4.1';

export const DB_NAME = 'baize-shuihu-box', CHANNEL = 'baize-shuihu-slots';
export const emptySlot = id => ({id: slotId(id), name: `${slotNumber(id)}号江湖`, raw: null, backup: null, serial: 0, cloud: null});
export class SlotDatabase {
  constructor(db) { this.db = db; }
  static open(indexedDB) {
    return new Promise((resolve, reject) => {
      if (!indexedDB) return reject(new Error('浏览器不支持 IndexedDB，请导出文件备份。'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('slots', {keyPath: 'id'});
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('请关闭旧的游戏标签页后重试。'));
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(new SlotDatabase(db)); };
    });
  }
  read(id) { return this.transaction('readonly', (store,done) => { const r=store.get(slotId(id));r.onsuccess=()=>done(r.result); }); }
  all() { return this.transaction('readonly', (store,done) => { const r=store.getAll();r.onsuccess=()=>done(r.result); }); }
  transaction(mode, work) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('slots', mode); let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('本机存档事务未完成。'));
      tx.onerror = () => {};
      try { work(tx.objectStore('slots'), value => { result = value; }, e => { failure = e; tx.abort(); }); }
      catch (e) { failure = e; tx.abort(); }
    });
  }
  async migrate(storage) {
    // Do not delete or change legacy keys. Invalid originals remain recoverable in slot 01.
    let raw, backup; try { raw = storage.getItem(SAVE_KEY); backup = storage.getItem(BACKUP_KEY); } catch { return; }
    if (raw === null && backup === null) return;
    await this.transaction('readwrite', (store, done, fail) => {
      const request = store.get(1); request.onsuccess = () => {
        try{if (!request.result) store.put({...emptySlot(1), name: '原有江湖', raw, backup, serial: 1});done(true);}
        catch(e){fail(e);}
      };
    });
  }
  commit(id, serial, transform) {
    return this.transaction('readwrite', (store, done, fail) => {
      const request = store.get(slotId(id)); request.onsuccess = () => {
        try {
          const old = request.result || emptySlot(id);
          if (old.serial !== serial) throw new SaveConflict('这个存档位已被另一标签页更新。请先导出本页，再重新载入；其他编号不受影响。');
          const next = {...transform(old), id: old.id, serial: old.serial + 1};
          store.put(next); done(next);
        } catch (e) { fail(e); }
      };
    });
  }
}
export class SlotStore {
  constructor(db, data, id=1, notify=()=>{}) { this.db=db; this.data=data; this.record=emptySlot(id); this.raw=null; this.notify=notify; }
  get id() { return this.record.id; }
  async load() {
    try { this.record = await this.db.read(this.id) || emptySlot(this.id); this.raw=this.record.raw;
      return this.raw === null ? {status:'empty'} : {status:'ok',state:parseSave(this.raw,this.data)};
    } catch (e) { return {status:this.raw===null?'unavailable':'invalid',message:e.message,raw:this.raw}; }
  }
  async change(transform) {
    this.record=await this.db.commit(this.id,this.record.serial,transform);this.raw=this.record.raw;
    this.notify({id:this.id,serial:this.record.serial});return this.record;
  }
  async write(state, force=false, metadata={}) {
    validateSave(state,this.data);const next=JSON.stringify(state);
    if (new TextEncoder().encode(next).length > 2000000) throw new Error('单个存档不能超过 2 MB，请先导出。');
    return this.change(old => {
      let valid=false; if(old.raw)try{parseSave(old.raw,this.data);valid=true;}catch{if(!force)throw new Error('当前存档损坏，须确认后才能替换。');}
      // Even explicit replacement uses serial CAS: a changed preview cannot overwrite new work.
      const cloud=old.cloud?{...old.cloud,clean:!!old.cloud.clean&&old.raw===next}:null;
      return {...old,cloud,...metadata,raw:next,backup:valid&&old.raw!==next?old.raw:old.backup};
    });
  }
  rename(name) { name=slotName(name);return this.change(old=>({...old,name,cloud:old.cloud?{...old.cloud,clean:!!old.cloud.clean&&old.name===name}:null})); }
  backup() { if(!this.record.backup)throw new Error('尚无本机备份。');return parseSave(this.record.backup,this.data); }
  markCloud(cloud) { return this.change(old=>({...old,cloud})); }
}
