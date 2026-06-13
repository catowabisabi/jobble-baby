#!/usr/bin/env node

/**
 * Jobble Baby Pre-Submission Audit Script
 * Validates app before App Store/Play Console submission
 *
 * Checks:
 * 1. TypeScript Compilation (npx tsc --noEmit)
 * 2. Console.log Detection
 * 3. i18n Key Validation (en.json and zh.json)
 * 4. Accessibility Labels
 * 5. Screenshot Dimensions
 * 6. Tabs.Screen Alignment (all tab files have corresponding screen)
 * 7. AsyncStorage Key Consistency
 * 8. app.json Required Fields
 * 9. Hardcoded Non-i18n Strings in UI components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, 'app');
const I18N_DIR = path.join(APP_DIR, 'i18n');
const TABS_DIR = path.join(APP_DIR, '(tabs)');
const LAYOUT_FILE = path.join(TABS_DIR, '_layout.tsx');
const APP_JSON = path.join(ROOT_DIR, 'app.json');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Results tracking
const results = {
  tsc: { status: 'pending', message: '', errors: [] },
  consoleLog: { status: 'pending', message: '', matches: [] },
  i18n: { status: 'pending', message: '', missingEn: [], missingZh: [] },
  a11y: { status: 'pending', message: '', warnings: [] },
  screenshots: { status: 'pending', message: '', issues: [] },
  tabsAlignment: { status: 'pending', message: '', missing: [], extra: [] },
  asyncStorage: { status: 'pending', message: '', issues: [] },
  appJson: { status: 'pending', message: '', missing: [] },
  hardcodedStrings: { status: 'pending', message: '', matches: [] }
};

function log(msg) {
  console.log(msg);
}

function logSection(title) {
  log(`\n${BLUE}=== ${title} ===${RESET}`);
}

function padDot(status, maxLen = 50) {
  const dots = Math.max(3, maxLen - status.length);
  return '.'.repeat(dots);
}

function getKeyFromPath(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function collectI18nKeysFromFile(content) {
  const keys = new Set();
  // Match t('key') or t("key") but not t(`key`) (template literals)
  const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    // Filter out false positives: single chars, escape sequences, common JS/HTML tokens
    const invalidKeys = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'];
    if (key.length > 1 && !/^[T:\n\\]/.test(key) && !invalidKeys.includes(key)) {
      keys.add(key);
    }
  }
  return keys;
}

function collectI18nKeysFromDirectory(dir, extensions = ['.tsx', '.ts']) {
  const allKeys = new Set();
  const files = [];

  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.expo', '.git'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const keys = collectI18nKeysFromFile(content);
      keys.forEach(k => allKeys.add(k));
    } catch (e) {
      // Skip unreadable files
    }
  }

  return allKeys;
}

function getAllTsxFiles(dir) {
  const files = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.expo', '.git'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

// CHECK 1: TypeScript Compilation
function checkTypeScript() {
  logSection('[1/9] TypeScript Compilation');

  try {
    execSync('npx tsc --noEmit', { cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    results.tsc.status = 'pass';
    results.tsc.message = 'PASS (0 errors)';
    log(`  ${GREEN}PASS${RESET} (0 errors)`);
    return true;
  } catch (e) {
    results.tsc.status = 'fail';
    const output = e.stdout ? e.stdout.toString() : (e.stderr ? e.stderr.toString() : '');
    results.tsc.errors = output.split('\n').filter(l => l.trim());
    results.tsc.message = `FAIL (${results.tsc.errors.length} errors)`;
    log(`  ${RED}FAIL${RESET} (${results.tsc.errors.length} errors)`);
    results.tsc.errors.slice(0, 20).forEach(err => log(`    ${err}`));
    if (results.tsc.errors.length > 20) {
      log(`    ... and ${results.tsc.errors.length - 20} more errors`);
    }
    return false;
  }
}

// CHECK 2: Console.log Detection
function checkConsoleLogs() {
  logSection('[2/9] Console.log Detection');

  const tsxFiles = getAllTsxFiles(APP_DIR);
  const consoleRegex = /console\.(log|debug|warn|error)\s*\(/g;
  const matches = [];

  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const lineMatches = line.match(consoleRegex);
        if (lineMatches) {
          const relPath = path.relative(ROOT_DIR, file);
          matches.push(`${relPath}:${idx + 1}`);
        }
      });
    } catch (e) {
      // Skip unreadable files
    }
  }

  results.consoleLog.matches = matches;

  if (matches.length === 0) {
    results.consoleLog.status = 'pass';
    results.consoleLog.message = 'PASS (0 found)';
    log(`  ${GREEN}PASS${RESET} (0 found)`);
    return true;
  } else {
    results.consoleLog.status = 'fail';
    results.consoleLog.message = `FAIL (${matches.length} found)`;
    log(`  ${RED}FAIL${RESET} (${matches.length} found)`);
    matches.slice(0, 30).forEach(m => log(`    ${m}`));
    if (matches.length > 30) {
      log(`    ... and ${matches.length - 30} more`);
    }
    return false;
  }
}

// CHECK 3: i18n Key Validation
function checkI18nKeys() {
  logSection('[3/9] i18n Key Validation');

  const enPath = path.join(I18N_DIR, 'en.json');
  const zhPath = path.join(I18N_DIR, 'zh.json');

  if (!fs.existsSync(enPath) || !fs.existsSync(zhPath)) {
    results.i18n.status = 'fail';
    results.i18n.message = 'FAIL (i18n files not found)';
    log(`  ${RED}FAIL${RESET} (i18n files not found)`);
    return false;
  }

  let enData, zhData;
  try {
    enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    zhData = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  } catch (e) {
    results.i18n.status = 'fail';
    results.i18n.message = 'FAIL (invalid JSON)';
    log(`  ${RED}FAIL${RESET} (invalid JSON)`);
    return false;
  }

  const usedKeys = collectI18nKeysFromDirectory(APP_DIR);
  const missingInEn = [];
  const missingInZh = [];

  for (const key of usedKeys) {
    const inEn = getKeyFromPath(enData, key) !== undefined;
    const inZh = getKeyFromPath(zhData, key) !== undefined;

    if (!inEn) missingInEn.push(key);
    if (!inZh) missingInZh.push(key);
  }

  results.i18n.missingEn = missingInEn;
  results.i18n.missingZh = missingInZh;

  const totalMissing = missingInEn.length + missingInZh.length;

  if (totalMissing === 0) {
    results.i18n.status = 'pass';
    results.i18n.message = 'PASS (0 missing)';
    log(`  ${GREEN}PASS${RESET} (0 missing)`);
    return true;
  } else {
    results.i18n.status = 'fail';
    if (missingInEn.length > 0) {
      log(`  ${RED}Missing in en.json:${RESET} ${missingInEn.slice(0, 10).join(', ')}${missingInEn.length > 10 ? '...' : ''}`);
    }
    if (missingInZh.length > 0) {
      log(`  ${RED}Missing in zh.json:${RESET} ${missingInZh.slice(0, 10).join(', ')}${missingInZh.length > 10 ? '...' : ''}`);
    }
    results.i18n.message = `FAIL (${missingInEn.length} in en, ${missingInZh.length} in zh)`;
    return false;
  }
}

// CHECK 4: Accessibility Labels
function checkAccessibilityLabels() {
  logSection('[4/9] Accessibility Labels');

  if (!fs.existsSync(TABS_DIR)) {
    results.a11y.status = 'skip';
    results.a11y.message = 'SKIPPED (no (tabs) directory)';
    log(`  ${YELLOW}SKIPPED${RESET} (no (tabs) directory)`);
    return true;
  }

  const tsxFiles = fs.readdirSync(TABS_DIR)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(TABS_DIR, f));

  const interactiveTypes = ['TouchableOpacity', 'Pressable', 'TouchableWithoutFeedback', 'Button'];
  const a11yAttrRegex = /(accessibilityLabel|accessibilityRole|accessibilityState)\s*=/;

  const warnings = [];

  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const hasInteractive = interactiveTypes.some(type => {
          const regex = new RegExp(`<${type}\\s*[^>]*>`);
          return regex.test(line);
        });

        if (hasInteractive) {
          const surroundingLines = lines.slice(Math.max(0, idx), Math.min(lines.length, idx + 5)).join('\n');
          if (!a11yAttrRegex.test(surroundingLines)) {
            const relPath = path.relative(ROOT_DIR, file);
            warnings.push(`${relPath}:${idx + 1}`);
          }
        }
      });
    } catch (e) {
      // Skip unreadable files
    }
  }

  results.a11y.warnings = warnings;

  if (warnings.length === 0) {
    results.a11y.status = 'pass';
    results.a11y.message = 'PASS (0 missing)';
    log(`  ${GREEN}PASS${RESET} (0 missing)`);
    return true;
  } else {
    results.a11y.status = 'warning';
    results.a11y.message = `WARNING (${warnings.length} elements missing labels)`;
    log(`  ${YELLOW}WARNING${RESET} (${warnings.length} elements missing labels)`);
    warnings.slice(0, 10).forEach(w => log(`    ${w}`));
    if (warnings.length > 10) {
      log(`    ... and ${warnings.length - 10} more`);
    }
    return true;
  }
}

// CHECK 5: Screenshot Dimensions
function checkScreenshotDimensions() {
  logSection('[5/9] Screenshot Dimensions');

  // Check multiple possible locations for screenshots
  const possibleLocations = [
    { dir: path.join(ROOT_DIR, 'assets', 'screenshots', 'app-store'), label: 'app-store (screenshots)' },
    { dir: path.join(ROOT_DIR, 'assets', 'screenshots', 'play-store'), label: 'play-store (screenshots)' },
    { dir: path.join(ROOT_DIR, 'assets', 'app-store'), label: 'app-store (assets)' },
    { dir: path.join(ROOT_DIR, 'assets', 'play-store'), label: 'play-store (assets)' }
  ];

  const expectedDimensions = {
    // iPhone 16 Pro Max is the primary requirement
    appStore: { width: 1290, height: 2796 },
    // Play Store uses 1080x1920 for portrait phones
    playStore: { width: 1080, height: 1920 }
  };

  const issues = [];

  function readPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    // PNG header: bytes 16-23 = width, 24-31 = height (big-endian uint32)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  function checkDirectory(dir, expected, label) {
    if (!fs.existsSync(dir)) {
      return [{ type: 'missing_dir', dir: label }];
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    const dirIssues = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const dims = readPngDimensions(filePath);
        if (dims.width !== expected.width || dims.height !== expected.height) {
          dirIssues.push({
            type: 'dimension_mismatch',
            file: `${label}/${file}`,
            expected: `${expected.width}x${expected.height}`,
            actual: `${dims.width}x${dims.height}`
          });
        }
      } catch (e) {
        dirIssues.push({ type: 'read_error', file: `${label}/${file}`, error: e.message });
      }
    }

    return dirIssues;
  }

  // Check app store screenshots
  const appStoreIssues = checkDirectory(
    path.join(ROOT_DIR, 'assets', 'screenshots', 'app-store'),
    expectedDimensions.appStore,
    'screenshots/app-store'
  );
  if (appStoreIssues.length === 1 && appStoreIssues[0].type === 'missing_dir') {
    // Try alternate location
    const altAppStoreIssues = checkDirectory(
      path.join(ROOT_DIR, 'assets', 'app-store'),
      expectedDimensions.appStore,
      'app-store'
    );
    appStoreIssues.length = 0;
    appStoreIssues.push(...altAppStoreIssues);
  }

  // Check play store screenshots
  const playStoreIssues = checkDirectory(
    path.join(ROOT_DIR, 'assets', 'screenshots', 'play-store'),
    expectedDimensions.playStore,
    'screenshots/play-store'
  );
  if (playStoreIssues.length === 1 && playStoreIssues[0].type === 'missing_dir') {
    // Try alternate location
    const altPlayStoreIssues = checkDirectory(
      path.join(ROOT_DIR, 'assets', 'play-store'),
      expectedDimensions.playStore,
      'play-store'
    );
    playStoreIssues.length = 0;
    playStoreIssues.push(...altPlayStoreIssues);
  }

  issues.push(...appStoreIssues, ...playStoreIssues);
  results.screenshots.issues = issues;

  const hasAppStore = fs.existsSync(path.join(ROOT_DIR, 'assets', 'screenshots', 'app-store')) ||
                      fs.existsSync(path.join(ROOT_DIR, 'assets', 'app-store'));
  const hasPlayStore = fs.existsSync(path.join(ROOT_DIR, 'assets', 'screenshots', 'play-store')) ||
                       fs.existsSync(path.join(ROOT_DIR, 'assets', 'play-store'));

  if (!hasAppStore && !hasPlayStore) {
    results.screenshots.status = 'skip';
    results.screenshots.message = 'SKIPPED (no screenshots directory)';
    log(`  ${YELLOW}SKIPPED${RESET} (no screenshots directory found in assets/)`);
    return true;
  }

  if (appStoreIssues.length === 0 && playStoreIssues.length === 0) {
    results.screenshots.status = 'pass';
    results.screenshots.message = 'PASS (all correct dimensions)';
    log(`  ${GREEN}PASS${RESET} (all correct dimensions)`);
    return true;
  } else {
    results.screenshots.status = 'warning';
    for (const issue of issues.slice(0, 10)) {
      if (issue.type === 'missing_dir') {
        log(`  ${YELLOW}WARNING${RESET} ${issue.dir}: Directory not found`);
      } else if (issue.type === 'dimension_mismatch') {
        log(`  ${YELLOW}WARNING${RESET} ${issue.file}: Expected ${issue.expected}, got ${issue.actual}`);
      } else if (issue.type === 'read_error') {
        log(`  ${YELLOW}WARNING${RESET} ${issue.file}: Could not read - ${issue.error}`);
      }
    }
    results.screenshots.message = `WARNING (${issues.length} issues)`;
    return true;
  }
}

// CHECK 6: Tabs.Screen Alignment
function checkTabsAlignment() {
  logSection('[6/9] Tabs.Screen Alignment');

  if (!fs.existsSync(TABS_DIR) || !fs.existsSync(LAYOUT_FILE)) {
    results.tabsAlignment.status = 'fail';
    results.tabsAlignment.message = 'FAIL (tabs directory or layout not found)';
    log(`  ${RED}FAIL${RESET} (tabs directory or layout not found)`);
    return false;
  }

  // Get all .tsx files in tabs directory (excluding _layout.tsx)
  const tabFiles = fs.readdirSync(TABS_DIR)
    .filter(f => f.endsWith('.tsx') && f !== '_layout.tsx')
    .map(f => f.replace('.tsx', ''));

  // Parse _layout.tsx to extract Tabs.Screen names
  const layoutContent = fs.readFileSync(LAYOUT_FILE, 'utf8');
  const screenNameRegex = /<Tabs\.Screen\s+name\s*=\s*["']([^"']+)["']/g;
  const screensInLayout = [];
  let match;
  while ((match = screenNameRegex.exec(layoutContent)) !== null) {
    screensInLayout.push(match[1]);
  }

  // Find missing screens (tab files without Tabs.Screen)
  const missing = tabFiles.filter(f => !screensInLayout.includes(f));
  // Find extra screens (Tabs.Screen without corresponding file)
  const extra = screensInLayout.filter(s => !tabFiles.includes(s));

  results.tabsAlignment.missing = missing;
  results.tabsAlignment.extra = extra;

  if (missing.length === 0 && extra.length === 0) {
    results.tabsAlignment.status = 'pass';
    results.tabsAlignment.message = `PASS (${tabFiles.length} tabs, ${screensInLayout.length} screens)`;
    log(`  ${GREEN}PASS${RESET} (${tabFiles.length} tab files, ${screensInLayout.length} Tabs.Screen entries)`);
    return true;
  } else {
    results.tabsAlignment.status = 'fail';
    let msg = '';
    if (missing.length > 0) {
      msg += `\n  ${RED}Tab files without Tabs.Screen:${RESET} ${missing.join(', ')}`;
    }
    if (extra.length > 0) {
      msg += `\n  ${RED}Tabs.Screen without tab file:${RESET} ${extra.join(', ')}`;
    }
    results.tabsAlignment.message = `FAIL (${missing.length} missing, ${extra.length} extra)`;
    log(`  ${RED}FAIL${RESET}${msg}`);
    return false;
  }
}

// CHECK 7: AsyncStorage Key Consistency
function checkAsyncStorageKeys() {
  logSection('[7/9] AsyncStorage Key Consistency');

  const tsxFiles = getAllTsxFiles(APP_DIR);
  const asyncStorageRegex = /AsyncStorage\.(getItem|setItem|removeItem|getAllKeys)\s*\(\s*['"](@jobble\/[^'"]+)['"]/g;

  const foundKeys = new Set();
  const issues = [];

  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = asyncStorageRegex.exec(content)) !== null) {
        const key = match[1];
        foundKeys.add(key);

        // Check naming convention: @jobble/<module>_<submodule>_<entity>
        // Valid patterns: @jobble/tracking_entries, @jobble_baby_profile
        const validPatterns = [
          /^@jobble\/[a-z_]+$/,           // @jobble/single_word
          /^@jobble\/[a-z_]+_[a-z_]+$/,   // @jobble/module_submodule
          /^@jobble_[a-z_]+$/,            // @jobble_baby_profile (alternative)
        ];

        const isValid = validPatterns.some(p => p.test(key));
        if (!isValid) {
          issues.push({
            file: path.relative(ROOT_DIR, file),
            key,
            reason: 'Non-standard naming convention'
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  results.asyncStorage.issues = issues;

  if (issues.length === 0) {
    results.asyncStorage.status = 'pass';
    results.asyncStorage.message = `PASS (${foundKeys.size} @jobble/ keys consistent)`;
    log(`  ${GREEN}PASS${RESET} (${foundKeys.size} @jobble/ keys, all follow naming convention)`);
    return true;
  } else {
    results.asyncStorage.status = 'warning';
    results.asyncStorage.message = `WARNING (${issues.length} non-standard keys)`;
    log(`  ${YELLOW}WARNING${RESET} (${issues.length} non-standard AsyncStorage keys)`);
    issues.slice(0, 10).forEach(issue => {
      log(`    ${issue.file}: ${issue.key} - ${issue.reason}`);
    });
    if (issues.length > 10) {
      log(`    ... and ${issues.length - 10} more`);
    }
    return true;
  }
}

// CHECK 8: app.json Required Fields
function checkAppJson() {
  logSection('[8/9] app.json Required Fields');

  if (!fs.existsSync(APP_JSON)) {
    results.appJson.status = 'fail';
    results.appJson.message = 'FAIL (app.json not found)';
    log(`  ${RED}FAIL${RESET} (app.json not found at project root)`);
    return false;
  }

  let appData;
  try {
    appData = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  } catch (e) {
    results.appJson.status = 'fail';
    results.appJson.message = 'FAIL (invalid JSON)';
    log(`  ${RED}FAIL${RESET} (app.json is not valid JSON)`);
    return false;
  }

  // In Expo SDK 50+, config is under "expo" key
  const config = appData.expo || appData;

  const requiredFields = [
    { path: 'name', label: 'App name' },
    { path: 'version', label: 'Version' },
    { path: 'slug', label: 'Slug' },
    { path: 'ios.bundleIdentifier', label: 'iOS Bundle ID' },
    { path: 'android.package', label: 'Android Package' }
  ];

  const missing = [];

  for (const field of requiredFields) {
    const value = getKeyFromPath(config, field.path);
    if (value === undefined || value === null || value === '') {
      missing.push(field.label);
    }
  }

  results.appJson.missing = missing;

  if (missing.length === 0) {
    results.appJson.status = 'pass';
    results.appJson.message = 'PASS (all required fields present)';
    log(`  ${GREEN}PASS${RESET} (all required fields present)`);
    log(`    name: ${getKeyFromPath(config, 'name')}`);
    log(`    version: ${getKeyFromPath(config, 'version')}`);
    log(`    slug: ${getKeyFromPath(config, 'slug')}`);
    log(`    ios.bundleIdentifier: ${getKeyFromPath(config, 'ios.bundleIdentifier')}`);
    log(`    android.package: ${getKeyFromPath(config, 'android.package')}`);
    return true;
  } else {
    results.appJson.status = 'fail';
    results.appJson.message = `FAIL (${missing.length} missing fields)`;
    log(`  ${RED}FAIL${RESET} (missing fields: ${missing.join(', ')})`);
    return false;
  }
}

// CHECK 9: Hardcoded Non-i18n Strings in UI Components
function checkHardcodedStrings() {
  logSection('[9/9] Hardcoded Non-i18n Strings Detection');

  if (!fs.existsSync(TABS_DIR)) {
    results.hardcodedStrings.status = 'skip';
    results.hardcodedStrings.message = 'SKIPPED (no (tabs) directory)';
    log(`  ${YELLOW}SKIPPED${RESET} (no (tabs) directory)`);
    return true;
  }

  const tsxFiles = fs.readdirSync(TABS_DIR)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(TABS_DIR, f));

  // Patterns for hardcoded strings that should use i18n
  const hardcodedPatterns = [
    {
      // Array definitions with string labels: ['Feeding', 'Sleep', ...]
      regex: /^\s*(const|let|var)\s+\w+\s*=\s*\[([^\]]*)\]/g,
      filter: (match) => {
        // Check if the array contains string literals that aren't i18n keys
        const arrayContent = match[2];
        const stringLiterals = arrayContent.match(/['"`][^'"`]+['"`]/g);
        if (!stringLiterals) return false;
        // Filter out strings that look like i18n keys (contain dots or underscores)
        return stringLiterals.some(s => {
          const content = s.slice(1, -1);
          return content.length > 0 && !content.includes('.') && !content.includes('_') &&
                 !content.includes('tabs.') && !content.includes('common.');
        });
      },
      description: 'Static string arrays'
    },
    {
      // Object property string values: { key: 'Some String' }
      regex: /\{[^}]*label\s*:\s*['"]([^'"]+)['"]/g,
      filter: (match) => {
        const label = match[1];
        return label.length > 2 && !label.includes('.') && !label.includes('tabs.') &&
               !label.includes('common.') && !label.includes('_');
      },
      description: 'Object label properties'
    }
  ];

  const matches = [];

  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Skip lines that already use i18n (t() or useLanguage)
        if (line.includes('t(') || line.includes('useLanguage')) {
          return;
        }
        // Skip lines with placeholder text or TextInput (placeholders dont need i18n)
        if (line.includes('placeholder') || line.includes('TextInput')) {
          return;
        }

        // Check for hardcoded string arrays (const XXX = ['String1', 'String2', ...])
        const arrayMatch = line.match(/const\s+(\w+)\s*=\s*\[([^\]]+)\]/);
        if (arrayMatch) {
          const arrayContent = arrayMatch[2];
          const strings = arrayContent.match(/['"]([^-][^'"]+)['"]/g);
          if (strings && strings.length > 2) {
            // Filter out pure-data arrays (hex colors, emoji, short-word data keys — universal or internal)
            const isDataArray = strings.every(s => {
              const content = s.slice(1, -1);
              // Hex colors: #RGB or #RRGGBB
              if (/^#[0-9A-Fa-f]{3,6}$/.test(content)) return true;
              // Single-character emoji (😀 = 1 code point) — universal
              if (content.length === 2 && content.charCodeAt(0) >= 0xD800 && content.charCodeAt(0) <= 0xDBFF) return true;
              return false;
            });
            if (isDataArray) return; // Skip pure data arrays

            // Also skip arrays where ALL items are short non-space tokens (≤6 chars, no spaces)
            // These are data-key arrays used as internal constants, not user-facing prose
            const allShortTokens = strings.every(s => {
              const content = s.slice(1, -1);
              return content.length > 0 && content.length <= 6 && !content.includes(' ') && !content.includes('.');
            });
            if (allShortTokens) return; // Skip short-token data arrays

            const relPath = path.relative(ROOT_DIR, file);
            matches.push({
              file: relPath,
              line: idx + 1,
              type: 'string_array',
              content: strings.slice(0, 3).join(', ') + (strings.length > 3 ? '...' : '')
            });
          }
        }
      });
    } catch (e) {
      // Skip unreadable files
    }
  }

  results.hardcodedStrings.matches = matches;

  if (matches.length === 0) {
    results.hardcodedStrings.status = 'pass';
    results.hardcodedStrings.message = 'PASS (0 hardcoded strings found)';
    log(`  ${GREEN}PASS${RESET} (0 hardcoded non-i18n strings found)`);
    return true;
  } else {
    results.hardcodedStrings.status = 'warning';
    results.hardcodedStrings.message = `WARNING (${matches.length} potential hardcoded strings)`;
    log(`  ${YELLOW}WARNING${RESET} (${matches.length} potential hardcoded strings)`);
    matches.slice(0, 10).forEach(m => {
      log(`    ${m.file}:${m.line} [${m.type}] ${m.content}`);
    });
    if (matches.length > 10) {
      log(`    ... and ${matches.length - 10} more`);
    }
    return true;
  }
}

// Main execution
function main() {
  log('\n' + '='.repeat(60));
  log('  Jobble Baby Pre-Submission Audit');
  log('='.repeat(60));

  const checks = [
    { name: 'TypeScript', fn: checkTypeScript, required: true },
    { name: 'Console.log', fn: checkConsoleLogs, required: true },
    { name: 'i18n Keys', fn: checkI18nKeys, required: true },
    { name: 'Accessibility', fn: checkAccessibilityLabels, required: false },
    { name: 'Screenshots', fn: checkScreenshotDimensions, required: false },
    { name: 'Tabs Alignment', fn: checkTabsAlignment, required: true },
    { name: 'AsyncStorage', fn: checkAsyncStorageKeys, required: false },
    { name: 'app.json', fn: checkAppJson, required: true },
    { name: 'Hardcoded Strings', fn: checkHardcodedStrings, required: false }
  ];

  const results_list = checks.map(check => ({
    name: check.name,
    passed: check.fn(),
    required: check.required
  }));

  // Print summary
  log('\n' + '='.repeat(60));
  log('  SUMMARY');
  log('='.repeat(60));

  const requiredFailed = results_list.filter(r => r.required && !r.passed);

  if (requiredFailed.length === 0) {
    log(`${GREEN}PASS${RESET}: All REQUIRED checks passed`);
    const warnings = results_list.filter(r => !r.required && !r.passed);
    if (warnings.length > 0) {
      log('\nWarnings (non-blocking):');
      warnings.forEach(w => {
        const result = results[w.name.toLowerCase().replace(/ /g, '')];
        if (result) {
          log(`  - ${w.name}: ${result.message}`);
        }
      });
    }
    log('\nReady for submission!');
    process.exit(0);
  } else {
    log(`${RED}FAIL${RESET}: One or more REQUIRED checks failed:`);
    requiredFailed.forEach(r => {
      log(`  - ${r.name} failed`);
    });
    log('\nFix the above issues and run again.');
    process.exit(1);
  }
}

main();