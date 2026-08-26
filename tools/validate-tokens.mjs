#!/usr/bin/env node
/* Design-system guard. Run: node tools/validate-tokens.mjs
 *
 * Fails the check when the page stops going through css/tokens/:
 *   - a var(--x) that no token file defines
 *   - a raw colour, px spacing value, font-size or font-weight written into a rule
 *   - a raw border width, or a named colour that bypasses the palette
 *   - a raw opacity, which used to be where the interaction language leaked out
 *   - a filter that manufactures a colour (invert/brightness) instead of using one
 *   - a spacing value that is not a step on the --space-* scale
 *   - a style="" attribute in the markup
 *   - a stylesheet <link> pointing at a file that is not there
 *   - a class name built in js/ that no rule file defines
 *   - a site footer that has drifted out of step across the pages
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
const htmlFiles = ['index.html', 'impressum.html', 'datenschutz.html'];
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`);

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const decomment = src => src.replace(/\/\*[\s\S]*?\*\//g, '');
/* What is left of a value once the tokens are taken out of it. Testing the whole
   value and skipping it when it contains a var() is not enough: "1px solid
   var(--line-ink)" is part token, part raw, and the raw half is the point.
   env() goes too — the 0px in env(safe-area-inset-top,0px) is that function's
   fallback for browsers without an inset, not a spacing decision. */
const bare = value => value.replace(/(?:var|env)\([^)]*\)/g, '');

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
const BORDER = /(?:^|[;{\s])(border|border-(?:top|right|bottom|left|width))\s*:\s*([^;}]+)/g;
/* transparent, currentColor and the none/inherit keywords are absences, not colours;
   everything else here names a colour the palette should have owned. */
const NAMED_COLOURS = /\b(?:white|black|red|green|blue|grey|gray|silver|maroon|olive|lime|aqua|teal|navy|fuchsia|purple|yellow|orange|pink|brown|beige|ivory|cream)\b/i;

for (const file of ruleFiles) {
  const src = decomment(read(file));

  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
    fail(file, `raw colour "${m[0]}" — add it to ${tokenDir}/colors.css and reference the alias`);
  }
  for (const m of src.matchAll(SPACING)) {
    const value = m[2].trim();
    if (/\d+px/.test(bare(value))) fail(file, `raw spacing "${m[1]}: ${value}" — use a --space-* token`);
  }
  for (const m of src.matchAll(BORDER)) {
    const value = m[2].trim();
    if (/\d+px/.test(bare(value))) fail(file, `raw border width "${m[1]}: ${value}" — use a --border-* token`);
  }
  for (const m of src.matchAll(/(?:^|[;{\s])(color|background|background-color|border[\w-]*|outline[\w-]*|fill|stroke)\s*:\s*([^;}]+)/g)) {
    if (NAMED_COLOURS.test(m[2])) {
      fail(file, `named colour "${m[1]}: ${m[2].trim()}" — use a token from ${tokenDir}/colors.css`);
    }
  }
  for (const m of src.matchAll(/(?:^|[;{\s])opacity\s*:\s*([^;}]+)/g)) {
    if (!/var\(/.test(m[1])) fail(file, `raw opacity "${m[1].trim()}" — use an --opacity-* token`);
  }
  /* invert() and brightness() produce a colour out of thin air — that is how the
     rotating mark ended up a different white from the wordmark. */
  for (const m of src.matchAll(/filter\s*:\s*([^;}]+)/g)) {
    if (/\b(?:invert|brightness|sepia|hue-rotate)\s*\(/.test(m[1])) {
      fail(file, `filter "${m[1].trim()}" manufactures a colour — paint it with a token instead (see .mark)`);
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

/* ---- 4. markup stays free of styling, and its stylesheets exist ---- */
for (const file of htmlFiles) {
  const src = read(file);
  const inline = [...src.matchAll(/\sstyle="/g)].length;
  if (inline) fail(file, `${inline} inline style="" attribute(s) — move them into css/components.css`);
  if (/<style[\s>]/.test(src)) fail(file, 'inline <style> block — move it into css/components.css');

  /* The stylesheets are linked one by one rather than pulled in by @import, so a
     wrong path no longer fails loudly at the parser — it just silently does nothing. */
  for (const m of src.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
    if (!fs.existsSync(path.join(root, m[1]))) fail(file, `<link> points at ${m[1]}, which does not exist`);
  }
}

/* ---- 5. classes built in JS have rules behind them ----
   js/gigs.js writes markup, so a class renamed in CSS but not in the script leaves
   the live dates unstyled — and every check above would still pass. */
const cssForClasses = decomment([...ruleFiles, ...tokenFiles].map(read).join('\n'))
  .replace(/url\([^)]*\)/g, '');
const cssClasses = new Set([...cssForClasses.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map(m => m[1]));

for (const file of jsFiles) {
  const src = decomment(read(file));
  const lists = [
    ...src.matchAll(/\bel\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g),
    ...src.matchAll(/\.className\s*=\s*['"]([^'"]+)['"]/g),
    ...src.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"]([^'"]+)['"]/g),
  ];
  for (const m of lists) {
    for (const cls of m[1].trim().split(/\s+/)) {
      if (cls && !cssClasses.has(cls)) {
        fail(file, `builds class "${cls}", which no rule file defines`);
      }
    }
  }
}

/* ---- 6. the footer is the same on every page ----
   There is no build step and no include, so the site footer is copied into every
   page by hand. That is a deliberate trade — but a copy that drifts is the whole
   cost of it, and drift is exactly what a machine should be watching for. */
const footers = htmlFiles.map(file => {
  const m = read(file).match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
  return { file, block: m && m[0] };
});
const withFooter = footers.filter(f => f.block);
if (withFooter.length > 1) {
  const [first, ...rest] = withFooter;
  for (const other of rest) {
    if (other.block !== first.block) {
      fail(other.file, `site footer differs from the one in ${first.file} — they are copies and must stay identical`);
    }
  }
}

/* ---- report ---- */
const allFiles = [...tokenFiles, ...ruleFiles, ...htmlFiles];
const unused = [...defined].filter(t => {
  const re = new RegExp('var\\(' + t + '[,)]');
  return !allFiles.some(f => re.test(read(f)));
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
