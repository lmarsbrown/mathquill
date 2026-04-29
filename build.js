const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SRC_DIR = './src';
const BUILD_DIR = './build';

const SOURCES_FULL = [
  'src/intro.js',
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
  'src/commands/math.ts',
  'src/commands/text.ts',
  'src/commands/math/advancedSymbols.ts',
  'src/commands/math/basicSymbols.ts',
  'src/commands/math/commands.ts',
  'src/commands/math/LatexCommandInput.ts',
  'src/commands/math/matrix.ts',
  'src/outro.js',
];

if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

let combined = '';
for (const file of SOURCES_FULL) {
  const content = fs.readFileSync(file, 'utf8');
  combined += content + '\n';
}

combined = combined.replace(/[^\x00-\x7F]/g, (char) => {
  return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
});

const result = ts.transpileModule(combined, {
  compilerOptions: {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.None,
  },
});

let output = result.outputText;
output = output.replace(/\{VERSION\}/g, 'v0.10.1-matrix');

fs.writeFileSync(path.join(BUILD_DIR, 'mathquill.js'), output);
console.log('Built mathquill.js');

const { execSync } = require('child_process');
try {
  execSync('npx lessc src/css/main.less build/mathquill.css', {
    stdio: 'inherit',
  });
  console.log('Built mathquill.css');
} catch (e) {
  console.error('Failed to build CSS:', e.message);
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
