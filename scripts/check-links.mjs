import { readFile, writeFile } from "node:fs/promises";
import {
  LINK_CHECK_HEADERS,
  assessRequestResult,
  createHealthEntry,
} from "./link-health-rules.mjs";

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
      headers: LINK_CHECK_HEADERS,
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

function toPreviousMap(value) {
  if (!Array.isArray(value)) return new Map();
  return new Map(value
    .filter(entry => entry && typeof entry.siteId === "string" && typeof entry.url === "string")
    .map(entry => [entry.siteId, entry]));
}

async function readLocalPreviousReport() {
  try {
    return toPreviousMap(JSON.parse(await readFile(REPORT_FILE, "utf8")));
  } catch {
    return new Map();
  }
}

async function loadPreviousReport() {
  const fallback = await readLocalPreviousReport();
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !token) return fallback;

  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/contents/link-health.json?ref=gh-pages`, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "baize-nav-link-health",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return fallback;
    return toPreviousMap(await response.json());
  } catch {
    return fallback;
  }
}

async function checkSite(site, checkedAt, previous) {
  const head = await request(site.url, "HEAD");
  if (head.ok) return createHealthEntry(site, checkedAt, head, previous);

  const get = await request(site.url, "GET");
  // If GET is blocked before returning a response but HEAD already proved that
  // the endpoint is reachable and merely restricts automation, keep that safer
  // result instead of manufacturing a network failure.
  const result = get.status === null && assessRequestResult(head).ok ? head : get;
  return createHealthEntry(site, checkedAt, result, previous);
}

async function main() {
  const sites = JSON.parse(await readFile(SITES_FILE, "utf8"));
  if (!Array.isArray(sites)) throw new TypeError("sites.json must contain an array");

  const previous = await loadPreviousReport();
  const targets = sites
    .filter((site) => typeof site.id === "string" && /^https?:\/\//i.test(site.url))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const checkedAt = new Date().toISOString();
  const report = new Array(targets.length);
  let next = 0;

  async function worker() {
    while (next < targets.length) {
      const index = next++;
      report[index] = await checkSite(targets[index], checkedAt, previous.get(targets[index].id));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()),
  );
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  const restricted = report.filter(entry => entry.restricted).length;
  const confirmedFailures = report.filter(entry => entry.confirmedFailure).length;
  const pendingReview = report.filter(entry => !entry.ok && !entry.confirmedFailure).length;
  console.log(`Checked ${report.length} links: ${report.filter(entry => entry.ok && !entry.restricted).length} available, ${restricted} reachable but restricted, ${pendingReview} pending review, ${confirmedFailures} confirmed failures.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
