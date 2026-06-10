# Pre-Submission Checklist (Idea #73)

## Pre-Audit (Run Before Any Submission)
- [ ] Run: `node scripts/pre-submission-audit.js`
- [ ] Result: All REQUIRED checks pass (warnings OK)
- [ ] TSC: 0 errors
- [ ] No console.log/debug/warn/error in app/
- [ ] All i18n keys in both en.json AND zh.json

## App Store Listing
### Metadata
- [ ] 100-character promotional text
- [ ] 4000-character description
- [ ] 100-character keywords (comma-separated)
- [ ] Keywords to include: auditory_processing, sibling_regression_correlation, temporal_landmark_feeding

### Screenshots (all in PNG format)
- [ ] iPhone 6.7" (1290x2796) - 6 screenshots required
- [ ] iPhone 6.3" (1170x2532) - 6 screenshots required
- [ ] iPhone 6.1" (1170x2556) - 6 screenshots required
- [ ] iPhone 5.5" (1242x2208) - 6 screenshots required
- [ ] iPad Pro12.9" (2048x2732) - 6 screenshots required
- [ ] iPad Pro 11" (1668x2388) - 6 screenshots required
- [ ] iPad mini 8.3" (1488x2266) - 6 screenshots required

### App Store Connect
- [ ] Bundle ID registered
- [ ] App-Specific Password created
- [ ] Export Compliance: Yes
- [ ] Age Rating: 4+
- [ ] Content Rights: Not providing third-party content
- [ ] Privacy Policy URL: live and accessible

## Google Play Store Listing
### Metadata
- [ ] 80-character short description
- [ ] 4000-character full description
- [ ] Feature graphic (1024x500 PNG)
- [ ] Store tags (5 maximum)

### Screenshots
- [ ] Phone screenshots (1080x2340) - 2-8 required
- [ ] 7" tablet screenshots (1080x2340)
- [ ] 10" tablet screenshots (1080x2340)

### Play Console
- [ ] AAB file uploaded
- [ ] Content rating questionnaire completed
- [ ] Target audience: Parents of infants (0-12 months)
- [ ] Age rating: Everyone

## Build & Credentials
- [ ] EAS credentials configured (iOS + Android)
- [ ] EAS build: `eas build --platform ios --profile production`
- [ ] EAS build: `eas build --platform android --profile production`
- [ ] TestFlight internal tester build uploaded
- [ ] Play Console internal testing track configured

## Privacy & Compliance
- [ ] iOS Privacy Manifest (NSPrivacyAccessedAPITypes) complete
- [ ] Privacy policy URL deployed (https://jobblebaby.com/privacy)
- [ ] No user data collection beyond core functionality
- [ ] Parental consent flow tested

## Submission
- [ ] TestFlight: Build reviewed and approved
- [ ] App Store Connect: App submitted for review
- [ ] Google Play Console: App submitted for review
- [ ] Submission confirmed via email

## Post-Submission
- [ ] App Store: Monitor for review status (1-3 days typically)
- [ ] Google Play: Monitor for review status (1-7 days typically)
- [ ] TestFlight: Keep internal testing active during review
- [ ] Prepare for rejection handling if applicable