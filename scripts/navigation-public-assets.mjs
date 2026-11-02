import fs from 'node:fs';
import path from 'node:path';

export const LEGACY_GAME_ENTRY_FILES = Object.freeze(['index.html', 'migration.css', 'migration.js']);

// The navigation release contains links and the old-origin save handoff only.
// The production game tree is never traversed or copied into this build.
export function collectNavigationPublicAssets({ publicRoot, legacyRoot }) {
  const assets = [];
  function visit(root, relative = '') {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!relative && entry.name === 'game') continue;
      if (entry.isSymbolicLink()) throw new Error('Navigation public assets must not contain symlinks: ' + path.join(relative, entry.name));
      const name = path.posix.join(relative.replaceAll('\\', '/'), entry.name);
      if (entry.isDirectory()) visit(root, name);
      else if (entry.isFile()) assets.push({ name, source: path.join(root, name) });
      else throw new Error('Unsupported navigation public asset: ' + name);
    }
  }
  visit(publicRoot);
  const legacyFiles = fs.readdirSync(legacyRoot, { withFileTypes: true });
  const names = legacyFiles.map(entry => entry.name).sort();
  if (JSON.stringify(names) !== JSON.stringify([...LEGACY_GAME_ENTRY_FILES].sort()) || legacyFiles.some(entry => !entry.isFile() || entry.isSymbolicLink())) {
    throw new Error('The legacy game entry must contain only index.html, migration.js and migration.css.');
  }
  for (const name of LEGACY_GAME_ENTRY_FILES) assets.push({ name: 'game/' + name, source: path.join(legacyRoot, name) });
  if (new Set(assets.map(asset => asset.name)).size !== assets.length) throw new Error('Duplicate navigation public asset name.');
  return assets;
}

export function navigationPublicAssets() {
  let root;
  return {
    name: 'navigation-public-assets-without-game',
    apply: 'build',
    configResolved(config) { root = config.root; },
    generateBundle() {
      const assets = collectNavigationPublicAssets({ publicRoot: path.join(root, 'public'), legacyRoot: path.join(root, 'server/shuihu-web/legacy-entry') });
      for (const asset of assets) this.emitFile({ type: 'asset', fileName: asset.name, source: fs.readFileSync(asset.source) });
    },
  };
}
