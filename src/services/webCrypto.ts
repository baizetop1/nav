export interface WebCryptoEnvironment {
  crypto?: Crypto | null;
  isSecureContext?: boolean;
  protocol?: string;
}

export function getWebCryptoUnavailableReason(environment: WebCryptoEnvironment = currentEnvironment()): string | null {
  const webCrypto = environment.crypto;
  const subtle = webCrypto?.subtle;
  const supported = Boolean(
    webCrypto
    && typeof webCrypto.getRandomValues === 'function'
    && subtle
    && typeof subtle.importKey === 'function'
    && typeof subtle.deriveKey === 'function'
    && typeof subtle.encrypt === 'function'
    && typeof subtle.decrypt === 'function',
  );
  if (supported) return null;
  if (environment.protocol === 'http:' && environment.isSecureContext !== true) {
    return '当前页面通过 HTTP 打开，浏览器已禁用加密功能。请改用 HTTPS 地址后重试；本机内容没有改变。';
  }
  return '当前浏览器无法使用 Web Crypto 加密功能。请更新浏览器，或改用最新版 Chrome、Edge 或 Firefox；本机内容没有改变。';
}

export function requireWebCrypto(environment: WebCryptoEnvironment = currentEnvironment()): Crypto {
  const reason = getWebCryptoUnavailableReason(environment);
  if (reason) throw new Error(reason);
  return environment.crypto as Crypto;
}

function currentEnvironment(): WebCryptoEnvironment {
  return {
    crypto: typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto,
    isSecureContext: typeof globalThis.isSecureContext === 'boolean' ? globalThis.isSecureContext : undefined,
    protocol: typeof globalThis.location === 'undefined' ? undefined : globalThis.location.protocol,
  };
}
