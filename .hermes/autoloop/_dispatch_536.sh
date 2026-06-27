#!/bin/bash
# Dispatch cycle 536 — Jest test coverage for 4 more tab screens
cat > /tmp/sisyphus_task.txt << 'TASK'
FOCUS: Add Jest test coverage for 4 additional tab screens in JobbleBaby.

Write Jest mocked tests for these screens in JobbleBaby/__tests__/mocked/:
1. OralMotorScreen.test.tsx (oral-motor.tsx)
2. MilkTransferScreen.test.tsx (milk-transfer.tsx)
3. TeethingScreen.test.tsx (teething.tsx)
4. BottleRefusalScreen.test.tsx (bottle-refusal.tsx)

For each test file:
- Mock @react-native-async-storage/async-storage
- Mock react-native-safe-area-context
- Mock @react-native-community/datetimepicker
- Mock LanguageContext and ThemeContext
- Test: component mounts without crashing
- Test: screen renders correctly
- Test: main UI elements visible
- Test: buttons have press handlers

Follow existing patterns in __tests__/mocked/ (HomeScreen.test.tsx etc).

After writing all 4 files, run: cd JobbleBaby && npx jest --testPathPattern="__tests__/mocked/(OralMotor|MilkTransfer|Teething|BottleRefusal)Screen" --no-coverage

Show final jest pass/fail counts.

Keywords: oral_motor_pattern_sequences, milk_transfer_efficiency, teething_timeline_stages, bottle_refusal_behavioral_drivers
ULW
TASK

tmux send-keys -t jobble-baby "cat /tmp/sisyphus_task.txt | head -5" Enter
echo "Dispatched: cycle 536 — Jest test coverage for OralMotor, MilkTransfer, Teething, BottleRefusal screens"
