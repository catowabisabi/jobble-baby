## Sisyphus Task #401 — Fix i18n Orphan Keys

**Project**: JobbleBaby  
**Repo**: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby  
**Working Dir**: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

### Task

Fix i18n asymmetry between en.json and zh.json.

**Problem**: Flattened key comparison shows 25 zh.json keys that have NO counterpart in en.json. These are orphaned translations — they serve no purpose without source strings in en.json.

**Extra zh-only keys to remove**:
```
pincerGrasp.precise, pincerGrasp.radical,
tummyTime.dailyGoal, tummyTime.milestoneArmCrawl, tummyTime.milestoneArmCrawlDesc,
tummyTime.milestoneChestRaise, tummyTime.milestoneChestRaiseDesc,
tummyTime.milestoneCrawl, tummyTime.milestoneCrawlDesc,
tummyTime.milestoneHeadLift, tummyTime.milestoneHeadLiftDesc,
tummyTime.milestonePushUp, tummyTime.milestonePushUpDesc,
tummyTime.milestoneRollOver, tummyTime.milestoneRollOverDesc,
tummyTime.milestonePrompt.arm_crawl, tummyTime.milestonePrompt.chest_raise,
tummyTime.milestonePrompt.crawl, tummyTime.milestonePrompt.head_lift,
tummyTime.milestonePrompt.push_up, tummyTime.milestonePrompt.roll_over,
tummyTime.positionFront, tummyTime.positionPlank,
tummyTime.positionSide, tummyTime.rewardUnlocked
```

### Steps

1. Load `app/i18n/zh.json`
2. Delete all 25 paths above from zh.json
3. Save zh.json (preserve valid JSON structure)
4. Run flattened key comparison to confirm: 0 missing zh, 0 extra zh (perfect symmetry)
5. Run `npx tsc --noEmit` to confirm no TS errors
6. Commit: `fix: remove 25 orphan zh-only i18n keys`

### Verification
- Flatten both en.json and zh.json, confirm symmetric key sets
- TSC: 0 errors
- Git commit + push

Keywords: i18n, zh-json, orphan-keys

ULW