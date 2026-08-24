import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, BrainCircuit, ChevronDown, Compass, Database, FlaskConical,
  FolderKanban, GitCompareArrows, GitFork, HelpCircle, Inbox, LayoutDashboard, ListTree, Map as MapIcon, Menu, Milestone, Moon, Network, Sparkles, Sun, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  getTechOsEntities, getTechOsEntity, getTechOsIds, getTechOsNumber, getTechOsRelations,
  getTechOsString, resolveTechOsIds, techOsIndex,
} from '../../services/techOs';
import { createTechOsCaptureDraft, getTechOsCaptureKind, getVisibleInboxTags, TECH_OS_CAPTURE_LABELS } from '../../services/techOsCapture';
import { buildTechOsLearningEngine } from '../../services/techOsLearningEngine';
import { buildRouteCandidateGroups } from '../../services/techOsRouteCandidate';
import { buildRouteCompletionReview } from '../../services/techOsRouteCompletion';
import { buildNextRouteRecommendations } from '../../services/techOsNextRoute';
import type { TechOsEntity, TechOsKind, TechOsMode } from '../../types/tech-os';
import type { InboxItem } from '../../types/inbox';
import type { TechOsCaptureDraft } from '../../types/tech-os-capture';
import type { LearningAction } from '../../types/tech-os-learning';
import type { RouteCandidateDraft } from '../../types/tech-os-candidate';
import type { RepositoryTarget } from '../../services/github';
import { MarkdownView } from './MarkdownView';
import { TechOsRepositoryPanel } from './TechOsRepositoryPanel';
import { TechOsLearningPanel } from './TechOsLearningPanel';
import { TechOsCandidatePanel } from './TechOsCandidatePanel';
import { TechOsRouteEnginePanel } from './TechOsRouteEnginePanel';
import type { RouteEngineStageDraft } from './TechOsRouteEnginePanel';
import { TechOsManualRoutePanel } from './TechOsManualRoutePanel';

type WorkspaceView = 'dashboard' | 'learning' | 'route-engine' | 'route' | 'quest' | 'inbox' | 'knowledge' | 'lab' | 'project' | 'map' | 'backlog' | 'repository';

interface TechOsWorkspaceProps {
  isDark: boolean;
  inboxCount: number;
  inboxItems: InboxItem[];
  onToggleTheme: () => void;
  onOpenInbox: () => void;
  onArchiveInboxItems: (ids: string[]) => void;
  onClose: () => void;
  repository: RepositoryTarget;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: '总览', icon: LayoutDashboard },
  { id: 'learning', label: '学习引擎', icon: Sparkles },
  { id: 'route-engine', label: '路线引擎', icon: GitFork },
  { id: 'route', label: '主路线', icon: Milestone },
  { id: 'quest', label: '核心问题', icon: HelpCircle },
  { id: 'inbox', label: '收件箱', icon: Inbox },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
  { id: 'lab', label: '实验', icon: FlaskConical },
  { id: 'project', label: '项目', icon: FolderKanban },
  { id: 'map', label: '技术地图', icon: MapIcon },
  { id: 'backlog', label: '路线储备', icon: ListTree },
  { id: 'repository', label: '仓库', icon: GitCompareArrows },
];

const KIND_LABELS: Record<TechOsKind, string> = {
  vision: '愿景', route: '路线', 'route-seed': '路线种子', 'route-review': '路线复盘', quest: '核心问题', question: '问题', knowledge: '知识',
  lab: '实验', project: '项目', 'tech-map': '技术地图', 'inbox-item': '收件箱',
};

const MODE_LABELS: Record<TechOsMode, { label: string; detail: string }> = {
  explore: { label: '探索', detail: '解释、连接与产生问题' },
  lab: { label: '实验', detail: '动手验证并保存证据' },
  'keep-alive': { label: '保持活跃', detail: '只推进一个轻量动作' },
};

export function TechOsWorkspace({ isDark, inboxCount, inboxItems, onToggleTheme, onOpenInbox, onArchiveInboxItems, onClose, repository }: TechOsWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [focusedId, setFocusedId] = useState(techOsIndex.state.currentQuestId);
  const [sessionMode, setSessionMode] = useState<TechOsMode>(techOsIndex.state.mode);
  const [captureDrafts, setCaptureDrafts] = useState<TechOsCaptureDraft[]>([]);
  const [candidateDrafts, setCandidateDrafts] = useState<RouteCandidateDraft[]>([]);
  const [routeEngineDrafts, setRouteEngineDrafts] = useState<RouteEngineStageDraft[]>([]);
  const vision = getTechOsEntity(techOsIndex.state.visionId);
  const mainRoute = getTechOsEntity(techOsIndex.state.mainRouteId);
  const currentQuest = getTechOsEntity(techOsIndex.state.currentQuestId);
  const routeQuests = mainRoute ? resolveTechOsIds(getTechOsIds(mainRoute, 'quest_ids')).sort((a, b) => (getTechOsNumber(a, 'order') || 0) - (getTechOsNumber(b, 'order') || 0)) : [];
  const completedQuests = routeQuests.filter(quest => quest.status === 'completed').length;
  const progress = routeQuests.length ? Math.round(completedQuests / routeQuests.length * 100) : 0;
  const indexedInboxIds = useMemo(() => new Set(getTechOsEntities('inbox-item').flatMap(entity => [getTechOsString(entity, 'source_inbox_id'), getTechOsString(entity, 'origin_id')]).filter(Boolean)), []);
  const captureSourceFiles = useMemo(() => captureDrafts.map(capture => capture.file), [captureDrafts]);
  const sessionIndex = useMemo(() => ({ ...techOsIndex, state: { ...techOsIndex.state, mode: sessionMode } }), [sessionMode]);
  const learningEngine = useMemo(() => buildTechOsLearningEngine(sessionIndex, inboxItems), [inboxItems, sessionIndex]);
  const candidateGroups = useMemo(() => buildRouteCandidateGroups(sessionIndex, learningEngine.routeSeedSignals), [learningEngine.routeSeedSignals, sessionIndex]);
  const candidateSourceFiles = useMemo(() => candidateDrafts.map(candidate => candidate.file), [candidateDrafts]);
  const completionReview = useMemo(() => buildRouteCompletionReview(sessionIndex), [sessionIndex]);
  const nextRouteRecommendations = useMemo(() => buildNextRouteRecommendations(sessionIndex, candidateGroups, completionReview), [candidateGroups, completionReview, sessionIndex]);
  const routeEngineSourceFiles = useMemo(() => routeEngineDrafts.map(draft => draft.file), [routeEngineDrafts]);
  const repositoryDraftFiles = useMemo(() => [...captureSourceFiles, ...candidateSourceFiles, ...routeEngineSourceFiles], [captureSourceFiles, candidateSourceFiles, routeEngineSourceFiles]);
  const stagedCandidatePaths = useMemo(() => new Set(candidateSourceFiles.map(file => file.path)), [candidateSourceFiles]);
  const stagedRouteEnginePaths = useMemo(() => new Set(routeEngineSourceFiles.map(file => file.path)), [routeEngineSourceFiles]);

  const navigate = (view: WorkspaceView, focusId?: string) => {
    setActiveView(view);
    if (focusId) setFocusedId(focusId);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusEntity = (id: string) => {
    const entity = getTechOsEntity(id);
    setFocusedId(id);
    if (entity) setActiveView(viewForEntity(entity));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stageCapture = (item: InboxItem) => {
    const capture = createTechOsCaptureDraft(item);
    const indexed = getTechOsEntity(capture.techOsId);
    const indexedSourceId = indexed ? (getTechOsString(indexed, 'source_inbox_id') || getTechOsString(indexed, 'origin_id')) : '';
    const pendingCollision = captureDrafts.find(candidate => candidate.file.path === capture.file.path && candidate.inboxItemId !== item.id);
    if ((indexed && indexedSourceId !== item.id) || pendingCollision) {
      alert('检测到 Capture ID 冲突，已停止生成草稿；来源 Inbox 保持不变。');
      return;
    }
    setCaptureDrafts(current => [...current.filter(candidate => candidate.inboxItemId !== item.id), capture]);
    navigate('repository');
  };

  const handleCommittedPaths = (paths: string[]) => {
    const committed = new Set(paths);
    const completed = captureDrafts.filter(capture => committed.has(capture.file.path));
    if (completed.length) onArchiveInboxItems(completed.map(capture => capture.inboxItemId));
    setCaptureDrafts(current => current.filter(capture => !committed.has(capture.file.path)));
    setCandidateDrafts(current => current.filter(candidate => !committed.has(candidate.file.path)));
    setRouteEngineDrafts(current => current.filter(draft => !committed.has(draft.file.path)));
  };

  const stageCandidate = (draft: RouteCandidateDraft) => {
    if (getTechOsEntity(draft.candidateId) || captureSourceFiles.some(file => file.path === draft.file.path)) {
      alert('检测到 Candidate ID 或路径冲突，已停止加入草稿。');
      return;
    }
    setCandidateDrafts(current => [...current.filter(candidate => candidate.groupId !== draft.groupId && candidate.file.path !== draft.file.path), draft]);
    navigate('repository');
  };

  const stageRouteEngineDraft = (draft: RouteEngineStageDraft) => {
    const transientCollision = [...captureSourceFiles, ...candidateSourceFiles].some(file => file.path === draft.file.path);
    const pendingCollision = routeEngineDrafts.some(candidate => candidate.key !== draft.key && candidate.file.path === draft.file.path);
    if (transientCollision || pendingCollision) {
      alert('检测到 Route Engine 草稿路径冲突，已停止加入 Repository。');
      return;
    }
    setRouteEngineDrafts(current => [...current.filter(candidate => candidate.key !== draft.key && candidate.file.path !== draft.file.path), draft]);
    navigate('repository');
  };

  const openLearningAction = (action: LearningAction) => {
    if (action.targetEntityId) focusEntity(action.targetEntityId);
    else if (action.targetView) navigate(action.targetView);
  };

  const openLearningSource = (id: string) => {
    if (getTechOsEntity(id)) focusEntity(id);
    else navigate('inbox');
  };

  return <div className="min-h-screen bg-[#dce6e1] text-[#173b41] dark:bg-[#07191d] dark:text-[#ecebe4]">
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(95,143,132,0.18),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(201,169,107,0.12),transparent_32%)]" aria-hidden="true" />
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/60 bg-[#edf2eb]/95 p-5 shadow-2xl backdrop-blur-xl transition-transform dark:border-[#c9a96b]/12 dark:bg-[#0b252b]/95 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-7 flex items-center justify-between">
        <button type="button" onClick={() => navigate('dashboard')} className="flex items-center gap-3 text-left">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#356b66] text-white shadow-lg dark:bg-[#c9a96b] dark:text-[#102c33]"><BrainCircuit size={23} /></span>
          <span><strong className="block text-lg tracking-[0.12em]">TECH OS</strong><span className="text-xs text-[#718986]">路线工作台 · T4.6</span></span>
        </button>
        <button type="button" className="baize-icon-button lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="关闭导航"><X size={20} /></button>
      </div>
      <nav className="space-y-1" aria-label="Tech OS 工作台">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${activeView === item.id ? 'bg-[#356b66] text-white shadow-md dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#456b68] hover:bg-[#5f8f84]/10 dark:text-[#c5d0cc] dark:hover:bg-[#c9a96b]/8'}`}><Icon size={18} /><span>{item.label}</span>{item.id === 'inbox' && inboxCount > 0 && <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{inboxCount}</span>}</button>;
        })}
      </nav>
      <div className="mt-auto space-y-2 border-t border-[#5f8f84]/15 pt-4 dark:border-[#c9a96b]/12">
        <p className="px-3 text-[11px] leading-5 text-[#718986]">构建投影只读 · 源数据更新于 {techOsIndex.sourceUpdated}<br />候选路线仅在确认后加入内存草稿。</p>
        <button type="button" onClick={onClose} className="baize-button-secondary w-full"><ArrowLeft size={16} />返回导航</button>
      </div>
    </aside>

    {mobileNavOpen && <button type="button" className="fixed inset-0 z-40 bg-[#07191d]/45 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="关闭导航遮罩" />}

    <main className="relative z-10 min-h-screen lg:ml-72">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-[#edf2eb]/75 px-4 py-3 backdrop-blur-xl dark:border-[#c9a96b]/10 dark:bg-[#07191d]/75 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button type="button" className="baize-icon-button lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="打开 Tech OS 导航"><Menu size={21} /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-[#64807c] dark:text-[#b7a36f]">{NAV_ITEMS.find(item => item.id === activeView)?.label}</p><h1 className="truncate text-lg font-bold">{activeView === 'dashboard' ? vision?.title : getViewTitle(activeView)}</h1></div>
          <label className="relative hidden shrink-0 sm:block" title="只切换当前工作台会话；不会修改 state.yml">
            <span className="sr-only">当前工作模式</span>
            <select aria-label="当前工作模式" value={sessionMode} onChange={event => setSessionMode(event.target.value as TechOsMode)} className="appearance-none rounded-full border border-[#5f8f84]/20 bg-transparent py-1 pl-3 pr-8 text-xs font-medium text-[#64807c] outline-none transition hover:border-[#5f8f84]/40 focus:border-[#356b66] dark:border-[#c9a96b]/20 dark:text-[#b8c6c1] dark:focus:border-[#c9a96b]">
              {Object.entries(MODE_LABELS).map(([mode, config]) => <option key={mode} value={mode}>{config.label}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </label>
          <button type="button" className="baize-icon-button" onClick={onToggleTheme} aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}>{isDark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button type="button" className="baize-icon-button" onClick={onClose} aria-label="返回导航"><X size={20} /></button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 pb-16 sm:p-6 lg:p-8">
        {activeView === 'dashboard' && <Dashboard vision={vision} mainRoute={mainRoute} currentQuest={currentQuest} routeQuests={routeQuests} progress={progress} inboxCount={inboxCount} nextAction={learningEngine.nextAction} activeMode={sessionMode} onModeChange={setSessionMode} onNavigate={navigate} onOpenLearningAction={openLearningAction} />}
        {activeView === 'learning' && <div className="space-y-6"><TechOsLearningPanel engine={learningEngine} onOpenAction={openLearningAction} onOpenSource={openLearningSource} /><TechOsCandidatePanel groups={candidateGroups} stagedPaths={stagedCandidatePaths} created={techOsIndex.sourceUpdated} onOpenSource={openLearningSource} onOpenRepository={() => navigate('repository')} onStage={stageCandidate} /></div>}
        {activeView === 'route-engine' && <div className="space-y-6"><TechOsRouteEnginePanel review={completionReview} recommendations={nextRouteRecommendations} stagedPaths={stagedRouteEnginePaths} created={techOsIndex.sourceUpdated} onOpenSource={openLearningSource} onOpenRepository={() => navigate('repository')} onStage={stageRouteEngineDraft} /><TechOsManualRoutePanel reservedRouteIds={nextRouteRecommendations.map(item => item.routeId)} stagedPaths={stagedRouteEnginePaths} created={techOsIndex.sourceUpdated} onOpenRepository={() => navigate('repository')} onStage={stageRouteEngineDraft} /></div>}
        {activeView === 'route' && <RouteView mainRoute={mainRoute} quests={routeQuests} progress={progress} onFocus={focusEntity} />}
        {activeView === 'quest' && <EntityCollection title="路线核心问题" description="核心问题必须采用问句；状态来自 Markdown，不在此页面修改。" entities={routeQuests} focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'inbox' && <InboxView items={inboxItems} indexedInboxIds={indexedInboxIds} captureDrafts={captureDrafts} onStage={stageCapture} onOpenInbox={onOpenInbox} onOpenRepository={() => navigate('repository')} />}
        {activeView === 'knowledge' && <EntityCollection title="知识库" description="技术地图表达我知道什么；L2/L3 必须有真实证据。" entities={getTechOsEntities('knowledge')} focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'lab' && <EntityCollection title="实验" description="实验状态完全来自记录；planned 不会被界面展示为完成。" entities={getTechOsEntities('lab')} focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'project' && <EntityCollection title="项目" description="综合多个知识节点和实验的真实成果。" entities={getTechOsEntities('project')} focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'map' && <TechMapView focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'backlog' && <BacklogView focusedId={focusedId} onFocus={focusEntity} />}
        {activeView === 'repository' && <TechOsRepositoryPanel target={repository} seedDrafts={repositoryDraftFiles} onCommittedPaths={handleCommittedPaths} />}
      </div>
    </main>
  </div>;
}

interface DashboardProps {
  vision?: TechOsEntity;
  mainRoute?: TechOsEntity;
  currentQuest?: TechOsEntity;
  routeQuests: TechOsEntity[];
  progress: number;
  inboxCount: number;
  nextAction: LearningAction | null;
  activeMode: TechOsMode;
  onModeChange: (mode: TechOsMode) => void;
  onNavigate: (view: WorkspaceView, focusId?: string) => void;
  onOpenLearningAction: (action: LearningAction) => void;
}

function Dashboard({ vision, mainRoute, currentQuest, routeQuests, progress, inboxCount, nextAction, activeMode, onModeChange, onNavigate, onOpenLearningAction }: DashboardProps) {
  const stats = [
    { label: '知识', value: getTechOsEntities('knowledge').length, icon: Database, view: 'knowledge' as const },
    { label: '实验', value: getTechOsEntities('lab').length, icon: FlaskConical, view: 'lab' as const },
    { label: '项目', value: getTechOsEntities('project').length, icon: FolderKanban, view: 'project' as const },
    { label: '路线种子', value: getTechOsEntities('route-seed').length, icon: Network, view: 'backlog' as const },
  ];
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#173b41] p-6 text-[#f4f1e8] shadow-2xl dark:bg-[#102c33] sm:p-8">
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99b7b0]">愿景</p><h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{vision?.title || '未设置愿景'}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#c4d5d0]">长期方向不设置完成百分比。当前工作台只帮助你看清路线、问题、证据与下一步。</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between text-xs"><span className="uppercase tracking-[0.15em] text-[#99b7b0]">主路线</span><span>{progress}% · {routeQuests.filter(item => item.status === 'completed').length}/{routeQuests.length}</span></div><h3 className="mt-3 text-xl font-semibold">{mainRoute?.title || '未设置路线'}</h3><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#c9a96b] transition-all" style={{ width: `${progress}%` }} /></div><button type="button" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#e1ca91] hover:text-white" onClick={() => onNavigate('route', mainRoute?.id)}>查看完整路线<ArrowRight size={16} /></button></div>
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="baize-panel rounded-2xl p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64807c]">当前核心问题</p><h2 className="mt-2 text-xl font-bold">{currentQuest?.title || '没有进行中的核心问题'}</h2></div><span className="rounded-full bg-[#5f8f84]/10 px-3 py-1 text-xs font-semibold text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]">{currentQuest?.id}</span></div>{currentQuest && <><p className="mt-4 line-clamp-3 text-sm leading-7 text-[#64807c] dark:text-[#b8c6c1]">{summaryFromBody(currentQuest.body)}</p><button type="button" className="baize-button-primary mt-5" onClick={() => onNavigate('quest', currentQuest.id)}>继续探索<ArrowRight size={16} /></button></>}</section>
      <section className="baize-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64807c]">今日模式</p><span className="text-[10px] text-[#718986]">仅当前会话</span></div><div className="mt-4 space-y-2">{Object.entries(MODE_LABELS).map(([mode, config]) => <button key={mode} type="button" aria-pressed={activeMode === mode} onClick={() => onModeChange(mode as TechOsMode)} className={`w-full rounded-xl border p-3 text-left transition ${activeMode === mode ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/10 hover:border-[#5f8f84]/30 dark:border-[#c9a96b]/10'}`}><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${activeMode === mode ? 'bg-[#356b66] dark:bg-[#c9a96b]' : 'bg-[#9fb2ad]'}`} /><strong className="text-sm">{config.label}</strong>{activeMode === mode && <span className="ml-auto text-[10px] font-semibold tracking-wider text-[#64807c]">当前</span>}</span><span className="mt-1 block pl-4 text-xs text-[#718986]">{config.detail}</span></button>)}</div></section>
    </div>

    {nextAction && <section className="baize-panel rounded-2xl p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c9a96b]/15 text-[#80672e] dark:text-[#e1ca91]"><Sparkles size={21} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">规则优先 · 下一步</p><h2 className="mt-1 font-bold">{nextAction.title}</h2><p className="mt-1 line-clamp-2 text-sm text-[#718986]">{nextAction.detail}</p></div><button type="button" className="baize-button-primary shrink-0" onClick={() => onOpenLearningAction(nextAction)}>查看来源<ArrowRight size={16} /></button></div><p className="mt-4 rounded-xl bg-[#5f8f84]/5 p-3 text-xs leading-5 text-[#64807c] dark:bg-[#c9a96b]/5 dark:text-[#b8c6c1]"><strong>为什么：</strong>{nextAction.reason}</p></section>}

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(stat => { const Icon = stat.icon; return <button key={stat.label} type="button" onClick={() => onNavigate(stat.view)} className="baize-panel rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[#5f8f84]/40"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><Icon size={18} /></span><strong className="mt-4 block text-2xl">{stat.value}</strong><span className="text-xs text-[#718986]">{stat.label}</span></button>; })}</section>

    <div className="grid gap-5 lg:grid-cols-2"><section className="baize-panel rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-bold">技术地图</h2><button type="button" className="text-xs font-semibold text-[#356b66] dark:text-[#d2b775]" onClick={() => onNavigate('map')}>打开地图</button></div><DomainSummary /></section><section className="baize-panel rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-bold">收件箱</h2><span className="text-2xl font-bold">{inboxCount}</span></div><p className="mt-3 text-sm leading-6 text-[#718986]">T3 复用 Phase C/D 本地收件箱，通过适配器把明确选择的记录加入仓库内存草稿。</p><button type="button" className="baize-button-secondary mt-4" onClick={() => onNavigate('inbox')}><Inbox size={16} />处理记录</button></section></div>
  </div>;
}

function RouteView({ mainRoute, quests, progress, onFocus }: { mainRoute?: TechOsEntity; quests: TechOsEntity[]; progress: number; onFocus: (id: string) => void }) {
  if (!mainRoute) return <EmptyState title="没有 Main Route" detail="请先在 state.yml 中指定有效路线。" />;
  return <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]"><section className="space-y-5"><div className="baize-panel rounded-2xl p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64807c]">{mainRoute.id} · {statusLabel(mainRoute.status)}</p><h2 className="mt-2 text-2xl font-bold">{mainRoute.title}</h2><p className="mt-3 text-sm leading-6 text-[#718986]">{getTechOsString(mainRoute, 'reason')}</p><div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#5f8f84]/10"><div className="h-full bg-[#356b66] dark:bg-[#c9a96b]" style={{ width: `${progress}%` }} /></div><span className="text-xs font-semibold">{progress}%</span></div></div><div className="baize-panel rounded-2xl p-5"><h3 className="font-bold">Quest Sequence</h3><div className="mt-4 space-y-2">{quests.map((quest, index) => <button key={quest.id} type="button" onClick={() => onFocus(quest.id)} className="flex w-full items-start gap-3 rounded-xl border border-[#5f8f84]/10 p-3 text-left transition hover:border-[#5f8f84]/35 hover:bg-[#5f8f84]/5 dark:border-[#c9a96b]/10 dark:hover:border-[#c9a96b]/30"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${quest.status === 'active' ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#64807c] dark:bg-[#c9a96b]/8'}`}>{index + 1}</span><span><strong className="block text-sm">{quest.title}</strong><span className="mt-1 block text-xs text-[#718986]">{statusLabel(quest.status)} · {quest.id}</span></span></button>)}</div></div></section><EntityViewer entity={mainRoute} onFocus={onFocus} /></div>;
}

function EntityCollection({ title, description, entities, focusedId, onFocus }: { title: string; description: string; entities: TechOsEntity[]; focusedId: string; onFocus: (id: string) => void }) {
  const selected = getTechOsEntity(focusedId) || entities[0];
  if (!selected) return <EmptyState title={`暂无 ${title}`} detail="创建并通过 T1 校验后会自动出现在这里。" />;
  return <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]"><section className="baize-panel self-start rounded-2xl p-4 xl:sticky xl:top-24"><h2 className="px-2 text-lg font-bold">{title}</h2><p className="px-2 pt-1 text-xs leading-5 text-[#718986]">{description}</p><div className="mt-4 max-h-[65vh] space-y-2 overflow-y-auto pr-1">{entities.map(entity => <EntityListButton key={entity.id} entity={entity} active={selected.id === entity.id} onClick={() => onFocus(entity.id)} />)}</div></section><EntityViewer entity={selected} onFocus={onFocus} /></div>;
}

function EntityViewer({ entity, onFocus }: { entity: TechOsEntity; onFocus: (id: string) => void }) {
  const relations = getTechOsRelations(entity);
  return <article className="baize-panel min-w-0 rounded-2xl p-5 sm:p-7"><header className="border-b border-[#5f8f84]/15 pb-5 dark:border-[#c9a96b]/12"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-[#5f8f84]/10 px-2.5 py-1 font-semibold text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]">{KIND_LABELS[entity.kind]}</span><span className="text-[#718986]">{entity.id}</span><span className="text-[#718986]">·</span><span className="text-[#718986]">{statusLabel(entity.status)}</span>{entity.kind === 'knowledge' && <span className="rounded-full border border-[#5f8f84]/20 px-2 py-0.5 font-semibold">{getTechOsString(entity, 'level')}</span>}</div><h2 className="mt-3 text-2xl font-bold leading-tight">{entity.title}</h2><div className="mt-4 flex flex-wrap gap-2">{entity.tags.map(tag => <span key={tag} className="rounded-lg bg-[#5f8f84]/8 px-2 py-1 text-[11px] text-[#64807c] dark:bg-[#c9a96b]/8 dark:text-[#b8c6c1]">#{tag}</span>)}</div></header><div className="py-6"><MarkdownView body={entity.body} /></div>{relations.length > 0 && <footer className="border-t border-[#5f8f84]/15 pt-5 dark:border-[#c9a96b]/12"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#718986]">Related Objects</p><div className="flex flex-wrap gap-2">{relations.map(relation => <button key={relation.id} type="button" onClick={() => onFocus(relation.id)} className="baize-chip inline-flex items-center gap-1.5"><span>{relation.id}</span><ArrowRight size={12} /></button>)}</div></footer>}<p className="mt-6 break-all text-[10px] text-[#8aa09c]">Source: {entity.sourcePath}</p></article>;
}

function TechMapView({ focusedId, onFocus }: { focusedId: string; onFocus: (id: string) => void }) {
  const map = getTechOsEntities('tech-map')[0];
  const knowledge = getTechOsEntities('knowledge');
  const selected = knowledge.find(entity => entity.id === focusedId);
  return <div className="space-y-6"><section className="baize-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><Compass size={22} /></span><div><h2 className="text-xl font-bold">我知道什么</h2><p className="text-xs text-[#718986]">地图不是路线，也不会决定下一步。</p></div></div><DomainSummary /></section><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><section className="baize-panel rounded-2xl p-5"><h3 className="font-bold">Knowledge Nodes</h3><div className="mt-4 space-y-2">{knowledge.map(entity => <EntityListButton key={entity.id} entity={entity} active={selected?.id === entity.id} onClick={() => onFocus(entity.id)} />)}</div></section>{selected ? <EntityViewer entity={selected} onFocus={onFocus} /> : map ? <EntityViewer entity={map} onFocus={onFocus} /> : <EmptyState title="Tech Map 为空" detail="创建 Knowledge 后会在此按领域聚合。" />}</div></div>;
}

function BacklogView({ focusedId, onFocus }: { focusedId: string; onFocus: (id: string) => void }) {
  const routes = getTechOsEntities('route').filter(route => route.status === 'backlog');
  const seeds = getTechOsEntities('route-seed').filter(seed => seed.status === 'seed');
  const candidates = getTechOsEntities('route-seed').filter(seed => seed.status === 'candidate');
  const entities = [...routes, ...seeds, ...candidates];
  const selected = entities.find(entity => entity.id === focusedId) || entities[0];
  return <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]"><section className="space-y-5"><div className="baize-panel rounded-2xl p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">Route Backlog</p><div className="mt-3 grid grid-cols-3 gap-3"><div><strong className="text-3xl">{routes.length}</strong><span className="block text-xs text-[#718986]">Routes</span></div><div><strong className="text-3xl">{seeds.length}</strong><span className="block text-xs text-[#718986]">Seeds</span></div><div><strong className="text-3xl">{candidates.length}</strong><span className="block text-xs text-[#718986]">Candidates</span></div></div><p className="mt-4 text-xs leading-5 text-[#718986]">T4.2 整理 Candidate；T4.3 记录保存、归档或不感兴趣的决定。T4.4–T4.6 只生成 Review 与 Backlog Route 草稿，Main Route 始终由用户决定。</p></div><div className="baize-panel rounded-2xl p-4"><div className="space-y-2">{entities.map(entity => <EntityListButton key={entity.id} entity={entity} active={selected?.id === entity.id} onClick={() => onFocus(entity.id)} />)}</div></div></section>{selected ? <EntityViewer entity={selected} onFocus={onFocus} /> : <EmptyState title="Backlog 为空" detail="未选择的路线和真实问题产生的 Route Seed 会显示在这里。" />}</div>;
}

function InboxView({ items, indexedInboxIds, captureDrafts, onStage, onOpenInbox, onOpenRepository }: { items: InboxItem[]; indexedInboxIds: Set<string>; captureDrafts: TechOsCaptureDraft[]; onStage: (item: InboxItem) => void; onOpenInbox: () => void; onOpenRepository: () => void }) {
  const visibleItems = items.filter(item => !item.deletedAt && item.status === 'inbox').sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const pendingIds = new Set(captureDrafts.map(capture => capture.inboxItemId));
  return <div className="mx-auto max-w-4xl space-y-5">
    <section className="baize-panel rounded-3xl p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><Inbox size={26} /></span><div className="flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">T3 Capture Adapter</p><h2 className="mt-2 text-3xl font-bold">{visibleItems.length} 条待处理记录</h2><p className="mt-3 leading-7 text-[#64807c] dark:text-[#b8c6c1]">Question、Idea、Note、Link 继续保存在 Phase C/D 的同一个本地优先、加密同步 Inbox。处理操作只生成 Tech OS 内存草稿；提交成功后归档来源记录，不删除、不自动生成 Route Seed。</p><div className="mt-4 rounded-2xl border border-[#a85d50]/20 bg-[#a85d50]/7 p-4 text-sm leading-6 text-[#7d4b43] dark:text-[#e1a294]"><strong>公开边界：</strong>加入 Repository 的草稿会成为仓库中的明文 Markdown，并可能进入公开 Pages 前端投影。提交前请先确认内容适合公开。</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" className="baize-button-primary" onClick={onOpenInbox}><Inbox size={17} />新建或编辑 Capture</button>{captureDrafts.length > 0 && <button type="button" className="baize-button-secondary" onClick={onOpenRepository}><GitCompareArrows size={16} />查看 {captureDrafts.length} 个待提交草稿</button>}</div></div></div></section>

    {!visibleItems.length ? <EmptyState title="Inbox 已处理完" detail="在手机或导航底部使用快速记录，内容会先立即保存在本机。" /> : <section className="space-y-3">{visibleItems.map(item => {
      const captureKind = getTechOsCaptureKind(item);
      const pending = pendingIds.has(item.id);
      const indexed = indexedInboxIds.has(item.id);
      return <article key={item.id} className="baize-panel rounded-2xl p-5"><div className="flex flex-wrap items-start gap-3"><span className="rounded-full bg-[#5f8f84]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]">{TECH_OS_CAPTURE_LABELS[captureKind]}</span><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{captureItemTitle(item)}</h3>{item.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#64807c] dark:text-[#b8c6c1]">{item.content}</p>}{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-[#356b66] hover:underline dark:text-[#d2b775]">{item.url}</a>}<div className="mt-3 flex flex-wrap gap-2">{getVisibleInboxTags(item.tags).map(tag => <span key={tag} className="baize-chip">#{tag}</span>)}</div></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#5f8f84]/10 pt-4 dark:border-[#c9a96b]/10"><span className="break-all font-mono text-[10px] text-[#829793]">source_inbox_id: {item.id}</span>{indexed ? <span className="text-xs font-semibold text-[#315e5b] dark:text-[#c9d8d3]">已进入构建版本</span> : pending ? <button type="button" className="baize-button-secondary" onClick={onOpenRepository}><GitCompareArrows size={15} />已加入内存草稿</button> : <button type="button" className="baize-button-primary" onClick={() => onStage(item)}><ArrowRight size={15} />加入 Repository 草稿</button>}</div></article>;
    })}</section>}
  </div>;
}

function DomainSummary() {
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    getTechOsEntities('knowledge').forEach(entity => { const domain = getTechOsString(entity, 'domain') || 'other'; result.set(domain, (result.get(domain) || 0) + 1); });
    return result;
  }, []);
  const domains = ['internet', 'programming', 'system', 'architecture', 'electronics', 'ic', 'ai'];
  return <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{domains.map(domain => <div key={domain} className="rounded-xl border border-[#5f8f84]/10 p-3 dark:border-[#c9a96b]/10"><strong className="block text-lg">{counts.get(domain) || 0}</strong><span className="text-[11px] capitalize text-[#718986]">{domain}</span></div>)}</div>;
}

function EntityListButton({ entity, active, onClick }: { entity: TechOsEntity; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/10 hover:border-[#5f8f84]/30 dark:border-[#c9a96b]/10 dark:hover:border-[#c9a96b]/25'}`}><span className="block text-[10px] font-semibold uppercase tracking-wider text-[#718986]">{entity.id} · {statusLabel(entity.status)}</span><strong className="mt-1 block text-sm leading-5">{entity.title}</strong></button>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <section className="baize-panel rounded-2xl px-6 py-16 text-center"><Database size={28} className="mx-auto text-[#8aa09c]" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-[#718986]">{detail}</p></section>;
}

function summaryFromBody(body: string): string {
  return body.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#') && !line.startsWith('```'))[0] || '等待补充当前理解。';
}

function captureItemTitle(item: InboxItem): string {
  if (item.title) return item.title;
  if (item.type === 'link' && item.url) return new URL(item.url).hostname;
  return item.content?.split(/\r?\n/).find(Boolean)?.slice(0, 100) || '无标题 Capture';
}

function statusLabel(status: string): string {
  return status.replace(/(^|-)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`).replace(/-/g, ' ');
}

function getViewTitle(view: WorkspaceView): string {
  return NAV_ITEMS.find(item => item.id === view)?.label || 'Tech OS';
}

function viewForEntity(entity: TechOsEntity): WorkspaceView {
  if (entity.kind === 'vision') return 'dashboard';
  if (entity.kind === 'route') return entity.status === 'active' ? 'route' : 'backlog';
  if (entity.kind === 'route-seed') return 'backlog';
  if (entity.kind === 'route-review') return 'route-engine';
  if (entity.kind === 'quest' || entity.kind === 'question') return 'quest';
  if (entity.kind === 'knowledge') return 'knowledge';
  if (entity.kind === 'lab') return 'lab';
  if (entity.kind === 'project') return 'project';
  if (entity.kind === 'tech-map') return 'map';
  return 'inbox';
}
