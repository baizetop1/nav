export const TRANSLATION_HISTORY_KEY = 'nav_translation_history';
export const TRANSLATION_HISTORY_LIMIT = 100;

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
}

type StorageLike = Pick<Storage, 'getItem'>;

function isHistoryItem(value: unknown): value is TranslationHistoryItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<TranslationHistoryItem>;
  return typeof item.id === 'string'
    && typeof item.sourceText === 'string'
    && typeof item.translatedText === 'string'
    && typeof item.sourceLanguage === 'string'
    && typeof item.targetLanguage === 'string'
    && typeof item.createdAt === 'string'
    && !Number.isNaN(Date.parse(item.createdAt));
}

export function loadTranslationHistory(storage?: StorageLike): TranslationHistoryItem[] {
  const source = storage || localStorage;
  try {
    const raw = source.getItem(TRANSLATION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem).slice(0, TRANSLATION_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function addTranslationHistory(
  history: TranslationHistoryItem[],
  value: Omit<TranslationHistoryItem, 'id' | 'createdAt'>,
): TranslationHistoryItem[] {
  const duplicateKey = `${value.sourceLanguage}\u0000${value.targetLanguage}\u0000${value.sourceText}\u0000${value.translatedText}`;
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const item: TranslationHistoryItem = { ...value, id, createdAt: new Date().toISOString() };
  return [
    item,
    ...history.filter(entry => `${entry.sourceLanguage}\u0000${entry.targetLanguage}\u0000${entry.sourceText}\u0000${entry.translatedText}` !== duplicateKey),
  ].slice(0, TRANSLATION_HISTORY_LIMIT);
}
