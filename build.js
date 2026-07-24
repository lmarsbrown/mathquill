const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SRC_DIR = './src';
const BUILD_DIR = './build';

const INTRO = 'src/intro.js';
const OUTRO = 'src/outro.js';

// Mirrors the Makefile's TEST_SUPPORT + UNIT_TESTS. The unit tests are a glob
// there, so new test/unit/*.test.{js,ts} files are picked up automatically.
const TEST_SUPPORT = [
  'test/support/assert.ts',
  'test/support/trigger-event.ts',
  'test/support/jquery-stub.ts',
];

// Mirrors the Makefile's BASE_SOURCES.
const BASE_SOURCES = [
  'src/utils.ts',
  'src/dom.ts',
  'src/unicode.ts',
  'src/browser.ts',
  'src/animate.ts',
  'src/services/aria.ts',
  'src/domFragment.ts',
  'src/tree.ts',
  'src/cursor.ts',
  'src/controller.ts',
  'src/publicapi.ts',
  'src/services/parser.util.ts',
  'src/services/saneKeyboardEvents.util.ts',
  'src/services/exportText.ts',
  'src/services/focusBlur.ts',
  'src/services/keystroke.ts',
  'src/services/latex.ts',
  'src/services/mouse.ts',
  'src/services/scrollHoriz.ts',
  'src/services/textarea.ts',
];

const SOURCES_FULL = [
  INTRO,
  ...BASE_SOURCES,
  'src/commands/math.ts',
  'src/commands/text.ts',
  'src/commands/math/advancedSymbols.ts',
  'src/commands/math/basicSymbols.ts',
  'src/commands/math/commands.ts',
  'src/commands/math/LatexCommandInput.ts',
  'src/commands/math/matrix.ts',
  'src/commands/math/iterate.ts',
  OUTRO,
];

// Mirrors the Makefile's SOURCES_BASIC. test/unit.html loads the basic bundle
// and calls MathQuill.noConflict() against it — without it, noConflict()
// restores window.MathQuill to undefined and every suite dies on "MQ is not
// defined", so this is required for the unit tests to run at all.
const SOURCES_BASIC = [
  INTRO,
  ...BASE_SOURCES,
  'src/commands/math.ts',
  'src/commands/math/basicSymbols.ts',
  'src/commands/math/commands.ts',
  OUTRO,
];

if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

/**
 * Concatenate the given files, optionally escape non-ASCII, transpile to ES5,
 * and stamp the version — the same recipe the Makefile uses.
 *
 * @param files       ordered source paths to concatenate
 * @param escapeNonAscii the main bundle escapes non-ASCII (the Makefile pipes
 *   through script/escape-non-ascii); the test bundle does not, so unicode in
 *   assertions survives
 * @returns the built JS
 */
function bundle(files, escapeNonAscii) {
  let combined = '';
  for (const file of files) {
    combined += fs.readFileSync(file, 'utf8') + '\n';
  }

  if (escapeNonAscii) {
    combined = combined.replace(/[^\x00-\x7F]/g, (char) => {
      return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });
  }

  const result = ts.transpileModule(combined, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.None,
    },
  });

  return result.outputText.replace(/\{VERSION\}/g, 'v0.10.1-matrix');
}

fs.writeFileSync(
  path.join(BUILD_DIR, 'mathquill.js'),
  bundle(SOURCES_FULL, true)
);
console.log('Built mathquill.js');

fs.writeFileSync(
  path.join(BUILD_DIR, 'mathquill-basic.js'),
  bundle(SOURCES_BASIC, true)
);
console.log('Built mathquill-basic.js');

// Test bundle: the full sources with the test support + unit suites spliced in
// before the outro, so test/unit.html works without `make` (unavailable on
// Windows, which is the documented build path for this fork).
const unitTests = fs
  .readdirSync('test/unit')
  .filter((f) => /\.test\.(js|ts)$/.test(f))
  .sort()
  .map((f) => path.posix.join('test/unit', f));

const testSources = [
  INTRO,
  ...SOURCES_FULL.filter((f) => f !== INTRO && f !== OUTRO),
  ...TEST_SUPPORT,
  ...unitTests,
  OUTRO,
];

fs.writeFileSync(
  path.join(BUILD_DIR, 'mathquill.test.js'),
  bundle(testSources, false)
);
console.log(`Built mathquill.test.js (${unitTests.length} suites)`);

const { execSync } = require('child_process');
try {
  execSync('npx lessc src/css/main.less build/mathquill.css', {
    stdio: 'inherit',
  });
  console.log('Built mathquill.css');
} catch (e) {
  console.error('Failed to build CSS:', e.message);
}

try {
  execSync(
    'npx lessc --modify-var="basic=true" src/css/main.less build/mathquill-basic.css',
    { stdio: 'inherit' }
  );
  console.log('Built mathquill-basic.css');
} catch (e) {
  console.error('Failed to build basic CSS:', e.message);
}

const fontSrc = 'src/fonts';
const fontDst = path.join(BUILD_DIR, 'fonts');
if (!fs.existsSync(fontDst)) {
  fs.mkdirSync(fontDst, { recursive: true });
}

const fonts = fs.readdirSync(fontSrc);
for (const font of fonts) {
  fs.copyFileSync(path.join(fontSrc, font), path.join(fontDst, font));
}
console.log('Copied fonts');

console.log('Build complete!');
