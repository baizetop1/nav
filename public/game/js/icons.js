// Local, monochrome SVGs: no icon font, image request or runtime dependency.
const shapes=Object.freeze({
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  heroes:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
  bag:'<path d="M8 6V4h8v2M7 6h10a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a3 3 0 0 1 3-3Z"/><path d="M8 6v4h8V6M8 15h8v6"/>',
  recruit:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 7v6M16 10h6"/>',
  quests:'<path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 3 3 5-6"/>',
  chronicle:'<path d="M12 5C9 3 6 3 3 4v16c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v16Z"/>',
  save:'<path d="M4 3h13l4 4v14H3V4a1 1 0 0 1 1-1Z"/><path d="M7 3v6h9V3M7 21v-8h10v8M13 5v2"/>',
  forge:'<path d="m14 3 7 7-3 3-3-3L6 20a2 2 0 0 1-3-3l10-9-3-3 4-2Z"/>',
  battle:'<path d="m5 3 6 2 10 14-2 2L5 11 3 5l2-2ZM4 17l3 3M15 4l4-1 2 2-1 4-4 4M3 21l7-7"/>',
  shield:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  scheme:'<path d="M9 18h6M10 21h4M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3Z"/><path d="m9 10 3 2 3-2M12 12v6"/>',
  event:'<path d="M21 11a8 8 0 0 1-8 8H9l-6 3 2-6a8 8 0 0 1-2-5 8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/><path d="M7 9h10M7 13h6"/>',
  move:'<path d="M3 12h18m-7-7 7 7-7 7"/>',
  back:'<path d="M21 12H3m7-7-7 7 7 7"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  energy:'<path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z"/>',
  coins:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6"/>',
  medal:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  ticket:'<path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4Z"/><path d="M12 7v2m0 2v2m0 2v2"/>',
  medicine:'<path d="M8 3h8M9 3v5l-4 6v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6l-4-6V3M5 14h14M12 16v3m-2-1.5h4"/>',
  craft:'<path d="m12 2 4 4-4 4-4-4 4-4ZM6 12l4 4-4 4-4-4 4-4Zm12 0 4 4-4 4-4-4 4-4Z"/>',
  gift:'<path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C2 9 5-1 10 4l2 5Zm0 0c10 0 7-10 2-5l-2 5Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  restore:'<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
});
export function icon(name){
  if(typeof name!=='string'||!Object.hasOwn(shapes,name))return '';
  return `<svg class="game-icon" data-icon="${name}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]}</svg>`;
}
const actions=Object.freeze({skillUpgrade:'scheme',skillBook:'chronicle',martialDrill:'battle',mountAdopt:'heroes',mountFeed:'gift',mountRank:'medal',mountRide:'move',ui_start:'map',ui_battlePause:'clock',battleSkill:'scheme',battleItem:'medicine',battleRetreat:'back',move:'move',search:'search',wait:'clock',meet:'event',guide:'heroes',recruit:'recruit',craftOrder:'ticket',quest:'quests',dailyBonus:'gift',exchange:'craft',buy:'coins',buyEquip:'coins',craftEquip:'forge',strengthen:'forge',ui_equip:'shield',equip:'shield',ui_dismantle:'trash',ui_team:'heroes',team:'heroes',ui_export:'download',ui_import:'upload',ui_backup:'restore',ui_reload:'restore',ui_confirmImport:'check',ui_cancelImport:'close',ui_reset:'restore',story:'chronicle',startScheme:'scheme',dungeon:'battle',finishBattle:'check',finishScheme:'check',eventChoice:'check',use:'medicine'});
export function actionIcon(command){
  if(command.type==='turn'){const turns={attack:'battle',guard:'shield',scheme:'scheme',retreat:'back',item:'medicine'};return Object.hasOwn(turns,command.id)?turns[command.id]:'';}
  if(command.type==='scheme')return command.id==='retreat'?'back':'scheme';
  return Object.hasOwn(actions,command.type)?actions[command.type]:'';
}
