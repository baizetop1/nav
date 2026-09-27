import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const appUrl = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/');
appUrl.hash = '';
const origin = appUrl.origin;
const output = new URL('../artifacts/appearance/', import.meta.url);
const preferenceKey = 'baize_appearance_v1';
const themes = [
  { id: 'landscape', name: '山水清境' },
  { id: 'mist', name: '雾蓝晨光' },
  { id: 'paper', name: '暖纸书房' },
  { id: 'graphite', name: '石墨极简' },
];
const routes = [
  { hash: '', name: 'home', ready: '.navigation-content' },
  { hash: '/blog', name: 'blog', ready: 'main.appearance-surface' },
  { hash: '/admin', name: 'admin', ready: '.admin-shell' },
  { hash: '/tech-os', name: 'tech-os', ready: '#tech-os-sidebar' },
];
const errors = [], blockedExternal = [], attemptedWrites = [], contrastResults = [];
const fixedTime = Date.UTC(2026, 8, 27, 4); // Local noon in the test's Asia/Shanghai zone.
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BAIZE_BROWSER_CHANNEL || 'msedge', headless: true });

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // Let existing color/opacity transitions finish before measurements.
}

async function ready(page, route = routes[0]) {
  await page.locator(route.ready).first().waitFor({ state: 'attached' });
  await page.locator('button[aria-label="打开外观设置"]:visible').first().waitFor();
  await settle(page);
}

async function navigate(page, route) {
  await page.evaluate(hash => { location.hash = hash; }, route.hash);
  await page.waitForFunction(hash => location.hash.replace(/^#/, '') === hash, route.hash);
  await ready(page, route);
}

async function preference(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), preferenceKey);
}

async function assertTheme(page, expected) {
  await page.waitForFunction(id => document.documentElement.dataset.appearance === id, expected);
}

async function openAppearance(page) {
  // A mobile sidebar can be CSS-visible but translated outside the viewport.
  const candidates = page.locator('button[aria-label="打开外观设置"]:visible');
  const index = await candidates.evaluateAll(elements => elements.findIndex(element => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  }));
  assert.ok(index >= 0, 'an appearance entry is reachable in the current viewport');
  const trigger = candidates.nth(index);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '外观设置', exact: true });
  await dialog.waitFor();
  return { dialog, trigger };
}

async function selectTheme(page, theme) {
  const { dialog } = await openAppearance(page);
  const radio = dialog.getByRole('radio', { name: theme.name, exact: true });
  await radio.click(); // Clicking an already-selected daily card also explicitly selects fixed mode.
  assert.equal(await radio.isChecked(), true);
  assert.equal(await dialog.getByRole('radio', { name: '固定主题', exact: true }).isChecked(), true);
  await assertTheme(page, theme.id);
  await dialog.getByRole('button', { name: '关闭外观设置', exact: true }).click();
  await settle(page);
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.width + 1 && dimensions.body <= dimensions.width + 1, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
}

async function assertContrast(page, label) {
  // Measure real primary buttons, including their child text nodes, not just palette constants.
  // These buttons have solid surfaces, so image/backdrop compositing is not ambiguous.
  const result = await page.locator('.baize-button-primary:visible').evaluateAll(buttons => {
    const parse = value => {
      const values = value.match(/[\d.]+/g)?.map(Number);
      if (!values || values.length < 3) throw new Error(`Unsupported computed color: ${value}`);
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    const luminance = color => color.slice(0, 3).map(value => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);
    return buttons.filter(button => !button.disabled && button.textContent.trim()).slice(0, 8).map(button => {
      const style = getComputedStyle(button);
      const textElement = [...button.querySelectorAll('span,strong')].find(element => element.textContent.trim()) || button;
      const foreground = parse(getComputedStyle(textElement).color), background = parse(style.backgroundColor);
      const a = luminance(foreground), b = luminance(background);
      return { text: button.textContent.trim().slice(0, 40), foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  assert.ok(result.length > 0, `${label}: at least one real primary button is checked`);
  for (const button of result) {
    assert.equal(button.background[3], 1, `${label}: primary surface must be opaque`);
    assert.ok(button.ratio >= 4.5, `${label}: ${button.text} contrast ${button.ratio.toFixed(2)} < 4.5`);
  }
  contrastResults.push({ label, buttons: result });
}

async function backgroundSignature(page) {
  return page.evaluate(() => {
    const backdrop = document.querySelector('.appearance-backdrop');
    if (!backdrop) throw new Error('Shared appearance backdrop is missing');
    const style = getComputedStyle(document.documentElement);
    return JSON.stringify({
      base: style.getPropertyValue('--app-bg').trim(),
      atmosphere: style.getPropertyValue('--app-atmosphere').trim(),
      texture: style.getPropertyValue('--app-texture').trim(),
      layers: [...backdrop.children].map(element => {
        const layer = getComputedStyle(element);
        return [layer.backgroundImage, layer.backgroundColor, layer.opacity, layer.display];
      }),
    });
  });
}

async function screenshot(page, name) {
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), animations: 'disabled' });
}

async function runCommand(page, text) {
  await page.getByRole('button', { name: '打开全局命令面板', exact: true }).click();
  const palette = page.getByRole('dialog', { name: '全局命令面板', exact: true });
  await palette.getByRole('textbox', { name: '搜索所有内容和命令', exact: true }).fill(text);
  await palette.getByRole('button', { name: new RegExp(`^${text}`) }).click();
  await palette.waitFor({ state: 'hidden' });
  await settle(page);
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, timezoneId: 'Asia/Shanghai', colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
    context.on('page', page => page.on('pageerror', error => errors.push(`${width}px: ${error.message}`)));
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        attemptedWrites.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      if (url.origin === origin) return route.continue();
      blockedExternal.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort(); // No real GitHub, search, icon service or other external traffic.
    });
    await context.addInitScript(({ allowedOrigin, initialTime, key }) => {
      if (location.origin !== allowedOrigin) return;
      if (!sessionStorage.getItem('__appearanceSeeded')) {
        localStorage.setItem('theme', 'light');
        localStorage.setItem('scene_mode', 'default');
        localStorage.setItem('work_mode', 'false');
        sessionStorage.setItem('__appearanceSeeded', 'true');
        sessionStorage.setItem('__appearanceClock', String(initialTime));
      }
      const NativeDate = Date;
      window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [Number(sessionStorage.getItem('__appearanceClock'))])); }
        static now() { return Number(sessionStorage.getItem('__appearanceClock')); }
      };
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key && window.__appearanceQuotaFailure) throw new DOMException('Test-only appearance quota failure', 'QuotaExceededError');
        return original.call(this, name, value);
      };
    }, { allowedOrigin: origin, initialTime: fixedTime, key: preferenceKey });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    let stage = 'initial';
    try {
      await page.goto(appUrl.href);
      await ready(page);
      await assertTheme(page, 'landscape');
      const backgroundSignatures = new Map();
      for (const theme of themes) {
        stage = `${theme.id}-${width}`;
        await navigate(page, routes[0]);
        await selectTheme(page, theme);
        assert.deepEqual(await preference(page), { version: 1, mode: 'fixed', themeId: theme.id });
        assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'light', 'appearance must not rewrite light/dark preference');
        backgroundSignatures.set(theme.id, await backgroundSignature(page));
        await assertContrast(page, `${theme.id} home light ${width}`);
        await noOverflow(page, stage);
        await screenshot(page, `home-${theme.id}-${width}`);
        await page.reload();
        await ready(page);
        await assertTheme(page, theme.id);
        for (const route of routes.slice(1)) {
          await navigate(page, route);
          await assertTheme(page, theme.id);
          assert.equal(await backgroundSignature(page), backgroundSignatures.get(theme.id), `${route.name}: shared backdrop stays consistent`);
          await noOverflow(page, `${stage} ${route.name}`);
          await assertContrast(page, `${theme.id} ${route.name} light ${width}`);
          const { dialog } = await openAppearance(page);
          assert.equal(await dialog.getByRole('radio', { name: theme.name, exact: true }).isChecked(), true);
          if (theme.id === 'paper') {
            const beforeColorMode = await preference(page);
            await dialog.getByRole('radio', { name: '深色模式', exact: true }).check();
            await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
            assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark');
            assert.deepEqual(await preference(page), beforeColorMode, `${route.name}: dialog light/dark control is independent`);
            await dialog.getByRole('radio', { name: '明亮模式', exact: true }).check();
            await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
            assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'light');
          }
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          if ((theme.id === 'mist' && route.name === 'blog') || (theme.id === 'paper' && route.name === 'admin') || (theme.id === 'graphite' && route.name === 'tech-os')) {
            await screenshot(page, `${route.name}-${theme.id}-${width}`);
          }
        }
        await navigate(page, routes[0]);
        const beforeDark = await preference(page);
        const colorDialog = (await openAppearance(page)).dialog;
        await colorDialog.getByRole('radio', { name: '深色模式', exact: true }).check();
        await colorDialog.getByRole('button', { name: '关闭外观设置', exact: true }).click();
        await settle(page);
        assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true);
        assert.deepEqual(await preference(page), beforeDark, 'light/dark toggle leaves appearance preference intact');
        await page.reload();
        await ready(page);
        assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true, 'dark preference survives refresh independently');
        for (const route of routes) {
          await navigate(page, route);
          await assertTheme(page, theme.id);
          await assertContrast(page, `${theme.id} ${route.name} dark ${width}`);
          await noOverflow(page, `${stage} ${route.name} dark`);
        }
        if (theme.id === 'graphite') await screenshot(page, `tech-os-graphite-dark-${width}`);
        await navigate(page, routes[0]);
        await runCommand(page, '切换到浅色主题');
        console.log(`PASS appearance ${theme.id}: all four routes, light/dark, ${width}px`);
      }
      assert.equal(new Set(backgroundSignatures.values()).size, 4, 'four themes have four distinct actual background compositions');

      stage = `dialog-${width}`;
      const { dialog, trigger } = await openAppearance(page);
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'opening moves focus into the dialog');
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press(i < 10 ? 'Tab' : 'Shift+Tab');
        assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'Tab and Shift+Tab stay in the dialog');
      }
      await noOverflow(page, stage);
      await screenshot(page, `settings-${width}`);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Escape restores trigger focus');

      stage = `work-${width}`;
      const beforeScene = await preference(page);
      await runCommand(page, '切换到工作场景');
      await page.waitForFunction(() => document.documentElement.dataset.appearanceScene === 'work');
      const decorations = await page.locator('.appearance-backdrop > *').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return { className: element.className, silent: style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0 };
      }));
      assert.ok(decorations.length > 0 && decorations.every(layer => layer.silent), `work scene silences decorative layers: ${JSON.stringify(decorations)}`);
      assert.deepEqual(await preference(page), beforeScene, 'scene mode is independent from appearance');
      await screenshot(page, `work-graphite-${width}`);
      await runCommand(page, '切换到日常场景');

      stage = `daily-${width}`;
      const dailyDialog = (await openAppearance(page)).dialog;
      await dailyDialog.getByRole('radio', { name: '每日换一套', exact: true }).check();
      const dayOne = await page.locator('html').getAttribute('data-appearance');
      assert.ok(themes.some(theme => theme.id === dayOne));
      assert.equal((await preference(page)).mode, 'daily');
      await page.keyboard.press('Escape');
      await page.reload();
      await ready(page);
      await assertTheme(page, dayOne);
      await page.evaluate(next => sessionStorage.setItem('__appearanceClock', String(next)), fixedTime + 86400000);
      for (const route of routes.slice(1)) {
        await navigate(page, route);
        await assertTheme(page, dayOne); // Changing the wall clock and routes must not interrupt this page session.
      }
      await page.reload();
      await ready(page, routes[3]);
      const dayTwo = await page.locator('html').getAttribute('data-appearance');
      assert.notEqual(dayTwo, dayOne, 'a fresh page chooses the next local day theme');
      await navigate(page, routes[0]);
      await selectTheme(page, themes.find(theme => theme.id !== dayTwo));
      const reenabled = (await openAppearance(page)).dialog;
      await reenabled.getByRole('radio', { name: '每日换一套', exact: true }).check();
      await assertTheme(page, dayTwo);
      await page.keyboard.press('Escape');

      stage = `quota-${width}`;
      await selectTheme(page, themes[0]);
      const beforeQuota = await preference(page);
      await page.evaluate(() => { window.__appearanceQuotaFailure = true; });
      const quotaDialog = (await openAppearance(page)).dialog;
      await quotaDialog.getByRole('radio', { name: '暖纸书房', exact: true }).check();
      await assertTheme(page, 'paper');
      await quotaDialog.getByRole('alert').waitFor();
      assert.match(await quotaDialog.getByRole('alert').innerText(), /保存|存储|空间/);
      assert.deepEqual(await preference(page), beforeQuota, 'failed save does not corrupt the previous stored preference');
      await quotaDialog.getByRole('alert').scrollIntoViewIfNeeded();
      await screenshot(page, `save-warning-${width}`);
      await page.evaluate(() => { window.__appearanceQuotaFailure = false; });
      await quotaDialog.getByRole('button', { name: '重试保存', exact: true }).click();
      await quotaDialog.getByRole('alert').waitFor({ state: 'hidden' });
      assert.deepEqual(await preference(page), { version: 1, mode: 'fixed', themeId: 'paper' });
      await page.keyboard.press('Escape');
      await page.reload();
      await ready(page);
      await assertTheme(page, 'paper');
      await noOverflow(page, `final ${width}`);
      stage = `invalid-record-${width}`;
      const invalidRecord = '{appearance-invalid-record';
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: preferenceKey, raw: invalidRecord });
      await page.reload();
      await ready(page);
      await assertTheme(page, 'landscape');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), preferenceKey), invalidRecord, 'invalid records are not silently overwritten');
      const invalidDialog = (await openAppearance(page)).dialog;
      await invalidDialog.getByRole('status').filter({ hasText: '无法识别' }).waitFor();
      await invalidDialog.getByRole('radio', { name: '山水清境', exact: true }).click();
      await invalidDialog.getByRole('status').filter({ hasText: '无法识别' }).waitFor({ state: 'hidden' });
      assert.deepEqual(await preference(page), { version: 1, mode: 'fixed', themeId: 'landscape' }, 'explicitly reselecting the default card repairs an invalid record');
      await page.keyboard.press('Escape');
      console.log(`PASS appearance ${width}px: focus/Escape, quiet work scene, daily date/session rules, quota retry, persistence, invalid-record recovery`);
    } catch (error) {
      await screenshot(page, `FAIL-${stage}`).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, [], 'no browser pageerror');
  assert.deepEqual(attemptedWrites, [], 'appearance checks must not make any network writes');
  await writeFile(new URL('report.json', output), JSON.stringify({ widths: [1440, 390], themes, routes, contrastResults, pageErrors: errors, attemptedWrites, blockedExternalReadCount: blockedExternal.length }, null, 2));
  console.log('PASS appearance: four unique themes, four workspaces, desktop/mobile, all external traffic blocked. Artifacts: artifacts/appearance/');
} finally { await browser.close(); }
