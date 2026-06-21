/**
 * 測試報告生成器
 */
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  duration: number;
  error?: string;
  area: string;
}

export interface TestReport {
  mode: string;
  started: string;
  finished: string;
  commit: string;
  result: 'PASS' | 'FAIL' | 'PARTIAL';
  counts: { pass: number; fail: number; blocked: number };
  failures: Array<{
    area: string;
    test: string;
    error: string;
    evidence: string;
  }>;
  artifacts: {
    screenshots: string[];
    logs: string[];
  };
}

export function generateReport(
  mode: string,
  results: TestResult[],
  commit: string
): TestReport {
  const now = new Date().toISOString();
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;

  const failures = results
    .filter((r) => r.status === 'FAIL')
    .map((r) => ({
      area: r.area,
      test: r.name,
      error: r.error ?? 'Unknown',
      evidence: `duration=${r.duration}ms`,
    }));

  return {
    mode,
    started: now,
    finished: now,
    commit,
    result: fail === 0 ? 'PASS' : fail > 0 && pass > 0 ? 'PARTIAL' : 'FAIL',
    counts: { pass, fail, blocked },
    failures,
    artifacts: { screenshots: [], logs: [] },
  };
}

export function saveReport(report: TestReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'report.md');
  const content = formatMarkdown(report);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function formatMarkdown(report: TestReport): string {
  const { mode, started, finished, commit, result, counts, failures } = report;

  let md = `# Test Report — Jobble Baby

## Summary
- **Mode:** ${mode}
- **Started:** ${started}
- **Finished:** ${finished}
- **Commit:** ${commit}
- **Result:** ${result}

## Counts
| Result | Count |
|--------|-------:|
| Pass   | ${counts.pass} |
| Fail   | ${counts.fail} |
| Blocked | ${counts.blocked} |

`;

  if (failures.length > 0) {
    md += `## Top Failures
| Area | Test | Error | Evidence |
|------|------|-------|----------|
`;
    failures.forEach((f) => {
      md += `| ${f.area} | ${f.test} | ${f.error} | ${f.evidence} |\n`;
    });
  } else {
    md += `## Top Failures
*No failures recorded.*

`;
  }

  md += `## Coverage Summary
| Category | Status |
|----------|--------|
| Smoke Tests | ${counts.pass + counts.fail > 0 ? '✅ Run' : '⏳ Pending'} |
| Unit Tests | ${counts.pass > 0 ? '✅ Pass' : '⏳ Pending'} |
| Mocked Tests | ${counts.pass > 0 ? '✅ Pass' : '⏳ Pending'} |

*Report generated: ${new Date().toISOString()}*
`;
  return md;
}

export function getTimestampDir(baseDir: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(baseDir, ts);
}
