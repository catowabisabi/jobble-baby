Task: Fix Profile Tab + Home Screen to read onboarding data

Repo: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

## Problem
- OnboardingScreen.tsx correctly saves baby profile to AsyncStorage key '@jobble_baby_profile'
- But Profile tab (app/(tabs)/profile.tsx) shows HARDCODED values: 'Luna', 'Born Jan 15, 2026 · Girl', parent 'Jamie & Sam'
- Home tab (app/(tabs)/index.tsx) greeting shows hardcoded 'Baby's Day'
- These should read from @jobble_baby_profile instead

## Changes needed

### 1. PROFILE TAB (app/(tabs)/profile.tsx)
- Add useEffect to load from AsyncStorage @jobble_baby_profile on mount
- Replace hardcoded baby name with loaded profile.name
- Replace hardcoded 'Born Jan 15, 2026 · Girl' with computed age + gender
  - Calculate age from birthDate: show "X months old" for <24m, "X years Y months" for older
  - Format gender: Boy / Girl / prefer_not_to_say from profile
- Replace hardcoded parent name with profile data if available

### 2. HOME SCREEN (app/(tabs)/index.tsx)
- Load baby profile from @jobble_baby_profile on mount
- Replace 'Baby's Day' with babyName + "'s Day" using loaded name
- Also use baby name in greeting (e.g. "Good morning, [babyName]'s parent")

### 3. PROFILE TYPES
Add BabyProfile interface in profile.tsx:
```typescript
type BabyProfile = {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
};
```

## Implementation notes
- Reuse STORAGE_KEY = '@jobble_baby_profile' that OnboardingScreen uses (already defined in _layout.tsx)
- Loading can be async; show fallback to hardcoded values while loading if needed
- No need to modify OnboardingScreen - it already saves correctly
- Keep all existing UI styling, badges, settings rows intact
- Calculate age like: const ageMonths = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000*60*60*24*30.44))

After making changes, run: npx tsc --noEmit

DO NOT ask questions. ULW
