export const FAILURE_THRESHOLD = 2;
export const MAX_CONSECUTIVE_FAILURES = 99;

export const LINK_CHECK_HEADERS = Object.freeze({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
  "Cache-Control": "no-cache",
});

export function isCountedHttpFailure(status) {
  return status === 404 || status === 410 || (status >= 500 && status <= 599);
}

export function isRestrictedHttpStatus(status) {
  return status >= 400 && status <= 499 && status !== 404 && status !== 410;
}

export function classifyTransportFailure(error) {
  const message = String(error || "").toLowerCase();
  if (message.includes("timeout") || message.includes("abort")) return "timeout";
  if (message.includes("enotfound") || message.includes("getaddrinfo") || message.includes("dns")) return "dns";
  if (message.includes("certificate") || message.includes("tls") || message.includes("ssl")) return "tls";
  return "network";
}

/**
 * `ok` describes whether a navigation target should be considered usable, not
 * `Response.ok`. A 401/403/405/429 response proves that the server is reachable
 * but is refusing an automated probe, so it must not age into a broken link.
 */
export function assessRequestResult(result) {
  if (result.status === null) {
    return {
      ok: false,
      reachable: false,
      restricted: false,
      failureKind: classifyTransportFailure(result.error),
    };
  }

  if (result.status === 404 || result.status === 410) {
    return { ok: false, reachable: true, restricted: false, failureKind: "not-found" };
  }

  if (result.status >= 500 && result.status <= 599) {
    return { ok: false, reachable: true, restricted: false, failureKind: "server" };
  }

  return {
    ok: true,
    reachable: true,
    restricted: isRestrictedHttpStatus(result.status),
    failureKind: null,
  };
}

export function previousEntryWasCountedFailure(entry) {
  if (!entry || entry.ok || entry.restricted === true) return false;
  if (Number.isInteger(entry.status)) return isCountedHttpFailure(entry.status);
  return entry.status === null;
}

export function createHealthEntry(site, checkedAt, requestResult, previous) {
  const assessment = assessRequestResult(requestResult);
  const sameTarget = previous?.url === site.url ? previous : null;
  const previousFailures = previousEntryWasCountedFailure(sameTarget)
    ? Number.isInteger(sameTarget.consecutiveFailures) ? sameTarget.consecutiveFailures : 1
    : 0;
  const consecutiveFailures = assessment.ok
    ? 0
    : Math.min(previousFailures + 1, MAX_CONSECUTIVE_FAILURES);
  const previousWasAvailable = sameTarget && !previousEntryWasCountedFailure(sameTarget);
  const lastSuccessfulAt = assessment.ok
    ? checkedAt
    : typeof sameTarget?.lastSuccessfulAt === "string"
      ? sameTarget.lastSuccessfulAt
      : previousWasAvailable && typeof sameTarget.checkedAt === "string"
        ? sameTarget.checkedAt
        : null;

  return {
    siteId: site.id,
    url: site.url,
    status: requestResult.status,
    ok: assessment.ok,
    reachable: assessment.reachable,
    restricted: assessment.restricted,
    checkedAt,
    error: assessment.ok ? null : requestResult.error || `HTTP ${requestResult.status}`,
    source: "github-actions",
    consecutiveFailures,
    confirmedFailure: !assessment.ok && consecutiveFailures >= FAILURE_THRESHOLD,
    lastSuccessfulAt,
    failureKind: assessment.failureKind,
  };
}
