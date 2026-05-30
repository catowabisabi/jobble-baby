# App Store Screenshot Specification — Jobble Baby

## Required Device Sizes

Apple requires screenshots for each device size your app supports. Jobble Baby supports iPhone and iPad.

### iPhone Sizes (Portrait)
| Device | Size (px) | Display |
|--------|-----------|---------|
| iPhone 16 Pro Max | 1290 × 2796 | 6.7" |
| iPhone 16 Pro | 1206 × 2622 | 6.3" |
| iPhone 16 / 15 / 14 | 1179 × 2556 | 6.1" |
| iPhone SE (3rd gen) | 750 × 1334 | 4.7" |

### iPad Sizes (Portrait + Landscape)
| Device | Size (px) |
|--------|-----------|
| iPad Pro 12.9" (6th gen) | 2048 × 2732 (portrait) / 2732 × 2048 (landscape) |
| iPad Pro 11" (4th gen) | 1668 × 2388 (portrait) / 2388 × 1668 (landscape) |
| iPad Air (5th gen) | 1640 × 2360 (portrait) |
| iPad mini (9th gen) | 1336 × 2048 (portrait) |

## Required Screenshots Per Device (Minimum)

### iPhone (6 screenshots each)
1. **Home Tab** — App home screen showing baby name greeting, quick stats
2. **Tracking Tab** — Diaper/feeding entry screen with log entries
3. **Schedule Tab** — Schedule overview with reminder cards
4. **Products Tab** — Product discovery grid/list
5. **Profile Tab** — Baby profile with growth data
6. **Growth Tab** — Growth chart visualization

### iPad (same 6 tabs)
- Same content as iPhone, scaled to iPad resolution
- Must submit at least 1 iPad screenshot set

## Text Overlay Guidelines

Apple allows text overlays on screenshots but recommends keeping them minimal.

### Recommended Overlays (per screenshot)
- Tab name at top (e.g., "Home", "Tracking")
- One short tagline at bottom (e.g., "Track every moment")
- Use system font or clean sans-serif
- Keep text within safe area (avoid edges)

## How to Capture Real Screenshots

**Option A: macOS + Xcode (Recommended)**
1. Open project in Xcode: `open ios/JobbleBaby.xcworkspace`
2. Select iPhone simulator → Run
3. Navigate to each tab → `Cmd+S` to capture
4. Use Preview or Pixelmator to add text overlays
5. Export at exact required sizes

**Option B: Expo + Device (for real screenshots)**
1. Run `npx expo start` in JobbleBaby/
2. Scan QR with iPhone/iPad (same Apple ID network)
3. Navigate each tab and screenshot via iOS Screen Recording
4. Crop to exact required sizes

**Option C: Simulator Screenshot Tool**
```bash
# List available simulators
xcrun simctl list devices available

# Boot a simulator and capture
xcrun simctl boot "iPhone 16 Pro"
screencapture -m ~/Desktop/screenshot-iphone16pro-home.png
```

## File Naming Convention
```
AppStore-iPhone16ProMax-Home.png
AppStore-iPhone16ProMax-Tracking.png
AppStore-iPhone16ProMax-Schedule.png
AppStore-iPhone16ProMax-Products.png
AppStore-iPhone16ProMax-Profile.png
AppStore-iPhone16ProMax-Growth.png
AppStore-iPadPro12.9-Home.png
...
```

## Notes
- Screenshots must be in PNG or JPEG format
- No Flash elements or animations
- No device frames required by Apple (optional by design preference)
- Minimum 72 DPI, no maximum PPI requirement
- RGB color space required

## macOS Requirement
Capturing iOS App Store screenshots requires **macOS** (for Xcode or iOS Simulator). This cannot be done from Linux/WSL. Schedule time on a Mac to complete this step before App Store submission.