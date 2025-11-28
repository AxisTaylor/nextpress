/**
 * Syncs version from packages/wordpress/package.json to nextpress.php plugin header.
 * Run after `changeset version` to keep nextpress.php in sync.
 */

import { readFileSync, writeFileSync } from 'fs';
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
