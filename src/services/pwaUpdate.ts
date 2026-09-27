export async function activateAppUpdate(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    if (registration?.waiting) {
      // Only the explicit update click may reload; background activation never does.
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      return;
    }
  }
  window.location.reload();
}
