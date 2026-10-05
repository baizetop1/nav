import { useCallback, useEffect, useRef, useState, type FormEvent, type SetStateAction } from 'react';
import { addTranslationHistory, loadTranslationHistory, TRANSLATION_HISTORY_KEY, type TranslationHistoryItem } from '../lib/translationHistory';
import { safeSetLocalStorageItem, SHARED_SYNC_ENTRY_MAX_BYTES } from '../lib/safeStorage';
export const TRANSLATION_LANGUAGES = [['zh-CN', '简体中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'], ['fr', '法语'], ['de', '德语'], ['es', '西班牙语'], ['ru', '俄语']] as const;
export const translationLanguageName = (code: string) => TRANSLATION_LANGUAGES.find(([id]) => id === code)?.[1] || code;
export function useQuickTranslation() {
  const [translationText, updateText] = useState(''), [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, updateSource] = useState('en'), [targetLanguage, updateTarget] = useState('zh-CN');
  const [translationState, setTranslationState] = useState({ loading: false, error: '' });
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>(loadTranslationHistory);
  const request = useRef<{ controller: AbortController; id: number } | null>(null), serial = useRef(0);
  const cancel = useCallback(() => { serial.current++; request.current?.controller.abort(); request.current = null; setTranslationState({ loading: false, error: '' }); }, []);
  const setTranslationText = useCallback((value: SetStateAction<string>) => { cancel(); updateText(value); }, [cancel]);
  const setSourceLanguage = useCallback((value: SetStateAction<string>) => { cancel(); updateSource(value); }, [cancel]);
  const setTargetLanguage = useCallback((value: SetStateAction<string>) => { cancel(); updateTarget(value); }, [cancel]);
  useEffect(() => () => { serial.current++; request.current?.controller.abort(); }, []);
  useEffect(() => { safeSetLocalStorageItem(TRANSLATION_HISTORY_KEY, JSON.stringify(translationHistory), { label: '翻译历史', maxBytes: SHARED_SYNC_ENTRY_MAX_BYTES }); }, [translationHistory]);
  const translateInline = async (event: FormEvent) => {
    event.preventDefault(); cancel();
    const text = translationText.trim(), source = sourceLanguage, target = targetLanguage;
    if (!text) return;
    if (new TextEncoder().encode(text).length > 500) { setTranslationState({ loading: false, error: '免费接口单次最多支持 500 字节，请缩短文本。' }); return; }
    if (source === target) { setTranslatedText(text); return; }
    const controller = new AbortController(), id = ++serial.current; request.current = { controller, id };
    setTranslationState({ loading: true, error: '' });
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const params = new URLSearchParams({ q: text, langpair: source + '|' + target });
      const response = await fetch('https://api.mymemory.translated.net/get?' + params, { signal: controller.signal });
      const payload = await response.json() as { responseStatus?: number; responseData?: { translatedText?: unknown } };
      if (!response.ok || !Number.isFinite(payload.responseStatus) || payload.responseStatus! >= 400 || typeof payload.responseData?.translatedText !== 'string' || !payload.responseData.translatedText) throw new Error('免费翻译接口暂时不可用。');
      if (serial.current !== id) return;
      const result = new DOMParser().parseFromString(payload.responseData.translatedText, 'text/html').documentElement.textContent || payload.responseData.translatedText;
      setTranslatedText(result); setTranslationHistory(current => addTranslationHistory(current, { sourceText: text, translatedText: result, sourceLanguage: source, targetLanguage: target })); setTranslationState({ loading: false, error: '' });
    } catch (cause) { if (serial.current === id) setTranslationState({ loading: false, error: controller.signal.aborted ? '翻译请求超过 12 秒，请重试或使用 Google 回退。' : cause instanceof Error ? cause.message : '翻译失败，请稍后再试。' }); }
    finally { clearTimeout(timeout); if (request.current?.id === id) request.current = null; }
  };
  return { translationText, setTranslationText, translatedText, setTranslatedText, sourceLanguage, setSourceLanguage, targetLanguage, setTargetLanguage, translationState, setTranslationState, translationHistory, setTranslationHistory, translateInline };
}
