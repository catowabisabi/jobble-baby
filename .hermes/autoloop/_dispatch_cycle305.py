#!/usr/bin/env python3
"""Dispatch todo #121 — Infant Regulatory Fitness Dashboard"""

TASK = """# Task: Implement Infant Regulatory Fitness Dashboard (Todo #121, Concept #47)

## Overview
Create a new tab: `app/(tabs)/regulatory-fitness.tsx` — a holistic dashboard showing baby's regulatory fitness across 4 domains: autonomic, sensory, motor, emotional/social. Based on concept #47.

## References
- Concept #47 in progress.db (autonomic regulation, polyvagal theory, motor plan sequencing, proprioceptive feedback loop, vagus nerve tone, microbiome-gut-brain axis, sympathetic overflow, sensory window slam)
- Idea #74 in progress.db

## Implementation Steps

### 1. Data Model (AsyncStorage keys)
- `@jobble/regulatory_fitness`: { date, composite_score, autonomic_score, sensory_score, motor_score, social_score }
- Store as JSON array of daily entries (keep last 90 days)

### 2. UI Components
**Regulatory Fitness Score Card**
- Large circular score display (0-100)
- 4 domain mini-bars below (autonomic, sensory, motor, social)
- Color: green (80+), amber (50-79), red (<50)

**Domain Radar Chart** (simplified spider/radar using View + SVG-like layout)
- 4 axes: autonomic, sensory, motor, social
- Polygon fill with gradient colors per band

**Cascade Alert Banner**
- When any domain < 50, show warning: "Low {domain} detected → may affect {related_domain}"
- Amber background, calm icon

**7-Day Trend Line**
- Simple line chart showing composite score over 7 days
- Annotate key events (regressions, milestones) as dot markers

**Daily Check-in Quick Log**
- One-tap "Log Today's Fitness" button
- Opens modal: 4 sliders (0-100) for each domain + notes field
- Save to AsyncStorage

**Parent Calm Score Section**
- Show parallel parent regulatory fitness from stress-cascade data
- "Parent Fitness: {score}" with color indicator

### 3. File Structure
```
app/(tabs)/regulatory-fitness.tsx  — main tab
app/data/regulatoryFitness.ts      — data access layer
locales: regulatory_fitness.* keys → en.json/zh.json
```

### 4. Tab Registration
Add to `app/_layout.tsx` tab list as `regulatory-fitness`

## Verification
- TSC: `npx tsc --noEmit` → 0 errors
- i18n: add keys to en.json/zh.json (regulatory_fitness.*)
- Run: `node scripts/pre-submission-audit.js` → PASS

## Rules
- Follow existing tab patterns (use existing tabs like cry-analyzer.tsx, sensory-integration.tsx as reference)
- TSC must pass with 0 errors
- Add i18n keys for all user-facing strings
- Do NOT change any other files

## Keywords
regulatory_fitness, polyvagal_theory, cascade_alert

ULW"""
print(TASK)