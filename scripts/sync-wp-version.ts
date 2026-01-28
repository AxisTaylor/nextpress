/**
 * Syncs version from packages/wordpress/package.json to nextpress.php plugin header.
 * Run after `changeset version` to keep nextpress.php in sync.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = join(__dirname, '..');

// Read WordPress package version from package.json
const packagePath = join(ROOT_DIR, 'packages/wordpress/package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
const version = pkg.version;

console.log(`Syncing WordPress plugin to version ${version}...`);

// Update WordPress plugin header
const pluginPath = join(ROOT_DIR, 'packages/wordpress/nextpress.php');
let pluginContent = readFileSync(pluginPath, 'utf-8');
pluginContent = pluginContent.replace(
  /(\* Version:\s*)[\d.]+/,
  `$1${version}`
);
pluginContent = pluginContent.replace(
  /(define\(\s*'NEXTPRESS_VERSION',\s*')[\d.]+(')/,
  `$1${version}$2`
);
writeFileSync(pluginPath, pluginContent);

console.log(`  ✓ packages/wordpress/nextpress.php updated to ${version}`);

// Replace all `@since TDB` with the current version across WordPress plugin files
const wpPluginDir = join(ROOT_DIR, 'packages/wordpress');

function getPhpFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'vendor' && entry !== 'node_modules') {
      files.push(...getPhpFiles(fullPath));
    } else if (stat.isFile() && entry.endsWith('.php')) {
      files.push(fullPath);
    }
  }

  return files;
}

const phpFiles = getPhpFiles(wpPluginDir);
let replacedCount = 0;

for (const filePath of phpFiles) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;

  content = content.replace(/@since TDB/g, `@since ${version}`);

  if (content !== originalContent) {
    writeFileSync(filePath, content);
    const relativePath = filePath.replace(ROOT_DIR + '/', '');
    console.log(`  ✓ ${relativePath} - replaced @since TDB`);
    replacedCount++;
  }
}

if (replacedCount > 0) {
  console.log(`  ✓ Replaced @since TDB in ${replacedCount} file(s)`);
} else {
  console.log(`  ✓ No @since TDB placeholders found`);
}
