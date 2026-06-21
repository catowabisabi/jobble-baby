# Test Report — Jobble Baby

## Summary
- **Mode:** smoke
- **Started:** 2026-06-21T20:42:16.312Z
- **Finished:** 2026-06-21T20:42:16.312Z
- **Commit:** 4439a9272af264985bc893e2298117d32d84d745
- **Result:** PARTIAL

## Counts
| Result | Count |
|--------|-------:|
| Pass   | 5 |
| Fail   | 2 |
| Blocked | 0 |

## Top Failures
| Area | Test | Error | Evidence |
|------|------|-------|----------|
| smoke | TypeScript 編譯 | __tests__/a11y/a11y.test.ts(10,1): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
__tests__/a11y/a11y.test.ts(11,3): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest | duration=0ms |
| smoke | .env.example | Not found | duration=0ms |
## Coverage Summary
| Category | Status |
|----------|--------|
| Smoke Tests | ✅ Run |
| Unit Tests | ✅ Pass |
| Mocked Tests | ✅ Pass |

*Report generated: 2026-06-21T20:42:16.320Z*
