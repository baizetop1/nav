import { parseRssSources, type RssSource } from '../lib/rss.ts';
import { normalizeGithubToken, type RepositoryTarget } from './github.ts';

const canonical = (sources: RssSource[]) => JSON.stringify([...sources].sort((a, b) => a.id.localeCompare(b.id)));
export async function publishRssConfiguration(target: RepositoryTarget, token: string, sources: RssSource[], baselineSources: RssSource[], request: typeof fetch = fetch): Promise<string> {
  const normalized = normalizeGithubToken(token);
  if (normalized.length < 20 || normalized.includes('•')) throw new Error('请输入完整的 GitHub Token。');
  const next = parseRssSources({ version: 1, sources });
  const baseline = parseRssSources({ version: 1, sources: baselineSources });
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/data/rss-sources.json`;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${normalized}`, 'X-GitHub-Api-Version': '2022-11-28' };
  const response = await request(`${endpoint}?ref=${encodeURIComponent(target.branch)}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(response.status === 401 ? 'GitHub Token 已失效，请重新输入。' : `无法读取 RSS 配置（HTTP ${response.status}）。请先部署包含 RSS 功能的代码，并确认仓库权限。`);
  const file = await response.json() as { sha?: string; content?: string; encoding?: string; size?: number };
  if (!file.sha || file.encoding !== 'base64' || typeof file.content !== 'string' || Number(file.size || 0) > 256 * 1024 || file.content.length > 512 * 1024) throw new Error('远端 RSS 配置文件无效或过大。');
  let remote: RssSource[];
  try { remote = parseRssSources(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0))))); }
  catch { throw new Error('远端 RSS 配置格式无效，已停止覆盖。'); }
  if (canonical(remote) !== canonical(baseline)) throw new Error('其他设备已修改 RSS 订阅。请先导出本机 OPML，待新版部署完成后刷新页面，再导入并核对订阅；本机草稿仍保留。');
  if (canonical(remote) === canonical(next)) return '远端订阅已一致，无需重复提交。';
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, sources: next }, null, 2) + '\n');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  const put = await request(endpoint, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Update RSS subscriptions from Baize', branch: target.branch, sha: file.sha, content: btoa(binary) }), signal: AbortSignal.timeout(20_000) });
  if (!put.ok) throw new Error([409, 422].includes(put.status) ? '远端订阅在提交时发生变化，请重新比较后再试。' : `RSS 提交失败（HTTP ${put.status}），请检查 Contents 写权限。`);
  const result = await put.json() as { commit?: { html_url?: string } };
  return result.commit?.html_url ? `订阅已提交，等待 Actions 抓取和部署。${result.commit.html_url}` : '订阅已提交，等待 Actions 抓取和部署。';
}
