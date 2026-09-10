const rank = { unknown:0, heard:1, known:2, available:3, owned:4 };
export function meets(state, condition) {
  if (!condition) return true;
  return Object.entries(condition).every(([key, value]) => {
    switch (key) {
      case 'all': return value.every(c => meets(state, c));
      case 'any': return value.some(c => meets(state, c));
      case 'flag': return !!state.progress.flags[value];
      case 'notFlag': return !state.progress.flags[value];
      case 'item': return (state.inventory[value] || 0) >= (condition.count || 1);
      case 'count': case 'status': return true;
      case 'stat': return (state.stats[value] || 0) >= (condition.count || 1);
      case 'prestige': return state.player.prestige >= value;
      case 'hero': return rank[state.heroes[value]?.status] >= rank[condition.status || 'known'];
      case 'visited': return state.progress.visited.includes(value);
      case 'time': return (state.worldMinute % 1440 >= 1080 || state.worldMinute % 1440 < 360 ? 'night' : 'day') === value;
      case 'liangshanLevel': return state.player.liangshanLevel >= value;
      case 'ownedCount': return Object.values(state.heroes).filter(h => h.status === 'owned').length >= value;
      case 'heroLevel': return Object.values(state.heroes).some(h => h.status === 'owned' && h.level >= value);
      case 'equipmentCount': return state.equipment.length >= value;
      case 'unvisited': return state.progress.visited.length < (Number.isInteger(value) ? value : 30);
      case 'feature': return false; // Reserved features never silently unlock MVP actions.
      default: return false;
    }
  });
}
export function exits(state, data) { return data.by.maps[state.location].links.filter(link => meets(state, link.condition)); }
export const heroRank = rank;
export function dungeonEntry(state, dungeon) {
  return !!dungeon && meets(state,dungeon.condition) && (dungeon.map===state.location || (dungeon.entrances||[]).some(e=>e.map===state.location&&meets(state,e.condition)));
}
