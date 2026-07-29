import { readFile, writeFile } from "node:fs/promises";

const SITES_FILE = new URL("../src/data/sites.json", import.meta.url);
const REPORT_FILE = new URL("../public/link-health.json", import.meta.url);
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
    });
    await response.body?.cancel();
    return { status: response.status, ok: response.ok, error: null };
  } catch (error) {
    return {
      status: null,
      ok: false,
      error:
        error instanceof Error && error.name === "AbortError"
          ? `Timeout after ${TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSite(site, checkedAt) {
  const head = await request(site.url, "HEAD");
  const result = head.ok ? head : await request(site.url, "GET");

  return {
    siteId: site.id,
    url: site.url,
    status: result.status,
    ok: result.ok,
    checkedAt,
    error: result.ok ? null : result.error || `HTTP ${result.status}`,
  };
}

async function main() {
  const sites = JSON.parse(await readFile(SITES_FILE, "utf8"));
  if (!Array.isArray(sites)) throw new TypeError("sites.json must contain an array");

  const targets = sites
    .filter((site) => typeof site.id === "string" && /^https?:\/\//i.test(site.url))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const checkedAt = new Date().toISOString();
  const report = new Array(targets.length);
  let next = 0;

  async function worker() {
    while (next < targets.length) {
      const index = next++;
      report[index] = await checkSite(targets[index], checkedAt);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()),
  );
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  const failures = report.filter(({ ok }) => !ok).length;
  console.log(`Checked ${report.length} links: ${report.length - failures} ok, ${failures} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
