import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileCheck2, Loader2, Sparkles, Upload, X } from 'lucide-react';
import type { TechOsIndex, TechOsSourceFile } from '../../types/tech-os';
import type { CourseAiConfig, CourseAiUsage, CoursePackage, CoursePackageDraft, CourseProfile, CourseReadiness } from '../../types/tech-os-course';
import { assessCoursePackage, createCoursePackageDraft, parseCoursePackage, readCourseEditingValue } from '../../services/techOsCoursePackage';
import { assessQuestCoaching } from '../../services/techOsCoaching';
import { buildCourseLessonMessages, buildCourseOutlineMessages, normalizeCourseAiEndpoint, requestCourseAi } from '../../services/techOsCourseAi';
import { buildManualRouteSuggestion } from '../../services/techOsManualRoute';
import { indexFromTechOsFiles } from '../../services/techOsLifecycle';
import { MarkdownView } from './MarkdownView';

export interface CourseWizardSession { profile: CourseProfile; text: string }
export const emptyCourseWizardSession = (): CourseWizardSession => ({
  profile: { topic: '', background: '', goal: '', timeBudget: '', environment: '' }, text: '',
});
interface Props {
  index: TechOsIndex;
  reservedFiles: TechOsSourceFile[];
  session: CourseWizardSession;
  onChange: (session: CourseWizardSession) => void;
  onStage: (draft: CoursePackageDraft) => void;
}
const LABELS: Record<CourseReadiness, string> = { outline: '只有大纲', incomplete: '教案待完善', ready: '结构齐全 · 待人工核验' };
const fields: Array<[keyof CourseProfile, string, string]> = [
  ['topic', '学习主题', '例如：Linux 服务部署'],
  ['background', '已有基础', '已经会什么、还不会什么'],
  ['goal', '希望做到什么', '希望独立完成的事情'],
  ['timeBudget', '可用时间', '例如：每天 30 分钟，先学两周'],
  ['environment', '设备与工具条件', '系统、设备、已安装工具；不要填密钥或私人配置'],
];

// Inspect decoded strings too: a JSON response can spell a credential with Unicode escapes.
function rejectKeyEcho(course: CoursePackage, apiKey: string): CoursePackage {
  const key = apiKey.trim();
  const values = [course.title, course.summary, ...course.lessons.flatMap(lesson => [lesson.title, lesson.body])];
  if (key && values.some(value => value.includes(key))) throw new Error('课程内容疑似包含当前 API Key，已阻止接收、导出与暂存。请移除密钥后再继续。');
  return course;
}

export function TechOsCourseWizard({ index, reservedFiles, session, onChange, onStage }: Props) {
  const { profile, text } = session;
  const [config, setConfig] = useState<CourseAiConfig>({ endpoint: '', model: '', apiKey: '', maxTokens: 6000, tokenParameter: 'max_tokens' });
  const [action, setAction] = useState<'outline' | 'lesson'>('outline');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [usage, setUsage] = useState<CourseAiUsage>();
  const controller = useRef<AbortController | null>(null);
  const operation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = busy || importing;
  const parsed = useMemo(() => {
    if (!text.trim()) return { course: null, error: '' };
    try { return { course: rejectKeyEcho(parseCoursePackage(text), config.apiKey), error: '' }; }
    catch (cause) { return { course: null, error: cause instanceof Error ? cause.message : '课程 JSON 无效。' }; }
  }, [text, config.apiKey]);
  const course = parsed.course;
  // Editing may temporarily have an empty title or duplicate names. Keep its controls mounted;
  // only the strictly checked package above can be sent, exported or staged.
  const editingCourse = useMemo(() => readCourseEditingValue(text), [text]);
  const assessment = useMemo(() => course ? assessCoursePackage(course) : null, [course]);
  const editingAssessment = useMemo(() => {
    if (!editingCourse) return null;
    if (assessment) return assessment;
    const lessons = editingCourse.lessons.map(lesson => assessQuestCoaching(lesson.body));
    const status: CourseReadiness = lessons.every(lesson => lesson.status === 'outline') ? 'outline' : lessons.every(lesson => lesson.status === 'ready') ? 'ready' : 'incomplete';
    return { status, lessons };
  }, [editingCourse, assessment]);
  const selectedIndex = editingCourse ? Math.min(lessonIndex, editingCourse.lessons.length - 1) : 0;
  const selected = editingCourse?.lessons[selectedIndex];
  const draftResult = useMemo(() => {
    if (!course) return { draft: null, error: '' };
    try {
      // The Repository working copy may have moved tasks since the bundled index was built.
      // Validate its actual files, never resurrect stale lifecycle paths from that old index.
      const latestIndex = reservedFiles.length ? indexFromTechOsFiles(reservedFiles) : index;
      return { draft: createCoursePackageDraft(latestIndex, course, new Date().toISOString().slice(0, 10), reservedFiles), error: '' };
    }
    catch (cause) { return { draft: null, error: cause instanceof Error ? cause.message : '暂不能建立安全草稿。' }; }
  }, [course, index, reservedFiles]);
  const preview = useMemo(() => {
    try {
      const endpoint = normalizeCourseAiEndpoint(config.endpoint);
      if (!config.model.trim()) throw new Error('请填写服务商实际支持的模型 ID。');
      const messages = action === 'outline' ? buildCourseOutlineMessages(profile) : course ? buildCourseLessonMessages(profile, course, selectedIndex) : null;
      if (!messages) throw new Error('先准备路线大纲，再选择一课生成教案。');
      return { endpoint, messages, error: '' };
    } catch (cause) { return { endpoint: '', messages: null, error: cause instanceof Error ? cause.message : '请完善请求设置。' }; }
  }, [config.endpoint, config.model, profile, action, course, selectedIndex]);

  useEffect(() => { setConsent(false); }, [config, profile, action, text, selectedIndex]);
  useEffect(() => { setReviewed(false); setConfirmation(''); }, [text]);
  useEffect(() => () => { operation.current += 1; controller.current?.abort(); }, []);
  const updateCourse = (value: CoursePackage) => onChange({ profile, text: JSON.stringify(value, null, 2) });
  const updateLesson = (patch: Partial<{ title: string; body: string }>) => {
    if (!editingCourse) return;
    updateCourse({ ...editingCourse, lessons: editingCourse.lessons.map((lesson, i) => i === selectedIndex ? { ...lesson, ...patch } : lesson) });
  };
  const localOutline = () => {
    if (text && !window.confirm('这会替换向导里的课程草稿，不会修改仓库。需要保留时请先下载课程包。继续吗？')) return;
    try {
      const suggestion = buildManualRouteSuggestion(index, { topic: profile.topic, reason: '用户主动规划的新学习方向', expectedOutcome: profile.goal });
      updateCourse({ version: 1, title: suggestion.title, summary: profile.goal.trim(), lessons: suggestion.outline.map(title => ({ title: `怎样理解${title}？`, body: '' })) });
      setLessonIndex(0); setAction('lesson'); setError(''); setNotice('已创建本地大纲。每课正文仍为空，不代表已经有可学习教案。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '请填写主题与目标。'); }
  };
  const generate = async () => {
    if (pending || !consent || !preview.messages) return;
    if (action === 'outline' && text && !window.confirm('新的 AI 大纲成功后会替换当前向导草稿；失败时保留原稿。继续吗？')) return;
    if (action === 'lesson' && selected?.body && !window.confirm('AI 成功返回后会替换当前这一课正文；其他课程保留。继续吗？')) return;
    const currentOperation = ++operation.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setNotice('正在生成，最长等待约 180 秒；可随时取消。'); setUsage(undefined);
    try {
      const response = await requestCourseAi(config, preview.messages, { signal: abort.signal });
      if (operation.current !== currentOperation) return;
      if (action === 'outline') {
        const result = rejectKeyEcho(parseCoursePackage(response.content), config.apiKey);
        updateCourse(result); setLessonIndex(0); setAction('lesson');
      } else if (course) {
        const body = response.content.trim().replace(/^```(?:markdown|md)\s*\n([\s\S]*)\n```\s*$/i, '$1');
        // Recheck the full content-only package before accepting an AI body.
        const next = rejectKeyEcho(parseCoursePackage(JSON.stringify({ ...course, lessons: course.lessons.map((lesson, i) => i === selectedIndex ? { ...lesson, body } : lesson) })), config.apiKey);
        updateCourse(next);
      }
      setUsage(response.usage);
      setNotice('AI 草稿已返回。请检查工具、命令、事实和资料链接；结构通过不代表正确，尚未写入仓库。');
    } catch (cause) {
      if (operation.current === currentOperation) { setError(cause instanceof Error ? cause.message : '生成失败，原稿已保留。'); setNotice('原有课程未被替换；系统不会自动重试或再次收费调用。'); }
    } finally {
      if (operation.current === currentOperation) { setBusy(false); controller.current = null; }
    }
  };
  const importFile = async (file?: File) => {
    if (!file || pending) return;
    const currentOperation = ++operation.current;
    setImporting(true); setError('');
    try {
      if (file.size > 512 * 1024) throw new Error('课程包不能超过 512 KB。');
      const content = await file.text();
      if (operation.current !== currentOperation) return;
      const imported = rejectKeyEcho(parseCoursePackage(content), config.apiKey);
      if (text && !window.confirm('导入将替换当前向导草稿，请先下载需要保留的内容。继续吗？')) return;
      updateCourse(imported); setLessonIndex(0); setAction('lesson'); setError(''); setNotice('已导入内容并检查格式，未修改仓库。');
    } catch (cause) { if (operation.current === currentOperation) setError(cause instanceof Error ? cause.message : '无法读取课程包，原稿保留。'); }
    finally { if (operation.current === currentOperation) { setImporting(false); if (fileInput.current) fileInput.current.value = ''; } }
  };
  const download = () => {
    if (!course) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(course, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'tech-os-course.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('已下载课程包；包中不包含 API 设置和密钥。');
  };
  const stage = () => {
    if (pending || !draftResult.draft || !reviewed || confirmation !== `STAGE ${draftResult.draft.routeId}`) return;
    try { onStage(draftResult.draft); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '加入草稿失败，课程原文仍保留。'); }
  };

  return <section aria-label="新方向课程向导" className="space-y-6">
    <header className="baize-panel rounded-2xl p-5 sm:p-7"><p className="text-xs font-semibold tracking-widest text-[#64807c]">新方向 · 先规划，再逐课完善</p><h2 className="mt-2 text-2xl font-bold">把想学的方向变成能跟做的课程</h2><p className="mt-3 text-sm leading-6 text-[#64807c] dark:text-[#b8c6c1]">需求 → 大纲 → 单课教案 → 人工核验 → Repository 草稿。新课程固定进入路线储备，不覆盖旧内容、不自动切换主路线。</p><p className="mt-2 text-xs leading-5 text-[#64807c] dark:text-[#b8c6c1]">向导草稿仅保留在当前工作台会话，刷新前请下载；加入 Repository 后由其保存本机工作副本。API 设置和 Key 不持久保存。</p></header>

    <fieldset disabled={pending} className="baize-panel rounded-2xl p-5 sm:p-7"><legend className="sr-only">学习需求</legend><h3 className="font-bold">1. 先说清你的学习条件</h3><div className="mt-4 grid gap-4 md:grid-cols-2">{fields.map(([name, label, placeholder]) => <label key={name} className={name === 'goal' ? 'md:col-span-2' : ''}><span className="mb-1 block text-sm">{label}</span><textarea className="baize-input min-h-20" aria-label={label} maxLength={name === 'topic' ? 160 : 2000} value={profile[name]} placeholder={placeholder} onChange={event => onChange({ text, profile: { ...profile, [name]: event.target.value } })} /></label>)}</div><button type="button" className="baize-button-secondary mt-4" onClick={localOutline}>先建立本地大纲（不调用 AI）</button></fieldset>

    <section className="baize-panel space-y-4 rounded-2xl p-5 sm:p-7" aria-label="AI 课程生成"><h3 className="flex items-center gap-2 font-bold"><Sparkles size={19} />2. 可选：调用自己的 AI 接口</h3><p className="rounded-xl border border-amber-600/20 bg-amber-500/5 p-3 text-xs leading-6">推荐使用你控制且有鉴权、限额的 API 网关，把服务商密钥留在网关端。浏览器直连即使不保存 Key，也可能被页面脚本/扩展访问。不要使用他人的中转站或公开无鉴权代理，不要在 VITE 环境变量中放密钥。</p>
      <fieldset disabled={pending} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="mb-1 block text-sm">Base URL 或完整 Chat Completions 地址</span><input className="baize-input" aria-label="AI 接口地址" type="url" autoComplete="off" maxLength={2000} value={config.endpoint} onChange={event => setConfig({ ...config, endpoint: event.target.value })} placeholder="https://你的网关/v1 或 …/chat/completions" /></label><label><span className="mb-1 block text-sm">模型 ID</span><input className="baize-input" aria-label="AI 模型 ID" autoComplete="off" maxLength={200} value={config.model} onChange={event => setConfig({ ...config, model: event.target.value })} placeholder="填写服务商提供的实际模型 ID" /></label><label><span className="mb-1 block text-sm">API Key / 网关令牌（可选）</span><input className="baize-input" aria-label="AI API Key" type="password" maxLength={4096} autoComplete="new-password" spellCheck={false} value={config.apiKey} onChange={event => setConfig({ ...config, apiKey: event.target.value })} placeholder="只在当前页面内存使用" /></label><label><span className="mb-1 block text-sm">单次输出上限（tokens）</span><input className="baize-input" aria-label="AI 输出上限" type="number" min={256} max={16000} step={1} value={config.maxTokens} onChange={event => setConfig({ ...config, maxTokens: Number(event.target.value) })} /></label><label><span className="mb-1 block text-sm">服务商支持的上限参数</span><select className="baize-input" aria-label="AI token 参数" value={config.tokenParameter} onChange={event => setConfig({ ...config, tokenParameter: event.target.value as CourseAiConfig['tokenParameter'] })}><option value="max_tokens">max_tokens（常见兼容接口）</option><option value="max_completion_tokens">max_completion_tokens</option></select></label><label className="md:col-span-2"><span className="mb-1 block text-sm">本次生成内容</span><select className="baize-input" aria-label="AI 生成范围" value={action} onChange={event => setAction(event.target.value as 'outline' | 'lesson')}><option value="outline">先生成路线大纲（不生成全部课文）</option><option value="lesson" disabled={!course}>只生成下方选中的一课教案</option></select></label></div>
      <div className="rounded-xl bg-[#5f8f84]/5 p-3 text-xs leading-6"><p className="break-all">发送目标：{preview.endpoint || '等待有效接口地址'} · 模型：{config.model || '未填写'}</p><p>仅发送上方五项需求和本次课程大纲/所选课名；不附带 Inbox、临时文本、GitHub Token、其他课程正文或浏览记录。API Key 若填写，仅放在此目标的 Authorization 请求头。</p><p>接口需允许本站跨域访问（CORS）；不能由前端绕过。无自动重试；取消后服务商仍可能计费。</p></div>
      <details className="rounded-xl border border-[#5f8f84]/15 p-3"><summary className="cursor-pointer text-sm">查看实际发送内容（不含密钥）</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{preview.messages ? JSON.stringify({ model: config.model, [config.tokenParameter]: config.maxTokens, messages: preview.messages }, null, 2) : preview.error}</pre></details>
      {preview.error && <p className="text-xs text-[#64807c]" role="status">{preview.error}</p>}
      <label className="flex items-start gap-2 text-sm leading-6"><input className="mt-1.5" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />我确认目标地址可信，同意发送所示内容，并了解可能产生 API 费用及浏览器密钥风险</label>
      <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-primary" disabled={!consent || !preview.messages} onClick={() => void generate()}><Sparkles size={16} />{action === 'outline' ? 'AI 生成路线大纲' : 'AI 生成所选课教案'}</button><button type="button" className="baize-button-secondary" onClick={() => { setConfig({ ...config, apiKey: '' }); setNotice('已清除当前页面内存中的 API Key。'); }}>清除 API Key</button></div></fieldset>
      {busy && <div className="flex flex-wrap items-center gap-3" role="status"><Loader2 size={18} className="animate-spin" /><span className="text-sm">正在生成，请勿关闭页面…</span><button type="button" className="baize-button-secondary" onClick={() => controller.current?.abort()}><X size={15} />取消生成</button></div>}
      {usage && <p className="text-xs text-[#64807c]">服务端返回用量：输入 {usage.promptTokens ?? '—'} · 输出 {usage.completionTokens ?? '—'} · 合计 {usage.totalTokens ?? '—'} tokens；费用以服务商账单为准。</p>}
    </section>

    <fieldset disabled={pending} className="baize-panel space-y-4 rounded-2xl p-5 sm:p-7"><legend className="sr-only">课程编辑与导入</legend><h3 className="font-bold">3. 导入、编辑与预览课程</h3><div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" onClick={() => fileInput.current?.click()}><Upload size={16} />导入课程 JSON</button><input ref={fileInput} type="file" accept=".json,application/json" aria-label="选择课程 JSON 文件" className="sr-only" onChange={event => void importFile(event.target.files?.[0])} /><button type="button" className="baize-button-secondary" disabled={!course} onClick={download}><Download size={16} />下载课程包</button></div><p className="text-xs leading-5 text-[#64807c]">课程包上限 512 KB，2–12 课。只接受标题、简介、课名和 Markdown 正文，不接受仓库路径、ID、状态或密钥字段。空正文表示只有大纲。</p>
      <details open={!course}><summary className="cursor-pointer text-sm">课程 JSON 原文（可粘贴导入或修正格式）</summary><textarea className="baize-input mt-3 min-h-56 font-mono text-xs" aria-label="课程 JSON 原文" value={text} maxLength={524288} onChange={event => onChange({ profile, text: event.target.value })} placeholder={'{"version":1,"title":"新方向","summary":"学习目标","lessons":[{"title":"第一个问题？","body":""},{"title":"第二个问题？","body":""}]}'} /></details>
      {parsed.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{parsed.error}</p>}
      {editingCourse && editingAssessment && <><div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1 block text-sm">路线名称</span><input className="baize-input" aria-label="课程路线名称" maxLength={160} value={editingCourse.title} onChange={event => updateCourse({ ...editingCourse, title: event.target.value })} /></label><label><span className="mb-1 block text-sm">路线简介与目标</span><textarea className="baize-input" aria-label="课程路线简介" maxLength={4000} value={editingCourse.summary} onChange={event => updateCourse({ ...editingCourse, summary: event.target.value })} /></label></div><p className="rounded-xl bg-[#5f8f84]/8 p-3 text-sm" role="status">{LABELS[editingAssessment.status]} · {editingAssessment.lessons.filter(lesson => lesson.status === 'ready').length}/{editingCourse.lessons.length} 课教学结构齐全。机器只检查格式和占位内容，不验证事实与链接有效性。</p>
      <label className="block"><span className="mb-1 block text-sm">选择要完善的一课</span><select className="baize-input" aria-label="选择课程" value={selectedIndex} onChange={event => setLessonIndex(Number(event.target.value))}>{editingCourse.lessons.map((lesson, i) => <option key={i} value={i}>{i + 1}. {lesson.title} · {LABELS[editingAssessment.lessons[i].status]}</option>)}</select></label>
      {selected && <><label className="block"><span className="mb-1 block text-sm">本课问题</span><input className="baize-input" aria-label="本课问题" maxLength={160} value={selected.title} onChange={event => updateLesson({ title: event.target.value })} /></label><textarea className="baize-input min-h-64 font-mono text-xs" aria-label="本课 Markdown 教案" maxLength={60000} value={selected.body} onChange={event => updateLesson({ body: event.target.value })} placeholder="先选本课，再点击 AI 生成所选课教案，或在这里粘贴按教学模板编写的 Markdown。" />{editingAssessment.lessons[selectedIndex].issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-xs leading-6 text-[#9b6041] dark:text-[#e1bb8d]" aria-label="本课完整性问题">{editingAssessment.lessons[selectedIndex].issues.slice(0, 12).map((issue, i) => <li key={i}>{issue}</li>)}</ul>}<details className="rounded-xl border border-[#5f8f84]/15 p-4"><summary className="cursor-pointer font-semibold">预览本课 Markdown（参考答案也会显示，请检查后再发布）</summary><div className="mt-4">{selected.body ? <MarkdownView body={selected.body} anchorPrefix={`course-preview-${selectedIndex}`} /> : <p className="text-sm">这课只有题目，还没有教案。</p>}</div></details></>}
      </>}
    </fieldset>

    {draftResult.draft && assessment && <section aria-label="确认课程草稿" className="baize-panel space-y-4 rounded-2xl p-5 sm:p-7"><h3 className="flex items-center gap-2 font-bold"><FileCheck2 size={18} />4. 确认后加入 Repository 草稿</h3><p className="text-sm leading-6">新增 {draftResult.draft.routeId} 和 {draftResult.draft.questIds.length} 个任务，全部为 Backlog。{assessment.status !== 'ready' ? '仍有教案待补，加入草稿不代表可以完成这些任务。' : '教学结构齐全，仍需你核对事实、工具、命令和资料链接。'}内容提交 GitHub 后可能公开，别包含个人敏感信息。</p><details><summary className="cursor-pointer text-xs">查看将新增的文件</summary><ul className="mt-2 space-y-1 break-all font-mono text-xs">{draftResult.draft.files.map(file => <li key={file.path}>{file.path}</li>)}</ul></details><label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" disabled={pending} className="mt-1.5" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />我已检查内容与完整性标记，知道未核验的 AI 建议不能直接执行，并确认可作为公开课程草稿保存</label><div className="flex flex-wrap gap-2"><input className="baize-input min-w-0 flex-1 font-mono" aria-label="确认加入课程草稿" disabled={pending} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={`输入 STAGE ${draftResult.draft.routeId}`} /><button type="button" className="baize-button-primary" disabled={pending || !reviewed || confirmation !== `STAGE ${draftResult.draft.routeId}`} onClick={stage}>加入 Repository 草稿</button></div><p className="text-xs text-[#64807c]">这里只准备本机草稿。真正发布仍需 Repository 远端比较、校验及提交确认；不会在这里调用 GitHub。</p></section>}
    {importing && <p role="status" className="text-sm">正在读取课程包…</p>}
    {draftResult.error && <p role="alert" className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{draftResult.error}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-[#5f8f84]/10 p-3 text-sm">{notice}</p>}
  </section>;
}
