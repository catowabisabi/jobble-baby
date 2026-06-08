#!/usr/bin/env python3
import sqlite3
from datetime import datetime

DB = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/progress.db'
now = datetime.utcnow().isoformat()

concept_text = """## Concept: Village Network — Peer Parenting Support Matcher

### Spark
From keywords: community_support_matching + network_effect_baby + peer_mentoring + collective_wisdom + social_isolation_reduction

### Problem
New parents often feel isolated — friends without kids don't understand, other parents are hard to find in the same stage, and formal support groups feel institutional. There's no easy way to find 2-3 other parents at the exact same baby age/stage who share your values (attachment, sleep philosophy, feeding method) and could form a casual support pod. Existing apps try to build large communities, but small pods of 3-5 trusted peers are more effective for emotional support.

### UX Flow
1. **Support Pod Matcher**: Input: baby age (weeks/months), primary feeding method, sleep philosophy, parenting style (gentle/traditional), location (city). Algorithm matches with 2-4 other parents at the same stage with >=70% value alignment.
2. **Pod Dashboard**: See your matched pod members (first name + avatar + baby age + current challenge). Anonymous mode available (show challenge but not identity).
3. **Weekly Check-in Pulse**: Each member rates: Energy (1-5), Sleep (1-5), Mood (1-5). Aggregate shows as a simple 3-line sparkline. No judgment — just visibility.
4. **Challenge Swap**: Post a challenge ("baby won't take bottle", "4-month regression at week 3") — pod can respond with what's worked for them. Responses only visible to pod.
5. **Meetup Scheduler**: Optional in-person meetups. Sync calendar with suggested times. Location-based (neighborhood coffee shop).
6. **Village Wisdom Feed**: Aggregated anonymous tips from all matched pods — best tip rises to top each week. No identifying info.
7. **Crisis Mode**: If a parent rates Energy=1 for 3+ consecutive days, prompt: "Reach out to your pod?" + resources. Non-intrusive, opt-in only.
8. **Pod Health Score**: Based on response rate, check-in consistency, and mutual support signals. Encourages healthy pod dynamics.

### Data Model
- @jobble/pod_profile: { baby_age_weeks, feeding_method, sleep_philosophy, parenting_style, city, values[] }
- @jobble/pod_members: [{ member_id, name, avatar_uri, baby_age, challenge }]
- @jobble/pulse_log: { date, energy, sleep, mood }
- @jobble/challenge_posts: { id, post_date, challenge_text, response_count }
- @jobble/pod_health: { week, response_rate, checkin_streak }

### Integration
- Links to habit-reset tab (parent self-care)
- Links to sleep-training tab (sleep philosophy alignment)
- Links to bonding-journal tab (attachment values)
- Links to growth tab (baby age stage)
- Reuses: profile.tsx baby info header, i18n keys, AsyncStorage patterns

### Badge
- Village Founder: Created a pod that lasts 4+ weeks with >=3 active members
- Pod Pal: Responded to 10+ challenge posts from pod members
- Pulse Keeper: Logged weekly pulse for 8 consecutive weeks

### Design
- Warm, community feel — soft oranges, warm neutrals, friendly illustrations
- Pod members shown as gentle avatars (not photos — reduce social anxiety)
- Challenge posts in simple card format, responses collapsed by default
- Pulse sparklines are subtle, no pressure aesthetic
- Privacy-first: no data leaves device except anonymized matching signals

### Keywords
community_support_matching,network_effect_baby,oxytocin_hormone,parasympathetic_state,social_isolation_reduction,peer_mentoring,collective_wisdom,village_raising_child,postnatal_network,emotional_regulation_support,maternal_burnout_recovery,pod_matcher,parenting_values_alignment,small_group_support,anonymous_tips,meetup_scheduler,pulse_checkin,crisis_mode,support_pod,parent_network
"""

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute('''INSERT INTO concepts (title, description, keywords, status, created_at)
               VALUES (?, ?, ?, ?, ?)''',
    ('Village Network — Peer Parenting Support Matcher',
     concept_text,
     'community_support_matching,network_effect_baby,oxytocin_hormone,parasympathetic_state,social_isolation_reduction,peer_mentoring,collective_wisdom,village_raising_child,postnatal_network,emotional_regulation_support',
     'pending',
     now))
conn.commit()
cid = cur.lastrowid
print(f'Created concept #{cid}')
conn.close()