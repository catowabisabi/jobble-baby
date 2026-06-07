#!/usr/bin/env python3
"""Spark concept: Growth Montage Generator"""
import sqlite3
from datetime import datetime

DB = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/progress.db'
now = datetime.utcnow().isoformat()

concept_desc = """## Concept: Growth Montage Generator

### Spark
From keywords: milestone_cluster_activation_sequence + growth_percentil_band_trajectory + developmental_age_adjusted_score

### Problem
Parents take thousands of photos of their baby but never organize them into a meaningful growth narrative. They want to share baby's journey with family and look back on it themselves. A growth montage (time-lapse video of baby's face/body over time) is the single most-shareable piece of content for new parents — more viral than any text update. No baby app provides this.

### UX Flow
1. **Photo Selection Hub**: Grid view of all baby photos from device gallery (via expo-image-picker). Auto-filter to baby's face using on-device face detection. Select 5-50 photos with date range filter.
2. **Growth Montage Generator**: Generate a time-lapse video showing baby's face progression from birth to current age. Output: 15-60 second MP4 with gentle music overlay (royalty-free lullaby or original composition).
3. **Milestone Overlay**: Option to overlay milestone badges on the video at appropriate timestamps (first smile, first roll, first steps).
4. **Growth Chart Animation**: Animate the WHO growth chart being drawn as the video plays — showing percentile trajectory in real-time.
5. **Share Options**: Save to camera roll, share via iOS/Android share sheet, AirDrop to family. Generate a QR code linking to a private shared album (no server needed — uses local file + AirDrop).
6. **Annual Montage**: Auto-suggest at 6mo, 12mo, 18mo, 2yr — "Create baby's [X] month montage!"
7. **Comparison Mode**: Side-by-side montage showing baby vs. older sibling or parent at same age (optional family comparison feature).

### Data Model
- @jobble/montage_projects: { id, created_at, photo_uris[], milestone_overlay_enabled, music_track, output_uri, status }
- @jobble/montage_settings: { default_duration_sec, music_track_preference, milestone_badge_style }

### Integration
- Links to growth.tsx (percentile chart data for animated growth chart overlay)
- Links to milestones.tsx (milestone badges to overlay)
- Links to profile.tsx (baby info header for personalization)
- Uses expo-image-picker for photo selection
- Uses expo-video (or ffmpeg via expo-camera/ffmpeg) for video generation
- Uses expo-av for music overlay

### Badge
- "Memory Keeper": Created and shared 3 growth montages
- "Growth Storyteller": Created a 12+ month growth montage spanning more than 1 year

### Design
- Warm, nostalgic aesthetic — soft gradients, gentle animations
- Progress indicator during video generation (with "making something beautiful..." message)
- No alarming language — calm, joyful tone
- Privacy-first: all processing on-device, no uploads

### Keywords
growth_montage,time_lapse_video,baby_photo_series,milestone_overlay,growth_chart_animation,shareable_memory,royalty_free_music,ffmpeg_video_generation,face_detection_on_device,percentile_trajectory_visual,annual_milestone_montage,family_comparison_mode,airdrop_sharing,no_server_video_generation,parental_photo_organization,growth_storytelling,viral_baby_content,photo_time_machine
"""

c = sqlite3.connect(DB)
cur = c.cursor()
cur.execute("""INSERT INTO concepts(title, description, keywords, status, created_at) VALUES (?, ?, ?, ?, ?)""",
    ("Growth Montage Generator",
     concept_desc,
     "growth_montage,time_lapse_video,baby_photo_series,milestone_overlay,growth_chart_animation,shareable_memory,royalty_free_music,ffmpeg_video_generation,face_detection_on_device,percentile_trajectory_visual",
     "draft",
     now))
concept_id = cur.lastrowid

# Create todo for this concept
cur.execute("""INSERT INTO todos(title, description, status, priority, from_idea_id) VALUES (?, ?, ?, ?, ?)""",
    ("Implement Growth Montage Generator tab",
     f"Concept #{concept_id}: Time-lapse growth video from baby photos, milestone overlay, WHO growth chart animation, shareable MP4 output. All on-device.",
     "new", 2, concept_id))
todo_id = cur.lastrowid

c.commit()
print(f"Concept #{concept_id} and Todo #{todo_id} created")
c.close()