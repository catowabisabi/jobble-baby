#!/usr/bin/env node

/**
 * Jobble Baby Pre-Submission Audit Script
 * Validates app before store submission
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, 'app');
const I18N_DIR = path.join(APP_DIR, 'i18n');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Results tracking
const results = {
  tsc: { status: 'pending', message: '', errors: [] },
  consoleLog: { status: 'pending', message: '', matches: [] },
  i18n: { status: 'pending', message: '', missingEn: [], missingZh: [] },
  a11y: { status: 'pending', message: '', warnings: [] },
  screenshots: { status: 'pending', message: '', issues: [] }
};

function log(msg) {
  console.log(msg);
}

function logSection(title) {
  log(`\n=== ${title} ===`);
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
    // Also filter browser globals and common object properties
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
        // Skip node_modules, .expo, etc.
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
  logSection('[1/5] TypeScript Compilation');

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
    // Print first 20 errors
    results.tsc.errors.slice(0, 20).forEach(err => log(`    ${err}`));
    if (results.tsc.errors.length > 20) {
      log(`    ... and ${results.tsc.errors.length - 20} more errors`);
    }
    return false;
  }
}

// CHECK 2: Console.log Detection
function checkConsoleLogs() {
  logSection('[2/5] Console.log Detection');

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
  logSection('[3/5] i18n Key Validation');

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

  // Collect all keys used in .tsx files
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
  logSection('[4/5] Accessibility Labels');

  const tabsDir = path.join(APP_DIR, '(tabs)');
  if (!fs.existsSync(tabsDir)) {
    results.a11y.status = 'skip';
    results.a11y.message = 'SKIPPED (no (tabs) directory)';
    log(`  ${YELLOW}SKIPPED${RESET} (no (tabs) directory)`);
    return true;
  }

  const tsxFiles = fs.readdirSync(tabsDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(tabsDir, f));

  const interactiveTypes = ['TouchableOpacity', 'Pressable', 'TouchableWithoutFeedback', 'Button'];
  const a11yAttrRegex = /(accessibilityLabel|accessibilityRole|accessibilityState)\s*=/;

  const warnings = [];

  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Check if line contains an interactive element
        const hasInteractive = interactiveTypes.some(type => {
          const regex = new RegExp(`<${type}\\s*[^>]*>`);
          return regex.test(line);
        });

        if (hasInteractive) {
          // Check if this line or the next few lines have accessibility attributes
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
    return true; // Warning doesn't cause failure
  }
}

// CHECK 5: Screenshot Dimensions
function checkScreenshotDimensions() {
  logSection('[5/5] Screenshot Dimensions');

  const appStoreDir = path.join(ROOT_DIR, 'assets', 'screenshots', 'app-store');
  const playStoreDir = path.join(ROOT_DIR, 'assets', 'screenshots', 'play-store');

  const expectedDimensions = {
    appStore: { width: 1290, height: 2796 },
    playStore: { width: 1080, height: 2340 }
  };

  const issues = [];

  function readPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    // PNG header: bytes 16-23 = width, 24-31 = height (big-endian uint32)
    // But standard PNG signature is 8 bytes, then IHDR chunk
    // Width is at bytes 16-19, Height at bytes 20-23 (in IHDR)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  function checkDirectory(dir, expected) {
    if (!fs.existsSync(dir)) {
      return [{ type: 'missing_dir', dir: path.relative(ROOT_DIR, dir) }];
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
            file,
            expected: `${expected.width}x${expected.height}`,
            actual: `${dims.width}x${dims.height}`
          });
        }
      } catch (e) {
        dirIssues.push({ type: 'read_error', file, error: e.message });
      }
    }

    return dirIssues;
  }

  const appStoreIssues = checkDirectory(appStoreDir, expectedDimensions.appStore);
  const playStoreIssues = checkDirectory(playStoreDir, expectedDimensions.playStore);

  issues.push(...appStoreIssues, ...playStoreIssues);
  results.screenshots.issues = issues;

  if (appStoreIssues.length === 0 && playStoreIssues.length === 0) {
    if (!fs.existsSync(appStoreDir) && !fs.existsSync(playStoreDir)) {
      results.screenshots.status = 'skip';
      results.screenshots.message = 'SKIPPED (no screenshots directory)';
      log(`  ${YELLOW}SKIPPED${RESET} (no screenshots directory)`);
    } else {
      results.screenshots.status = 'pass';
      results.screenshots.message = 'PASS (all correct dimensions)';
      log(`  ${GREEN}PASS${RESET} (all correct dimensions)`);
    }
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
    return true; // Warning doesn't cause failure
  }
}

// Main execution
function main() {
  log('\n=== Jobble Baby Pre-Submission Audit ===\n');

  const tscOk = checkTypeScript();
  const consoleOk = checkConsoleLogs();
  const i18nOk = checkI18nKeys();
  const a11yOk = checkAccessibilityLabels();
  const screenshotsOk = checkScreenshotDimensions();

  // Print summary
  log('\n=== SUMMARY ===');

  const requiredFailed = !tscOk || !consoleOk || !i18nOk;

  if (requiredFailed) {
    log(`${RED}FAIL${RESET}: One or more REQUIRED checks failed`);
    if (!tscOk) {
      log('  - TypeScript compilation failed');
    }
    if (!consoleOk) {
      log(`  - Console.log detection found ${results.consoleLog.matches.length} matches`);
    }
    if (!i18nOk) {
      const enMsg = results.i18n.missingEn.length > 0 ? `\n    Missing in en.json: ${results.i18n.missingEn.slice(0, 5).join(', ')}${results.i18n.missingEn.length > 5 ? '...' : ''}` : '';
      const zhMsg = results.i18n.missingZh.length > 0 ? `\n    Missing in zh.json: ${results.i18n.missingZh.slice(0, 5).join(', ')}${results.i18n.missingZh.length > 5 ? '...' : ''}` : '';
      log(`  - i18n key validation failed${enMsg}${zhMsg}`);
    }
    log('\nRun again after fixing issues.');
    process.exit(1);
  } else {
    log(`${GREEN}PASS${RESET}: All REQUIRED checks passed`);
    if (!a11yOk || !screenshotsOk) {
      log('\nWarnings (non-blocking):');
      if (!a11yOk) {
        log(`  - ${results.a11y.warnings.length} elements missing accessibility labels`);
      }
      if (!screenshotsOk) {
        log(`  - ${results.screenshots.issues.length} screenshot dimension issues`);
      }
    }
    log('\nReady for submission!');
    process.exit(0);
  }
}

main();