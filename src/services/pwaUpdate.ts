import { dismissAppUpdate } from './pwaUpdateNotice.ts';

export async function activateAppUpdate(): Promise<void> {
  if ('serviceWorker' in navigator) {
    let registration: ServiceWorkerRegistration | undefined;
    try { registration = await navigator.serviceWorker.getRegistration(import.meta.env?.BASE_URL || '/nav/'); }
    catch { throw new Error('无法读取页面更新状态，请稍后重试；当前编辑内容不会被清除。'); }
    const waiting = registration?.waiting;
    if (waiting) {
      // Only the explicit update click installs this reload listener.
      await new Promise<void>((resolve, reject) => {
        const container = navigator.serviceWorker;
        const cleanup = () => {
          clearTimeout(timeout);
          container.removeEventListener('controllerchange', activated);
          waiting.removeEventListener('statechange', changed);
        };
        const activated = () => { cleanup(); dismissAppUpdate(); window.location.reload(); resolve(); };
        const changed = () => {
          if (waiting.state === 'redundant') { cleanup(); reject(new Error('新版本未能启用，请稍后重试；当前页面未刷新。')); }
        };
        const timeout = setTimeout(() => { cleanup(); reject(new Error('页面更新等待超时，请稍后重试；当前页面未刷新。')); }, 12_000);
        container.addEventListener('controllerchange', activated, { once: true });
        waiting.addEventListener('statechange', changed);
        try { waiting.postMessage({ type: 'ACTIVATE_UPDATE' }); }
        catch { cleanup(); reject(new Error('无法启用新版本，请稍后重试；当前页面未刷新。')); }
      });
      return;
    }
  }
  dismissAppUpdate(); window.location.reload();
}
