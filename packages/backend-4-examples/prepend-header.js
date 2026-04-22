#!/usr/bin/env node
/**
 * Prepends WordPress theme header to style.css
 *
 * This script ensures the WordPress theme header comment is at the very
 * top of the compiled style.css file, which is required for WordPress
 * to recognize the theme.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const styleFile = join(__dirname, 'web', 'app', 'themes', 'custom-block-theme', 'style.css');

// WordPress theme header
const header = `/*!
Theme Name: NextPress Custom Block Theme
Author: AxisTaylor, LLC
Author URI: https://axistaylor.com
Description: A custom block theme for testing NextPress.
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Version: 1.0.4
License: GNU General Public License v3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html
Text Domain: nextpress-custom-block-theme
Tags: block-themes, full-site-editing, e-commerce, woocommerce

NextPress Custom Block Theme, (C) 2025 AxisTaylor, LLC
NextPress Custom Block Theme is distributed under the terms of the GNU GPL.
*/

`;

try {
  // Read current file
  const content = readFileSync(styleFile, 'utf8');

  // Check if header is already at the top
  if (content.startsWith('/*!') && content.includes('Theme Name:')) {
    console.log('✓ WordPress theme header already at top of style.css');
    process.exit(0);
  }

  // Prepend header
  const newContent = header + content;

  // Write back
  writeFileSync(styleFile, newContent, 'utf8');

  console.log('✓ WordPress theme header prepended to style.css');
} catch (error) {
  console.error('Error prepending header:', error);
  process.exit(1);
}
