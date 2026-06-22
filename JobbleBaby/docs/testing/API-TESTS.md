# C. 後端 API 整合測試

## 狀態：❌ 未實現

## 目標
測試後端 API endpoints 的 request/response 完整性、錯誤處理、數據庫寫入。

## 建議結構
```
tests/
└── api/
    ├── baby-profile.test.ts      # /api/baby-profile
    ├── feeding-entries.test.ts   # /api/feeding
    ├── sleep-entries.test.ts     # /api/sleep
    ├── growth-entries.test.ts    # /api/growth
    └── auth.test.ts              # /api/auth (if exists)
```

## 測試策略

### 隔離原則
- 使用測試 database（不可用正式 database）
- 每個 test 前 `beforeAll`: 清理 + 初始化已知狀態
- 每個 test 後 `afterAll`: 清理

### 建議測試內容
1. **Happy path**: 正確的 request → 201/200 + 正確的 response body
2. **Validation**: 缺少必填欄位 → 400 + 錯誤詳情
3. **Authentication**: 未登入 → 401
4. **Authorization**: 其他用戶的資源 → 403
5. **Not found**: 資源不存在 → 404
6. **Concurrent writes**: 同一資源的併發更新 → 最後寫入 wins 或 409

## Mock/Stub 策略
- **需要真實的 HTTP 請求** — 不能完全 mock
- 可以 mock 外部第三方 API（如發送通知的 API）
- Database 必須是真實的測試 instance（SQLite in-memory 或 Docker container）

## 執行方式（目標）
```bash
npm run test:api
# 或: npm test -- --testPathPattern="tests/api"
```
