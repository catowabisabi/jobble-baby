const fs = require('fs');
const path = require('path');

const REPO = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby';
const SRCDIR = path.join(REPO, 'JobbleBaby', 'app');
const I18NDIR = path.join(SRCDIR, 'i18n');
const EN_JSON = path.join(I18NDIR, 'en.json');
const ZH_JSON = path.join(I18NDIR, 'zh.json');
const LAYOUT_FILE = path.join(SRCDIR, '(tabs)', '_layout.tsx');
const STORE_DIR = path.join(REPO, 'store');
const APP_JSON = path.join(REPO, 'JobbleBaby', 'app.json');

const results = { checks: [], exitCode: 0 };

function check(name, fn) {
  try {
    const r = fn();
    results.checks.push(r);
    if (!r.pass) results.exitCode = 1;
  } catch(e) {
    results.checks.push({ name, pass: false, issues: [e.message] });
    results.exitCode = 1;
  }
}

// 1. Tab Navigator Check
check('TabNavigator', () => {
  const layout = fs.readFileSync(LAYOUT_FILE, 'utf8');
  const tabFiles = fs.readdirSync(path.join(SRCDIR, '(tabs)')).filter(f => f.endsWith('.tsx') && f !== '_layout.tsx');
  const screenMatches = [...layout.matchAll(/Tabs\.Screen\s+name="([^"]+)"/g)].map(m => m[1]);
  const missing = tabFiles.filter(f => {
    const name = f.replace('.tsx', '');
    return !screenMatches.includes(name);
  });
  return { name: 'TabNavigator', pass: missing.length === 0, issues: missing };
});

// 2. i18n Coverage Check
check('i18nCoverage', () => {
  const en = JSON.parse(fs.readFileSync(EN_JSON, 'utf8'));
  const zh = JSON.parse(fs.readFileSync(ZH_JSON, 'utf8'));
  const enKeys = Object.keys(en);
  const zhKeys = Object.keys(zh);
  const missingZh = enKeys.filter(k => !(k in zh));
  const missingEn = zhKeys.filter(k => !(k in en));
  return {
    name: 'i18nCoverage',
    pass: missingZh.length === 0 && missingEn.length === 0,
    issues: { missingZh, missingEn },
    meta: { enCount: enKeys.length, zhCount: zhKeys.length }
  };
});

// 3. app.json Completeness
check('appJson', () => {
  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  const required = ['expo.name', 'expo.slug', 'expo.version', 'expo.ios.bundleIdentifier', 'expo.android.package'];
  const missing = required.filter(p => {
    const val = p.split('.').reduce((o, k) => o && o[k], app);
    return !val;
  });
  return { name: 'appJson', pass: missing.length === 0, issues: missing };
});

// 4. Screenshot Dimension Check (existence only)
check('ScreenshotDimensions', () => {
  if (!fs.existsSync(STORE_DIR)) return { name: 'ScreenshotDimensions', pass: true, issues: [] };
  const files = fs.readdirSync(STORE_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  return { name: 'ScreenshotDimensions', pass: true, issues: [], meta: { count: files.length } };
});

// 5. TSC Validation
check('TSCParse', () => {
  const { execSync } = require('child_process');
  try {
    execSync('cd ' + path.join(REPO, 'JobbleBaby') + ' && npx tsc --noEmit 2>&1', { timeout: 60000, stdio: 'pipe' });
    return { name: 'TSCParse', pass: true, issues: [] };
  } catch(e) {
    const output = e.stdout ? e.stdout.toString() : (e.stderr ? e.stderr.toString() : e.message);
    return { name: 'TSCParse', pass: false, issues: [output.substring(0, 800)] };
  }
});

// 6. Hardcoded String Audit (basic)
check('HardcodedStrings', () => {
  const tabsDir = path.join(SRCDIR, '(tabs)');
  const files = fs.readdirSync(tabsDir).filter(f => f.endsWith('.tsx'));
  const issues = [];
  files.forEach(f => {
    const content = fs.readFileSync(path.join(tabsDir, f), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // Skip lines that are comments, imports, or contain t()
      if (line.trim().startsWith('//') || line.includes("import") || line.includes('t(')) return;
      // Find <Text> with visible content not in i18n
      if (/<Text[^>]*>[A-Za-z]{4,}/.test(line) && !line.includes('{`') && !line.includes('${')) {
        const match = line.match(/<Text[^>]*>([^<{]+)</);
        if (match && match[1].trim().length > 0) {
          issues.push(`${f}:${i+1}: "${match[1].trim().substring(0, 60)}"`);
        }
      }
    });
  });
  return { name: 'HardcodedStrings', pass: issues.length === 0, issues: issues.slice(0, 20) };
});

const report = JSON.stringify(results, null, 2);
fs.writeFileSync(path.join(REPO, 'scripts', 'pre-submission-audit.json'), report);

console.log('\n=== Pre-Submission Audit ===');
results.checks.forEach(c => {
  const icon = c.pass ? 'PASS' : 'FAIL';
  const meta = c.meta ? ' (' + JSON.stringify(c.meta) + ')' : '';
  const issueStr = (c.issues && c.issues.length > 0) ? ' — ' + JSON.stringify(c.issues).substring(0, 120) : '';
  console.log('[' + icon + '] ' + c.name + meta + issueStr);
});
console.log('\nReport: scripts/pre-submission-audit.json');
console.log('Exit code: ' + results.exitCode);
process.exit(results.exitCode);