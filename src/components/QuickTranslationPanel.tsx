import { useEffect, useRef } from 'react';
import { ArrowLeftRight, ChevronUp, Copy, Languages } from 'lucide-react';
import { TranslationHistoryPanel } from './TranslationHistoryPanel';
import { TRANSLATION_LANGUAGES, translationLanguageName, type useQuickTranslation } from '../hooks/useQuickTranslation';

export function QuickTranslationPanel({ translationText, setTranslationText, translatedText, setTranslatedText, sourceLanguage, setSourceLanguage, targetLanguage, setTargetLanguage, translationState, setTranslationState, translationHistory, setTranslationHistory, translateInline, onClose, focusRequest }: ReturnType<typeof useQuickTranslation> & { onClose: () => void; focusRequest: number }) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!focusRequest) return; input.current?.focus({ preventScroll: true }); input.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [focusRequest]);
            return <section id="quick-translator" className="baize-panel basis-full rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Languages size={17} />快捷翻译</span>
              <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded="true" onClick={onClose}><ChevronUp size={16} />收起</button>
            </div>
            <form onSubmit={translateInline}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-[#718986]">选择翻译语言</span>
                <select aria-label="翻译原文语言" value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
                <button type="button" className="baize-icon-button" aria-label="互换翻译语言" onClick={() => { setSourceLanguage(targetLanguage); setTargetLanguage(sourceLanguage); if (translatedText) { setTranslationText(translatedText); setTranslatedText(''); } }}><ArrowLeftRight size={17} /></button>
                <select aria-label="翻译目标语言" value={targetLanguage} onChange={event => setTargetLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea ref={input} id="translation-input" required value={translationText} onChange={event => { setTranslationText(event.target.value); setTranslationState({ loading: false, error: '' }); }} rows={5} className="baize-input resize-y" placeholder="输入要翻译的单句或短段落…" />
                <div className="baize-input relative min-h-32 whitespace-pre-wrap"><span className={translatedText ? '' : 'text-[#8aa39d]'}>{translatedText || '翻译结果会显示在这里'}</span>{translatedText && <button type="button" className="baize-icon-button absolute right-2 top-2" aria-label="复制翻译结果" onClick={() => { void navigator.clipboard.writeText(translatedText).catch(() => setTranslationState({ loading: false, error: "复制失败，请手动选择译文复制。" })); }}><Copy size={15} /></button>}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs ${translationState.error ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#718986]'}`}>{translationState.error || '直接调用 MyMemory 免费接口；请勿翻译敏感文本，单次最多 500 字节。'}</p>
                <div className="flex gap-2"><a className="baize-button-secondary" target="_blank" rel="noreferrer" href={`https://translate.google.com/?sl=${encodeURIComponent(sourceLanguage)}&tl=${encodeURIComponent(targetLanguage)}&text=${encodeURIComponent(translationText)}&op=translate`}>Google 回退</a><button disabled={translationState.loading || !translationText.trim()} className="baize-button-primary" type="submit"><Languages size={17} />{translationState.loading ? '翻译中…' : '立即翻译'}</button></div>
              </div>
            </form>
            <TranslationHistoryPanel
              history={translationHistory}
              languageName={translationLanguageName}
              onUse={item => {
                setTranslationText(item.sourceText);
                setTranslatedText(item.translatedText);
                setSourceLanguage(item.sourceLanguage);
                setTargetLanguage(item.targetLanguage);
                setTranslationState({ loading: false, error: '' });
              }}
              onDelete={id => setTranslationHistory(current => current.filter(item => item.id !== id))}
              onClear={() => setTranslationHistory([])}
            />
  </section>;
}
