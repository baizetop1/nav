const fields = document.getElementById('url-fields');
const info = document.getElementById('navigation-info');
let restoredFromBfcache = false;
function render() {
  const url = new URL(location.href);
  fields.replaceChildren();
  for (const key of ['href', 'protocol', 'hostname', 'port', 'pathname', 'search', 'hash']) {
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = key;
    value.textContent = url[key] || '（空）';
    fields.append(label, value);
  }
  const navigation = performance.getEntriesByType('navigation')[0];
  info.textContent = JSON.stringify({
    documentNavigationType: navigation?.type || '不可用',
    restoredFromBfcache,
    serviceWorkerControlsPage: Boolean(navigator.serviceWorker?.controller),
    note: '这些字段不自动判定 HTTP 是否发生；请记录自己的 Network 观察。',
  }, null, 2);
}
window.addEventListener('hashchange', render);
window.addEventListener('pageshow', event => { restoredFromBfcache = event.persisted; render(); });
document.getElementById('copy-template').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(document.getElementById('record-template').textContent);
    status.textContent = '已复制空白观察表，请自行填写真实结果。';
  } catch { status.textContent = '复制失败，可直接选中下方观察表手动复制。'; }
});
render();
