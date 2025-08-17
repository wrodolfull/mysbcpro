import { promises as fs } from 'node:fs';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DIST_DIR = path.resolve(SCRIPT_DIR, '..', 'dist');

const RELATIVE_SPECIFIER_REGEXES = [
  // import ... from '...'; and export ... from '...';
  /(from\s+['"])(\.\.?[^'"\)]+)(['"])/g,
  // dynamic import('...')
  /(import\s*\(\s*['"])(\.\.?[^'"\)]+)(['"])\s*\)/g,
  // bare side-effect imports: import '...'
  /(import\s+['"])(\.\.?[^'"\)]+)(['"])/g
];

// Also fix extensionless relative exports in packages used by the app (workspace)
const EXTRA_DIRS = [
  path.resolve(SCRIPT_DIR, '..', '..', '..', 'packages', 'flow-nodes', 'dist'),
  path.resolve(SCRIPT_DIR, '..', '..', '..', 'packages', 'shared', 'dist')
];

const hasExtension = (specifier) => /(\.m?js|\.cjs|\.json|\.node)($|[?#])/i.test(specifier);

async function fixFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  let changed = false;

  for (const regex of RELATIVE_SPECIFIER_REGEXES) {
    content = content.replace(regex, (match, p1, spec, p3) => {
      if (!spec.startsWith('./') && !spec.startsWith('../')) return match;
      if (hasExtension(spec)) return match;
      const fixed = spec + '.js';
      changed = true;
      return `${p1}${fixed}${p3}`;
    });
  }

  if (changed) {
    await fs.writeFile(filePath, content, 'utf8');
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      await fixFile(fullPath);
    }
  }));
}

async function main() {
  try {
    await walk(DIST_DIR);
    for (const extra of EXTRA_DIRS) {
      try {
        await walk(extra);
      } catch {}
    }
    // eslint-disable-next-line no-console
    console.log('[fix-extensions] Updated import specifiers in dist');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fix-extensions] Failed:', err);
    process.exitCode = 1;
  }
}

await main();


