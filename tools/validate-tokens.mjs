#!/usr/bin/env node
/* Design-system guard. Run: node tools/validate-tokens.mjs
 *
 * Fails the check when the page stops going through css/tokens/:
 *   - a var(--x) that no token file defines
 *   - a raw colour, px spacing value or font-size written into a rule
 *   - a spacing value that is not a step on the --space-* scale
 *   - a style="" attribute in the markup
 * Token files themselves are exempt: raw values are what they are for.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const tokenDir = 'css/tokens';
const tokenFiles = fs.readdirSync(path.join(root, tokenDir)).map(f => `${tokenDir}/${f}`);
const ruleFiles = ['css/base.css', 'css/components.css'];
const htmlFiles = ['index.html'];

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

/* ---- 1. every var() resolves ---- */
const tokenSrc = tokenFiles.map(read).join('\n');
const defined = new Set([...tokenSrc.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));
const scale = new Set([...tokenSrc.matchAll(/--space-\d+\s*:\s*(\d+)px/g)].map(m => +m[1]));

for (const file of [...tokenFiles, ...ruleFiles, ...htmlFiles]) {
  const src = read(file);
  for (const m of src.matchAll(/var\((--[\w-]+)/g)) {
    if (!defined.has(m[1])) fail(file, `var(${m[1]}) is not defined in ${tokenDir}/`);
  }
}

/* ---- 2. rule files carry no raw values ---- */
const SPACING = /(?:^|[;{\s])(padding|margin|gap|row-gap|column-gap|padding-(?:top|right|bottom|left)|margin-(?:top|right|bottom|left))\s*:\s*([^;}]+)/g;

for (const file of ruleFiles) {
  const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '');

  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
    fail(file, `raw colour "${m[0]}" — add it to ${tokenDir}/colors.css and reference the alias`);
  }
  for (const m of src.matchAll(SPACING)) {
    const value = m[2].trim();
    if (/var\(/.test(value)) continue;
    for (const px of value.matchAll(/(\d+)px/g)) {
      fail(file, `raw spacing "${m[1]}: ${value}" — use a --space-* token`);
      break;
    }
  }
  for (const m of src.matchAll(/font-size\s*:\s*([^;}]+)/g)) {
    if (!/var\(/.test(m[1])) fail(file, `raw font-size "${m[1].trim()}" — use a --type-* token`);
  }
  for (const m of src.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    fail(file, `raw font-weight "${m[1]}" — use a --weight-* token`);
  }
}

/* ---- 3. the spacing scale is actually a scale ---- */
for (const m of tokenSrc.matchAll(/^\s*(--(?:band-pad|space)[\w-]*)\s*:\s*(\d+)px/gm)) {
  if (!scale.has(+m[2])) fail(`${tokenDir}/spacing.css`, `${m[1]} is ${m[2]}px, which is not a step on the --space-* scale`);
}

/* ---- 4. markup stays free of styling ---- */
for (const file of htmlFiles) {
  const src = read(file);
  const inline = [...src.matchAll(/\sstyle="/g)].length;
  if (inline) fail(file, `${inline} inline style="" attribute(s) — move them into css/components.css`);
  if (/<style[\s>]/.test(src)) fail(file, 'inline <style> block — move it into css/components.css');
}

/* ---- report ---- */
const unused = [...defined].filter(t => {
  const re = new RegExp('var\\(' + t + '[,)]');
  return ![...tokenFiles, ...ruleFiles, ...htmlFiles].some(f => re.test(read(f)));
});

if (problems.length) {
  console.error(`✗ ${problems.length} design-system violation(s):\n`);
  problems.forEach(p => console.error('  ' + p));
  console.error('');
  process.exit(1);
}

console.log(`✓ ${defined.size} tokens defined, every value on the page resolves to one.`);
if (unused.length) {
  console.log(`\n  ${unused.length} token(s) defined but unused — brand vocabulary held in reserve, not an error:`);
  console.log('  ' + unused.join(', '));
}
