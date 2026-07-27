import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'dist';

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full);
      continue;
    }

    if (!full.endsWith('.d.ts')) {
      continue;
    }

    const original = readFileSync(full, 'utf8');
    const replaced = original
      .replace(/from\s+'@\/([^']+)\.ts'/g, "from 'anchor-kit/dist/src/$1'")
      .replace(/from\s+"@\/([^"]+)\.ts"/g, 'from "anchor-kit/dist/src/$1"')
      .replace(/from\s+'@\/([^']+)'/g, "from 'anchor-kit/dist/src/$1'")
      .replace(/from\s+"@\/([^"]+)"/g, 'from "anchor-kit/dist/src/$1"');

    if (replaced !== original) {
      writeFileSync(full, replaced);
    }
  }
}

walk(root);
