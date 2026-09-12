import { emptySlot } from './slots.js?v=0.9.0';
import { slotNumber } from './portable.js?v=0.9.0';
import { icon } from './icons.js?v=0.9.0';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const button=(label,type,extra={},symbol='save',disabled=false)=>`<button type="button" class="secondary with-icon" data-command="${esc(JSON.stringify({type,...extra}))}" ${disabled?'disabled':''}>${icon(symbol)}<span>${esc(label)}</span></button>`;
export const localOptions=(slots,selected)=>Array.from({length:20},(_,i)=>slots.find(s=>s.id===i+1)||emptySlot(i+1)).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${slotNumber(s.id)}号 · ${esc(s.name)} · ${s.raw?'已有进度':'空位'}</option>`).join('');
export function saveBoxPage(state,status,locked,box={}){
  const record=box.record||emptySlot(1),slots=box.slots||[],link=record.cloud,cloud=box.cloud||{},selected=cloud.selected||record.id;
  const linked=link&&link.origin===cloud.baseUrl;
  const syncText=!cloud.baseUrl?'未连接（本机保存不等于云端上传）':!linked?'当前本机档尚未关联云端':link.clean&&!box.dirty?`已提交 / 接续 ${slotNumber(link.id)}号第 ${link.revision} 版`:`尚有本机变化未上传（含时间刷新） · 基于 ${slotNumber(link.id)}号第 ${link.revision} 版`;
  return `<div class="section-top"><div><p class="kicker">20 个编号 · 每份江湖，各自珍重</p><h1 class="page-title">${icon('save')}<span>梁山存档匣</span></h1></div></div>
  <section class="savebox-current card"><h2>本机 ${slotNumber(record.id)}号 · ${esc(record.name)}</h2>
    <p class="notice ${locked?'error':''}">本机：${esc(status)}</p><p class="note">云端：${esc(syncText)}</p>
    <div class="actions">${button('导出当前进度','ui_export',{},'download')}${button('重新载入本机存档','ui_reload',{},'restore')}${button('恢复上次有效备份','ui_backup',{},'restore')}</div>
    <p class="note">本机自动保存使用 IndexedDB；每档最多一份有效备份。无痕窗口、清理网站数据或浏览器回收空间都可能丢失本机档，请定期导出。</p>
    <details class="fold-section" data-fold="slots"><summary>切换 / 命名本机存档（01—20）</summary>
      <label>接续本机位置<select id="local-slot">${localOptions(slots,record.id)}</select></label>${button('切换到所选位置','ui_slotSwitch',{},'restore')}
      <label>当前档名称<input id="slot-name" maxlength="40" value="${esc(record.name)}"></label>${button('保存名称','ui_slotRename',{},'check')}
      <p class="note">空位会打开新卷；不同编号互不覆盖。同编号被其他标签页修改时，会暂停本页写入。</p>
    </details>
  </section>
  <section class="fold-section savebox-files"><h2>${icon('upload')} 从其他设备导入存档</h2><p class="note">旧设备点击“导出当前进度”，将 JSON 文件发到此设备，在下方选择文件即可。无需云端服务或上传密钥。</p>
    <label>选择存档 JSON 文件<input id="import-file" type="file" accept=".json,application/json"></label><label for="import-text">或粘贴存档文本</label><textarea id="import-text" spellcheck="false" placeholder="在这里粘贴导出的 JSON"></textarea>
    ${button('检查导入内容','ui_import',{},'upload')}<p class="note">先校验和预览，再选择目标本机编号，最后确认替换。文件只包含游戏进度，不包含导航、Inbox 或密钥。文件里的云端版本仅供识别，不授予上传权限。</p>
  </section>
  <details class="fold-section savebox-cloud" data-fold="cloud"><summary>${icon('upload')} 云端接续与朋友分享</summary>
    <p class="note">全站共享 01—20 号，由站长分配密钥，不是每个访客各占 20 号。本机位置与云端位置可以不同；上传始终需要对应密钥。</p>
    ${cloud.baseUrl?`<p class="meta">服务：${esc(cloud.baseUrl)}</p><div class="actions">${button('刷新云端列表','ui_cloudList',{},'restore')}${button('清除本页授权','ui_cloudForget',{},'close')}</div>
      <label>云端编号<select id="cloud-slot">${Array.from({length:20},(_,i)=>{const s=cloud.slots?.find(s=>s.id===i+1);return `<option value="${i+1}" ${selected===i+1?'selected':''}>${slotNumber(i+1)}号 · ${s?`${esc(s.name)} · ${s.public?'公开副本':'私有'}`:'尚未读取'}</option>`;}).join('')}</select></label>
      <label>此编号的上传 / 私有访问密钥<input id="cloud-key" type="password" autocomplete="off" placeholder="由站长分配，仅在本页内存中使用"></label>
      <p class="note">公开档可留空下载副本；持有上传密钥的人能更新此编号，请仅交给信任的人。</p>
      <div class="actions">${button('查看云端进度 / 下载副本','ui_cloudDownload',{},'download')}${button('手动上传本机进度','ui_cloudUpload',{},'upload')}</div>
      <p id="cloud-message" role="status" class="${cloud.conflict?'warning':'note'}">${esc(cloud.message||'尚未提交云端。点击查看会先预览，不会自动覆盖本机。')}</p>
      ${cloud.conflict?`<div class="actions">${button('先备份本机进度','ui_export',{},'download')}${button('查看云端进度并选择接续','ui_cloudDownload',{},'restore')}${button('重新比较并上传本机进度','ui_cloudReplace',{},'upload')}</div>`:''}
      <details class="fold-section" data-fold="sharing"><summary>公开设置与历史回滚（需要此档密钥）</summary><p class="note">默认私有。关闭公开仅阻止后续免密下载，不能收回朋友已保存的副本。回滚会创建一个新的云端版本，不自动替换本机。</p>
        <div class="actions">${button('开启公开副本','ui_cloudShare',{value:true},'heroes')}${button('关闭公开副本','ui_cloudShare',{value:false},'shield')}${button('读取最近十份历史','ui_cloudHistory',{},'restore')}</div>
        ${cloud.history?.id===selected?`<ul class="savebox-history">${cloud.history.history.map(h=>`<li>第 ${h.cloudRevision} 版 · ${esc(h.name)} · ${esc(h.updatedAt||'—')}${button('回滚至此版','ui_cloudRollback',{revision:h.cloudRevision},'restore')}</li>`).join('')||'<li>尚无历史。</li>'}</ul>`:''}
      </details>
      <details class="danger-zone" data-fold="cloud-admin"><summary>站长管理（不要向朋友提供站长密钥）</summary><label>站长密钥<input id="admin-key" type="password" autocomplete="off"></label><p class="note">为所选编号生成 / 重置独立密钥；旧密钥立即失效。新密钥仅在一次结果弹窗中显示。</p><div class="actions">${button('生成 / 重置此档密钥','ui_cloudAdminKey',{},'shield')}${button('删除云端当前进度','ui_cloudAdminDelete',{},'trash')}</div></details>`
      :'<p class="warning">云端服务尚未配置。本站目前只有本机存档和文件流转；上传到 GitHub 并不会自动开通云端。站长请按 docs/shuihu-save-box.md 部署接口。</p>'}
  </details>
  <details class="danger-zone" data-fold="reset"><summary>另开新卷（只替换本机当前 ${slotNumber(record.id)}号）</summary><p class="note">建议先导出。不删除云端档，不影响其他编号、导航、博客、Inbox 或学习记录。</p><label>输入“白泽新卷”确认<input id="reset-phrase" autocomplete="off"></label>${button('确认另开新卷','ui_reset',{},'restore')}</details>`;
}
export function boxImportDialog(pending,slots,current){
  const s=pending.state;
  return `<dialog id="import-confirm" aria-labelledby="import-title"><h2 id="import-title">确认接续这份梁山志？</h2>
    <p>${esc(pending.name||'游戏存档')} · ${esc(new Date(s.clock).toLocaleString('zh-CN'))}</p><p>威望 ${s.player.prestige}，正式好汉 ${Object.values(s.heroes).filter(h=>h.status==='owned').length} 名。${s.battle?'含未结束 / 待结算战局，接续后先暂停。':''}</p>
    ${pending.cloud?`<p class="note">云端 ${slotNumber(pending.cloud.id)}号第 ${pending.cloud.revision} 版。下载的是副本，不包含上传密钥。</p>`:''}
    <label>保存到本机位置<select id="import-slot">${localOptions(slots,current)}</select></label>
    <p class="warning">确认后接续所选编号，替换它的原有进度，并保留一份有效备份；不影响其他编号。若预览后另一标签页更新了目标，将拒绝覆盖。建议先导出当前进度。</p>
    <div class="actions">${button('确认导入并替换','ui_confirmImport',{},'check')}${button('取消','ui_cancelImport',{},'close')}</div></dialog>`;
}
