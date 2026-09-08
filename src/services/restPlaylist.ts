export const REST_SCENES = [
  { id: 'moonlight', name: '月光泛舟', title: '小狐狸的月光泛舟', heading: ['让思绪，', '漂一会儿。'], intro: '今晚的任务，是看一会儿月亮。', stamp: '慢一点，也很好', ending: '前方没有待办，只有晚风。' },
  { id: 'balloon', name: '云海漫游', title: '小兔子的云海漫游', heading: ['去云上，', '透一口气。'], intro: '让风决定方向，把时间留给自己。', stamp: '今天，轻一点', ending: '不着急落地，也不着急出发。' },
  { id: 'rain', name: '雨窗小憩', title: '小猫的雨窗小憩', heading: ['下雨了，', '先歇一歇。'], intro: '窗外是细雨，窗里有一杯温热。', stamp: '留一刻安静', ending: '雨会慢慢停，事情慢慢来。' },
  { id: 'camp', name: '星河露营', title: '小熊的星河露营', heading: ['把今天，', '交给星光。'], intro: '灯还亮着，今晚只管好好休息。', stamp: '晚安，小小世界', ending: '星星会守夜，你可以放松。' },
  { id: 'pelican', name: '海岸骑行', title: '鹈鹕的海岸骑行', heading: ['风正好，', '去兜一圈。'], intro: '不赶时间，只追海风。', stamp: '今天适合兜风', ending: '阳光、两个轮子，和一点点自由。' },
] as const;
export type RestSceneId = typeof REST_SCENES[number]['id'];
export const REST_ROTATION_INTERVALS = [30, 60, 120, 300] as const;
export const DEFAULT_REST_INTERVAL = 60;
export interface RestPlayhead { index: number; elapsedMs: number }

/** Count foreground viewing time only; a sleeping computer must not skip through scenes. */
export function advanceRestRotation(current: RestPlayhead, deltaMs: number, seconds: number): RestPlayhead {
  const duration = (REST_ROTATION_INTERVALS.some(value => value === seconds) ? seconds : DEFAULT_REST_INTERVAL) * 1000;
  const index = Number.isInteger(current.index) && current.index >= 0 ? current.index % REST_SCENES.length : 0;
  const elapsed = Number.isFinite(current.elapsedMs) ? Math.max(0, Math.min(current.elapsedMs, duration)) : 0;
  const delta = Number.isFinite(deltaMs) ? Math.min(2000, Math.max(0, deltaMs)) : 0;
  const total = elapsed + delta;
  return total >= duration ? { index: (index + 1) % REST_SCENES.length, elapsedMs: 0 } : { index, elapsedMs: total };
}
