import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
/** Explicit reload is intentional: React.lazy retains rejected import promises. */
export class FeatureBoundary extends Component<{ name: string; onClose: () => void; fullPage?: boolean; overlay?: boolean; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const panel = <section role="alert" aria-label={this.props.name + '加载恢复'} className="baize-panel mx-auto w-full max-w-xl space-y-4 rounded-2xl p-5"><h1 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} />{this.props.name}暂时无法打开</h1><p className="text-sm leading-6">可能是网络中断、站点更新后模块地址失效，或页面发生错误。已保存到本机的数据不会被清除。</p><p className="text-xs appearance-muted">可先返回导航。网络恢复后刷新页面再试；刷新前请保存其他面板中正在编辑的内容。不会自动刷新或清空缓存。</p><div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" onClick={this.props.onClose}>返回导航 / 关闭</button><button type="button" className="baize-button-primary" onClick={() => window.location.reload()}><RefreshCw size={15} />刷新页面重试</button></div></section>;
    return this.props.overlay ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--app-bg)]/95 p-4">{panel}</div> : this.props.fullPage ? <main className="appearance-surface flex min-h-screen items-center justify-center p-4">{panel}</main> : <div className="basis-full py-3">{panel}</div>;
  }
}
