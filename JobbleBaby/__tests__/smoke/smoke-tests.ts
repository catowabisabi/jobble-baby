/**
 * A. 煙霧測試 (Smoke Tests)
 * 
 * 目的：用最短時間確認項目基本可啟動
 * 
 * 運行方式：npm run test:smoke
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.join(__dirname, '..', '..');

interface SmokeResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

function checkFileExists(relativePath: string): boolean {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.existsSync(fullPath);
}

function runTsc(): { success: boolean; output: string } {
  try {
    // Run TypeScript check directly — non-zero exit means errors exist
    // --skipLibCheck avoids third-party type noise
    const output = execSync('npx tsc --noEmit --skipLibCheck 2>&1 || true', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 120000,
    });
    // Filter to only actual app-file errors (skip test files, jest types, node_modules)
    const appErrors = output
      .split('\n')
      .filter((line: string) =>
        line.includes('/app/') ||
        line.includes('/store/') ||
        line.includes('/utils/') ||
        line.includes('/hooks/') ||
        line.includes('/context/') ||
        line.includes('/components/') ||
        line.includes('/screens/')
      );
    const filteredOutput = appErrors.join('\n').trim();
    return { success: filteredOutput.length === 0, output: filteredOutput };
  } catch (e: unknown) {
    // execSync should not throw because we use || true above
    const error = e as { stdout?: string; stderr?: string; message?: string };
    const rawOutput = error.stdout ?? error.stderr ?? error.message ?? 'Unknown error';
    return { success: false, output: rawOutput.substring(0, 500) };
  }
}

function checkStorageKeys(): { total: number; keys: string[] } {
  const keysPath = path.join(PROJECT_ROOT, 'store/storage-keys.ts');
  if (!fs.existsSync(keysPath)) return { total: 0, keys: [] };

  const content = fs.readFileSync(keysPath, 'utf-8');
  const matches = content.matchAll(/^\s+[A-Z_]+:\s*"@jobble\/[^"]+"/gm);
  const keys = Array.from(matches, (m) => m[0].trim());
  return { total: keys.length, keys };
}

function checkI18nFiles(): { en: boolean; zh: boolean } {
  const enPath = path.join(PROJECT_ROOT, 'app/i18n/en.json');
  const zhPath = path.join(PROJECT_ROOT, 'app/i18n/zh.json');
  return {
    en: fs.existsSync(enPath),
    zh: fs.existsSync(zhPath),
  };
}

export async function runSmokeTests(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];

  // 1. TypeScript 編譯
  console.log('[SMOKE] Running TypeScript check...');
  const tscResult = runTsc();
  results.push({
    name: 'TypeScript 編譯',
    status: tscResult.success ? 'PASS' : 'FAIL',
    details: tscResult.success
      ? 'No errors'
      : tscResult.output.substring(0, 500),
  });

  // 2. app.json 完整性
  console.log('[SMOKE] Checking app.json...');
  const appJsonPath = path.join(PROJECT_ROOT, 'app.json');
  if (checkFileExists('app.json')) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      const hasName = !!appJson.expo?.name;
      const hasBundleId = !!appJson.expo?.ios?.bundleIdentifier;
      const hasPackage = !!appJson.expo?.android?.package;
      results.push({
        name: 'app.json 完整性',
        status: hasName && hasBundleId && hasPackage ? 'PASS' : 'FAIL',
        details: `name=${hasName}, bundleId=${hasBundleId}, package=${hasPackage}`,
      });
    } catch {
      results.push({
        name: 'app.json 完整性',
        status: 'FAIL',
        details: 'Failed to parse app.json',
      });
    }
  } else {
    results.push({
      name: 'app.json 存在性',
      status: 'FAIL',
      details: 'app.json not found',
    });
  }

  // 3. Storage Keys 數量
  console.log('[SMOKE] Checking Storage Keys...');
  const { total, keys } = checkStorageKeys();
  results.push({
    name: 'Storage Keys 存在',
    status: total > 50 ? 'PASS' : 'FAIL',
    details: `Found ${total} storage keys (expected 60+)`,
  });

  // 4. i18n 文件
  console.log('[SMOKE] Checking i18n files...');
  const i18nStatus = checkI18nFiles();
  results.push({
    name: 'i18n 文件',
    status: i18nStatus.en && i18nStatus.zh ? 'PASS' : 'FAIL',
    details: `en=${i18nStatus.en}, zh=${i18nStatus.zh}`,
  });

  // 5. 主要入口文件
  console.log('[SMOKE] Checking entry files...');
  const entryFiles = [
    'app/_layout.tsx',
    'app/(tabs)/index.tsx',
    'App.tsx',
    'index.ts',
    'store/storage-keys.ts',
    'app/utils/SafeStorage.ts',
  ];
  const missingEntries = entryFiles.filter((f) => !checkFileExists(f));
  results.push({
    name: '主要入口文件',
    status: missingEntries.length === 0 ? 'PASS' : 'FAIL',
    details: missingEntries.length > 0 ? `Missing: ${missingEntries.join(', ')}` : 'All found',
  });

  // 6. package.json 有效性
  console.log('[SMOKE] Checking package.json...');
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  if (checkFileExists('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const hasDeps = !!pkg.dependencies && Object.keys(pkg.dependencies).length > 0;
      const hasMain = !!pkg.main;
      results.push({
        name: 'package.json 有效性',
        status: hasDeps && hasMain ? 'PASS' : 'FAIL',
        details: `dependencies=${Object.keys(pkg.dependencies ?? {}).length}, main=${pkg.main}`,
      });
    } catch {
      results.push({
        name: 'package.json 有效性',
        status: 'FAIL',
        details: 'Failed to parse package.json',
      });
    }
  } else {
    results.push({
      name: 'package.json 存在性',
      status: 'FAIL',
      details: 'package.json not found',
    });
  }

  // 7. .env.example 存在 (可能在 root 或 JobbleBaby 目錄)
  console.log('[SMOKE] Checking .env.example...');
  const hasEnvExample = checkFileExists('.env.example') || checkFileExists('../.env.example');
  results.push({
    name: '.env.example',
    status: hasEnvExample ? 'PASS' : 'FAIL',
    details: hasEnvExample ? 'Found' : 'Not found',
  });

  return results;
}

// 運行入口
if (require.main === module) {
  const { getTimestampDir } = require('../helpers/createReport');
  const { generateReport, saveReport } = require('../helpers/createReport');

  console.log('=== Jobble Baby Smoke Tests ===\n');

  runSmokeTests()
    .then((results) => {
      console.log('\n=== Results ===');
      results.forEach((r) => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${r.name}: ${r.status}`);
        if (r.details) console.log(`   ${r.details}`);
      });

      const passCount = results.filter((r) => r.status === 'PASS').length;
      const total = results.length;
      console.log(`\n${passCount}/${total} smoke tests passed`);

      // 保存報告
      const commit = require('child_process')
        .execSync('git rev-parse HEAD 2>/dev/null || echo "unknown"', {
          encoding: 'utf-8',
        })
        .trim();
      const report = generateReport('smoke', results.map((r) => ({
        name: r.name,
        status: r.status,
        duration: 0,
        area: 'smoke',
        error: r.status === 'FAIL' ? r.details : undefined,
      })), commit);

      const outputDir = getTimestampDir(path.join(PROJECT_ROOT, 'runtime/logs/tests'));
      const reportPath = saveReport(report, outputDir);
      console.log(`\nReport saved to: ${reportPath}`);

      process.exit(passCount === total ? 0 : 1);
    })
    .catch((err) => {
      console.error('Smoke tests failed with error:', err);
      process.exit(1);
    });
}
