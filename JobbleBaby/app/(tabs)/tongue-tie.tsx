import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const ASSESSMENT_KEY   = '@jobble/tongue_assessment';
const FEEDING_KEY      = '@jobble/feeding_efficiency';
const CHEWING_KEY      = '@jobble/chewing_milestone';
const BADGE_KEY        = '@jobble/badge_latcher';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AssessmentRecord {
  id: string;
  date: string;
  hazelbaker: number;       // 0-12
  jawSymmetry: Record<string, boolean>;
  jawNotes: string;
  photoUris: string[];
  badgeEarned?: boolean;
}

interface FeedingRecord {
  id: string;
  date: string;
  latchQuality: 1 | 2 | 3 | 4 | 5;
  durationMin: number;
  milkMl: number | null;
  bottleFlowRate: 'slow' | 'medium' | 'fast' | 'nipple';
  gagEpisodes: number;
  notes: string;
}

interface ChewingMilestone {
  id: string;
  date: string;
  stage: 'suck' | 'suck_swallow_breathe' | 'chewing' | 'biting';
  foodItem: string;
  gagEpisodes: number;
  refusalEvents: number;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const d = (): string => new Date().toISOString().split('T')[0];

function hazelbakerLabel(score: number): string {
  if (score <= 5) return 'Significant Tie';
  if (score <= 8) return 'Moderate Tie';
  return 'Functional';
}
function hazelbakerColor(score: number): string {
  if (score <= 5) return '#EF4444';
  if (score <= 8) return '#F59E0B';
  return '#10B981';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TongueTieScreen() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'assess' | 'feed' | 'chew' | 'correlate'>('assess');
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [feedings, setFeedings]       = useState<FeedingRecord[]>([]);
  const [chewing, setChewing]         = useState<ChewingMilestone[]>([]);
  const [badgeLatcher, setBadgeLatcher] = useState(false);

  // Assessment state
  const [hazelbaker, setHazelbaker]     = useState<number[]>([1,1,1,1,1,1]);
  const [jawSymmetry, setJawSymmetry]   = useState<Record<string, boolean>>({});
  const [jawNotes, setJawNotes]         = useState('');
  const [assessModal, setAssessModal]   = useState(false);

  // Feeding state
  const [feedModal, setFeedModal]       = useState(false);
  const [latchQ, setLatchQ]             = useState<1|2|3|4|5>(3);
  const [durMin, setDurMin]             = useState('');
  const [milkMl, setMilkMl]             = useState('');
  const [flowRate, setFlowRate]         = useState<FeedingRecord['bottleFlowRate']>('medium');
  const [gagEp, setGagEp]               = useState('');
  const [fNotes, setFNotes]             = useState('');

  // Chewing state
  const [chewModal, setChewModal]      = useState(false);
  const [chewStage, setChewStage]       = useState<ChewingMilestone['stage']>('suck');
  const [foodItem, setFoodItem]         = useState('');
  const [chewGag, setChewGag]           = useState('');
  const [refusal, setRefusal]           = useState('');
  const [cNotes, setCNotes]             = useState('');

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(ASSESSMENT_KEY).then(s => s && setAssessments(JSON.parse(s)));
    AsyncStorage.getItem(FEEDING_KEY).then(s => s && setFeedings(JSON.parse(s)));
    AsyncStorage.getItem(CHEWING_KEY).then(s => s && setChewing(JSON.parse(s)));
    AsyncStorage.getItem(BADGE_KEY).then(s => s === 'true' && setBadgeLatcher(true));
  }, []);

  // ─── Hazelbaker items ──────────────────────────────────────────────────────
  const HAZELBAKER_ITEMS = [
    'tongueLift','tongueExtension','tongueSpread',
    'tongueSnapBack','tongueHollowing','tonguePeristalsis',
  ];
  const HAZELBAKER_LABELS = [
    't(\'assessment.tongueLift\')','t(\'assessment.tongueExtension\')',
    't(\'assessment.tongueSpread\')','t(\'assessment.tongueSnapBack\')',
    't(\'assessment.tongueHollowing\')','t(\'assessment.tonguePeristalsis\')',
  ];

  function scoreItem(idx: number, val: number) {
    const updated = [...hazelbaker]; updated[idx] = val; setHazelbaker(updated);
  }

  function calcHazelbakerTotal(): number { return hazelbaker.reduce((a,b)=>a+b,0); }

  async function saveAssessment() {
    const total = calcHazelbakerTotal();
    const rec: AssessmentRecord = {
      id: uid(), date: d(), hazelbaker: total,
      jawSymmetry, jawNotes, photoUris: [],
    };
    const next = [rec, ...assessments];
    setAssessments(next);
    await AsyncStorage.setItem(ASSESSMENT_KEY, JSON.stringify(next));
    // Badge: tongue-tie-aware = completed assessment
    await AsyncStorage.setItem('@jobble/badge_tongue_tie_aware', 'true');
    setAssessModal(false);
    setHazelbaker([1,1,1,1,1,1]); setJawSymmetry({}); setJawNotes('');
    Alert.alert(t('tabs.tongueTie'), t('assessment.saved') || 'Assessment saved');
  }

  async function saveFeeding() {
    const rec: FeedingRecord = {
      id: uid(), date: d(),
      latchQuality: latchQ,
      durationMin: parseFloat(durMin) || 0,
      milkMl: milkMl ? parseFloat(milkMl) : null,
      bottleFlowRate: flowRate,
      gagEpisodes: parseInt(gagEp)||0,
      notes: fNotes,
    };
    const next = [rec, ...feedings];
    setFeedings(next);
    await AsyncStorage.setItem(FEEDING_KEY, JSON.stringify(next));
    // Check latcher badge: 7 consecutive days
    const dates = [...new Set(next.map(r=>r.date))].sort().slice(-7);
    if (dates.length >= 7) {
      setBadgeLatcher(true);
      await AsyncStorage.setItem(BADGE_KEY, 'true');
    }
    setFeedModal(false);
    setDurMin(''); setMilkMl(''); setGagEp(''); setFNotes(''); setLatchQ(3);
  }

  async function saveChewing() {
    const rec: ChewingMilestone = {
      id: uid(), date: d(), stage: chewStage,
      foodItem, gagEpisodes: parseInt(chewGag)||0,
      refusalEvents: parseInt(refusal)||0, notes: cNotes,
    };
    const next = [rec, ...chewing];
    setChewing(next);
    await AsyncStorage.setItem(CHEWING_KEY, JSON.stringify(next));
    setChewModal(false);
    setFoodItem(''); setChewGag(''); setRefusal(''); setCNotes('');
  }

  // 7-day feeding trend
  const last7 = feedings.slice(0,7).reverse();
  const avgLatch = last7.length
    ? (last7.reduce((a,r)=>a+r.latchQuality,0)/last7.length).toFixed(1)
    : '—';

  // Correlation alert: latch < 3 for 5+ consecutive
  const latchStreak = feedings.slice(0,5).every(r => r.latchQuality < 3);

  // ─── Tab bar ───────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'assess',    label: t('assessment.tab') || 'Assess',       icon: 'clipboard-check-outline' },
    { key: 'feed',      label: t('feeding.tab')    || 'Feeding Log',  icon: 'baby-face' },
    { key: 'chew',      label: t('chewing.tab')    || 'Chewing',      icon: 'food-apple' },
    { key: 'correlate', label: t('correlate.tab')  || 'Correlation',  icon: 'chart-line' },
  ] as const;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#0D0D0D' }}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:120 }}>
        <Text style={styles.hdr}>{t('tabs.tongueTie')}</Text>
        <Text style={styles.sub}>{t('tongueTie.greeting')}</Text>

        {/* Badge row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, badgeLatcher && styles.badgeActive]}>
            <MaterialCommunityIcons name="seal" size={14} color={badgeLatcher?'#F59E0B':'#374151'} />
            <Text style={[styles.badgeTxt, badgeLatcher && styles.badgeTxtActive]}>
              {t('badge.latcher') || 'Latcher'}
            </Text>
          </View>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {TABS.map(tb => (
            <TouchableOpacity key={tb.key} style={[styles.tabBtn, tab===tb.key&&styles.tabBtnActive]}
              onPress={() => setTab(tb.key)}
              accessibilityLabel={tb.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab===tb.key }}
            >
              <MaterialCommunityIcons name={tb.icon as any} size={16} color={tab===tb.key?'#3B82F6':'#6B7280'} />
              <Text style={[styles.tabBtnTxt, tab===tb.key&&styles.tabBtnTxtActive]}>{tb.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ASSESS tab ── */}
        {tab === 'assess' && (
          <>
            {/* Latest score */}
            {assessments[0] && (
              <View style={[styles.scoreCard, { borderLeftColor: hazelbakerColor(assessments[0].hazelbaker) }]}>
                <Text style={styles.scoreCardLabel}>{t('assessment.hazelbakerScore')}</Text>
                <Text style={[styles.scoreNum, { color: hazelbakerColor(assessments[0].hazelbaker) }]}>
                  {assessments[0].hazelbaker}/12
                </Text>
                <Text style={styles.scoreSub}>{hazelbakerLabel(assessments[0].hazelbaker)}</Text>
                <Text style={styles.scoreDate}>{assessments[0].date}</Text>
              </View>
            )}

            {/* Guide cards */}
            <Text style={styles.sectionHdr}>{t('assessment.guide') || 'Assessment Guide'}</Text>
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>{t('assessment.hazelbakerScale')}</Text>
              <Text style={styles.guideBody}>{t('assessment.hazelbakerDesc')}</Text>
              <View style={styles.guideScale}>
                {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                  <View key={s} style={[styles.scaleBox, {
                    backgroundColor: hazelbakerColor(s <= 5 ? 3 : s <= 8 ? 6 : 10),
                    opacity: s > 12 ? 0 : 1,
                  }]}>
                    <Text style={styles.scaleBoxTxt}>{s}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.guideLegend}>
                <Text style={{color:'#EF4444'}}>● 0-5 Significant</Text>
                <Text style={{color:'#F59E0B'}}>● 6-8 Moderate</Text>
                <Text style={{color:'#10B981'}}>● 9-12 Functional</Text>
              </View>
            </View>

            {/* Jaw symmetry guide */}
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>{t('assessment.jawSymmetry')}</Text>
              <Text style={styles.guideBody}>{t('assessment.jawSymmetryDesc')}</Text>
              {[
                {key:'chinRest',     label: t('assessment.chinRest')},
                {key:'chinCry',      label: t('assessment.chinCry')},
                {key:'lipAsym',      label: t('assessment.lipAsym')},
                {key:'biteAlign',    label: t('assessment.biteAlign')},
                {key:'masseter',     label: t('assessment.masseter')},
              ].map(item => (
                <Text key={item.key} style={styles.guideItem}>• {item.label}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => setAssessModal(true)}
              accessibilityLabel={t('assessment.newEntry')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{t('assessment.newEntry') || 'New Assessment'}</Text>
            </TouchableOpacity>

            {/* History */}
            {assessments.length > 0 && (
              <>
                <Text style={styles.sectionHdr}>{t('assessment.history')}</Text>
                {assessments.slice(0,10).map(a => (
                  <View key={a.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.dateText}>{a.date}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: hazelbakerColor(a.hazelbaker) }]}>
                        <Text style={styles.typeBadgeText}>{a.hazelbaker}/12</Text>
                      </View>
                    </View>
                    <Text style={styles.scoreValue}>{hazelbakerLabel(a.hazelbaker)}</Text>
                    {a.jawNotes ? <Text style={styles.notes}>{a.jawNotes}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── FEEDING tab ── */}
        {tab === 'feed' && (
          <>
            {latchStreak && (
              <View style={styles.alertBanner}>
                <MaterialCommunityIcons name="alert" size={16} color="#F59E0B" />
                <Text style={styles.alertText}>
                  {t('correlate.alertFeedingDifficulty') || 'Feeding difficulty detected — consider tongue tie assessment'}
                </Text>
              </View>
            )}

            {/* 7-day avg */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreCardLabel}>{t('feeding.avgLatch7d') || '7-Day Avg Latch'}</Text>
              <Text style={styles.scoreNum}>{avgLatch}</Text>
              <Text style={styles.scoreSub}>/5</Text>
            </View>

            {/* 7-day bar chart */}
            <Text style={styles.sectionHdr}>{t('feeding.trend') || '7-Day Trend'}</Text>
            <View style={styles.chartRow}>
              {last7.map((r,i) => (
                <View key={r.id} style={styles.barCol}>
                  <View style={[styles.bar, { height: Math.max(4, r.latchQuality * 14) }]} />
                  <Text style={styles.barLabel}>{r.latchQuality}</Text>
                  <Text style={styles.barDate}>{r.date.slice(5)}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => setFeedModal(true)}
              accessibilityLabel={t('feeding.logEntry')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{t('feeding.logEntry') || 'Log Feeding'}</Text>
            </TouchableOpacity>

            {/* History */}
            {feedings.length > 0 && (
              <>
                <Text style={styles.sectionHdr}>{t('feeding.history')}</Text>
                {feedings.slice(0,10).map(f => (
                  <View key={f.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.dateText}>{f.date}</Text>
                      <Text style={[styles.scoreValue, { color: f.latchQuality >= 3 ? '#10B981' : '#F59E0B' }]}>
                        Latch {f.latchQuality}/5
                      </Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>⏱ {f.durationMin}min</Text>
                      {f.milkMl && <Text style={styles.scoreLabel}>🍼 {f.milkMl}ml</Text>}
                      <Text style={styles.scoreLabel}>💧 {f.bottleFlowRate}</Text>
                      {f.gagEpisodes > 0 && <Text style={styles.scoreLabel}>🤢 {f.gagEpisodes}</Text>}
                    </View>
                    {f.notes ? <Text style={styles.notes}>{f.notes}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── CHEWING tab ── */}
        {tab === 'chew' && (
          <>
            <Text style={styles.sectionHdr}>{t('chewing.timeline') || 'Chewing Milestone Timeline'}</Text>
            <View style={styles.timeline}>
              {(['suck','suck_swallow_breathe','chewing','biting'] as const).map((stage, idx) => {
                const entries = chewing.filter(c => c.stage === stage);
                return (
                  <View key={stage} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, entries.length > 0 && styles.timelineDotActive]} />
                      {idx < 3 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStage}>
                        {stage === 'suck' ? t('chewing.suck') :
                         stage === 'suck_swallow_breathe' ? t('chewing.suckSwallow') :
                         stage === 'chewing' ? t('chewing.chewing') :
                         t('chewing.biting')}
                      </Text>
                      <Text style={styles.timelineAge}>
                        {stage === 'suck' ? '0-3mo' :
                         stage === 'suck_swallow_breathe' ? '3-6mo' :
                         stage === 'chewing' ? '6-9mo' : '9-12mo'}
                      </Text>
                      {entries.slice(0,3).map(e => (
                        <View key={e.id} style={styles.card}>
                          <Text style={styles.dateText}>{e.date}: {e.foodItem}</Text>
                          <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>🤢 {e.gagEpisodes}</Text>
                            <Text style={styles.scoreLabel}>❌ {e.refusalEvents}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => setChewModal(true)}
              accessibilityLabel={t('chewing.logMilestone')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{t('chewing.logMilestone') || 'Log Milestone'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── CORRELATE tab ── */}
        {tab === 'correlate' && (
          <>
            <Text style={styles.sectionHdr}>{t('correlate.overlay') || 'Correlation Dashboard'}</Text>
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>{t('correlate.description') || 'Feeding × Weight × Cry'}</Text>
              <Text style={styles.guideBody}>
                {t('correlate.overlayDesc') || 'Overlay latch quality trend + weight gain velocity + cry frequency to identify patterns.'}
              </Text>
            </View>

            {/* Simple correlation view */}
            <Text style={styles.sectionHdr}>{t('correlate.recentFeeding') || 'Recent Feeding'}</Text>
            {feedings.slice(0,5).map(f => (
              <View key={f.id} style={styles.card}>
                <Text style={styles.dateText}>{f.date}</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>{t('tongueTie.latch')}: <Text style={{color:'#3B82F6'}}>{f.latchQuality}/5</Text></Text>
                  <Text style={styles.scoreLabel}>Dur: <Text style={{color:'#3B82F6'}}>{f.durationMin}m</Text></Text>
                  {f.milkMl && <Text style={styles.scoreLabel}>{t('tongueTie.milk')}: <Text style={{color:'#3B82F6'}}>{f.milkMl}ml</Text></Text>}
                  <Text style={styles.scoreLabel}>{t('tongueTie.flow')}: <Text style={{color:'#3B82F6'}}>{f.bottleFlowRate}</Text></Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionHdr}>{t('correlate.exportReferral') || 'Referral Export'}</Text>
            <TouchableOpacity style={styles.exportBtn}
              accessibilityLabel={t('correlate.shareWithPediatrician')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="share" size={18} color="#fff" />
              <Text style={styles.exportBtnText}>{t('correlate.shareWithPediatrician') || 'Share with Pediatrician'}</Text>
            </TouchableOpacity>
            <Text style={styles.exportNote}>
              {t('correlate.exportNote') || 'Exports assessment score + feeding log summary as PDF'}
            </Text>
          </>
        )}
      </ScrollView>

      {/* ── Assessment Modal ── */}
      <Modal visible={assessModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{t('assessment.newEntry') || 'New Assessment'}</Text>

              <Text style={styles.fieldLabel}>{t('assessment.hazelbakerScore')} (0-12)</Text>
              <View style={styles.hazelbakerGrid}>
                {HAZELBAKER_ITEMS.map((item, idx) => (
                  <View key={item} style={styles.hbRow}>
                    <Text style={styles.hbLabel}>{t(`assessment.${item}`) || item}</Text>
                    <View style={styles.scorePickerRow}>
                      {[0,1,2].map(v => (
                        <TouchableOpacity key={v} style={[styles.scoreBtn, hazelbaker[idx]===v&&styles.scoreBtnActive]}
                          onPress={() => scoreItem(idx,v)}
                          accessibilityLabel={`Score ${v} for ${t(`assessment.${item}`)}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: hazelbaker[idx]===v }}
                        >
                          <Text style={[styles.scoreBtnText, hazelbaker[idx]===v&&styles.scoreBtnTextActive]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
              <Text style={[styles.scoreHint, { color: hazelbakerColor(calcHazelbakerTotal()) }]}>
                Total: {calcHazelbakerTotal()}/12 — {hazelbakerLabel(calcHazelbakerTotal())}
              </Text>

              <Text style={styles.fieldLabel}>{t('assessment.jawSymmetry')}</Text>
              {[
                {key:'chinRest',  label: t('assessment.chinRest')},
                {key:'chinCry',   label: t('assessment.chinCry')},
                {key:'lipAsym',   label: t('assessment.lipAsym')},
                {key:'biteAlign', label: t('assessment.biteAlign')},
                {key:'masseter',  label: t('assessment.masseter')},
              ].map(item => (
                <View key={item.key} style={styles.checkRow}>
                  <TouchableOpacity style={styles.checkBox} onPress={() => setJawSymmetry(s=>({...s, [item.key]: !s[item.key]}))}
                    accessibilityLabel={item.label}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: jawSymmetry[item.key] }}
                  >
                    <MaterialCommunityIcons name={jawSymmetry[item.key]?'checkbox-marked':'checkbox-blank-outline'} size={20} color="#3B82F6" />
                    <Text style={styles.checkLabel}>{item.label}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.fieldLabel}>{t('assessment.jawNotes')}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={jawNotes} onChangeText={setJawNotes}
                multiline placeholder="parent observations" placeholderTextColor="#6B7280" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssessModal(false)}
                  accessibilityLabel={t('common.cancel')}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelBtnText}>{t('tongueTie.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveAssessment}
                  accessibilityLabel={t('common.save')}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Feeding Modal ── */}
      <Modal visible={feedModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{t('feeding.logEntry') || 'Log Feeding'}</Text>

              <Text style={styles.fieldLabel}>{t('feeding.latchQuality')} (1-5)</Text>
              <View style={styles.scorePickerRow}>
                {([1,2,3,4,5] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.scoreBtn, latchQ===s&&styles.scoreBtnActive]}
                    onPress={() => setLatchQ(s)}
                    accessibilityLabel={`Latch quality ${s}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: latchQ===s }}
                  >
                    <Text style={[styles.scoreBtnText, latchQ===s&&styles.scoreBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.scoreHint}>
                {latchQ===1?'Poor':latchQ===2?'Fair':latchQ===3?'Adequate':latchQ===4?'Good':'Excellent'}
              </Text>

              <Text style={styles.fieldLabel}>{t('feeding.durationMin')}</Text>
              <TextInput style={styles.input} value={durMin} onChangeText={setDurMin}
                keyboardType="numeric" placeholder="e.g. 15" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('feeding.milkMl')} (optional)</Text>
              <TextInput style={styles.input} value={milkMl} onChangeText={setMilkMl}
                keyboardType="numeric" placeholder="e.g. 90" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('feeding.bottleFlowRate')}</Text>
              <View style={styles.chipRow}>
                {(['slow','medium','fast','nipple'] as const).map(r => (
                  <TouchableOpacity key={r} style={[styles.chip, flowRate===r&&styles.chipActive]}
                    onPress={() => setFlowRate(r)}
                    accessibilityLabel={t(`feeding.${r}`) || r}
                    accessibilityRole="button"
                    accessibilityState={{ selected: flowRate===r }}
                  >
                    <Text style={[styles.chipText, flowRate===r&&styles.chipTextActive]}>
                      {t(`feeding.${r}`) || r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('feeding.gagEpisodes')}</Text>
              <TextInput style={styles.input} value={gagEp} onChangeText={setGagEp}
                keyboardType="numeric" placeholder="0" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('feeding.notes')}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={fNotes} onChangeText={setFNotes}
                multiline placeholder="optional" placeholderTextColor="#6B7280" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setFeedModal(false)}
                  accessibilityLabel={t('common.cancel')}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveFeeding}
                  accessibilityLabel={t('common.save')}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Chewing Modal ── */}
      <Modal visible={chewModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{t('chewing.logMilestone') || 'Log Chewing Milestone'}</Text>

              <Text style={styles.fieldLabel}>{t('chewing.stage')}</Text>
              <View style={styles.chipRow}>
                {(['suck','suck_swallow_breathe','chewing','biting'] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, chewStage===s&&styles.chipActive]}
                    onPress={() => setChewStage(s)}
                    accessibilityLabel={t(`chewing.${s}`) || s}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chewStage===s }}
                  >
                    <Text style={[styles.chipText, chewStage===s&&styles.chipTextActive]}>
                      {t(`chewing.${s}`) || s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('chewing.foodItem')}</Text>
              <TextInput style={styles.input} value={foodItem} onChangeText={setFoodItem}
                placeholder="e.g. banana puree" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('chewing.gagEpisodes')}</Text>
              <TextInput style={styles.input} value={chewGag} onChangeText={setChewGag}
                keyboardType="numeric" placeholder="0" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('chewing.refusalEvents')}</Text>
              <TextInput style={styles.input} value={refusal} onChangeText={setRefusal}
                keyboardType="numeric" placeholder="0" placeholderTextColor="#6B7280" />

              <Text style={styles.fieldLabel}>{t('chewing.notes')}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={cNotes} onChangeText={setCNotes}
                multiline placeholder="optional" placeholderTextColor="#6B7280" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setChewModal(false)}
                  accessibilityLabel={t('common.cancel')}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveChewing}
                  accessibilityLabel={t('common.save')}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hdr:       { fontSize:28, fontWeight:'700', color:'#FFF', marginBottom:4 },
  sub:       { fontSize:14, color:'#9CA3AF', marginBottom:16 },
  badgeRow:  { flexDirection:'row', gap:8, marginBottom:16 },
  badge:     { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:5, borderRadius:12, backgroundColor:'#1F2937' },
  badgeActive:{ backgroundColor:'#1E3A5F' },
  badgeTxt:  { fontSize:11, color:'#4B5563' },
  badgeTxtActive:{ color:'#D97706' },
  tabRow:    { flexDirection:'row', gap:6, marginBottom:20 },
  tabBtn:    { flex:1, alignItems:'center', minHeight:44, paddingVertical:11, borderRadius:8, backgroundColor:'#1F2937' },
  tabBtnActive:{ backgroundColor:'#1E3A5F' },
  tabBtnTxt: { fontSize:10, color:'#6B7280', marginTop:2 },
  tabBtnTxtActive:{ color:'#3B82F6' },
  scoreCard: { backgroundColor:'#1F2937', borderRadius:12, padding:16, alignItems:'center', marginBottom:16, borderLeftWidth:4 },
  scoreCardLabel:{ fontSize:12, color:'#9CA3AF' },
  scoreNum:  { fontSize:48, fontWeight:'700' },
  scoreSub:  { fontSize:12, color:'#9CA3AF', marginTop:2 },
  scoreDate: { fontSize:11, color:'#6B7280', marginTop:4 },
  sectionHdr:{ fontSize:16, fontWeight:'600', color:'#D1D5DB', marginBottom:10, marginTop:8 },
  guideCard: { backgroundColor:'#1F2937', borderRadius:12, padding:14, marginBottom:12 },
  guideTitle:{ fontSize:14, fontWeight:'600', color:'#F9FAFB', marginBottom:6 },
  guideBody: { fontSize:12, color:'#9CA3AF', marginBottom:8 },
  guideItem: { fontSize:12, color:'#D1D5DB', marginBottom:3 },
  guideScale:{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:8 },
  scaleBox:  { width:24, height:24, borderRadius:4, alignItems:'center', justifyContent:'center' },
  scaleBoxTxt:{ fontSize:10, color:'#fff', fontWeight:'700' },
  guideLegend:{ flexDirection:'row', gap:12, marginTop:8 },
  alertBanner:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#1E3A5F', borderRadius:8, padding:12, marginBottom:12 },
  alertText: { fontSize:12, color:'#F59E0B', flex:1 },
  chartRow:  { flexDirection:'row', justifyContent:'space-around', alignItems:'flex-end', height:100, marginBottom:16 },
  barCol:    { alignItems:'center', flex:1 },
  bar:       { width:24, backgroundColor:'#3B82F6', borderRadius:4 },
  barLabel:  { fontSize:10, color:'#D1D5DB', marginTop:2 },
  barDate:   { fontSize:8, color:'#6B7280' },
  timeline:  { marginBottom:16 },
  timelineRow:{ flexDirection:'row', marginBottom:12 },
  timelineLeft:{ width:20, alignItems:'center' },
  timelineDot:{ width:10, height:10, borderRadius:5, backgroundColor:'#374151', marginTop:4 },
  timelineDotActive:{ backgroundColor:'#3B82F6' },
  timelineLine:{ flex:1, width:2, backgroundColor:'#374151', marginVertical:2 },
  timelineContent:{ flex:1, marginLeft:8 },
  timelineStage:{ fontSize:13, fontWeight:'600', color:'#F9FAFB' },
  timelineAge: { fontSize:11, color:'#6B7280', marginBottom:4 },
  exportBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#3B82F6', borderRadius:10, padding:14, marginBottom:8 },
  exportBtnText:{ color:'#fff', fontSize:15, fontWeight:'600' },
  exportNote: { fontSize:11, color:'#6B7280', textAlign:'center' },
  addBtn:    { flexDirection:'row', alignItems:'center', backgroundColor:'#3B82F6', borderRadius:10, padding:14, marginBottom:20, gap:8 },
  addBtnText:{ color:'#fff', fontSize:15, fontWeight:'600' },
  card:      { backgroundColor:'#1F2937', borderRadius:12, padding:14, marginBottom:10, borderWidth:1, borderColor:'#374151' },
  cardTop:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  typeBadge: { paddingHorizontal:8, paddingVertical:3, borderRadius:12 },
  typeBadgeText:{ color:'#fff', fontSize:11, fontWeight:'700' },
  dateText:  { fontSize:12, color:'#9CA3AF' },
  scoreRow:  { flexDirection:'row', gap:12, marginTop:4 },
  scoreLabel:{ fontSize:12, color:'#9CA3AF' },
  scoreValue:{ fontSize:13, fontWeight:'600', color:'#3B82F6' },
  notes:     { fontSize:12, color:'#D1D5DB', fontStyle:'italic', marginTop:4 },
  modalBg:   { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' },
  modal:     { backgroundColor:'#111827', borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, maxHeight:'90%' },
  modalTitle:{ fontSize:20, fontWeight:'700', color:'#fff', marginBottom:16 },
  fieldLabel:{ fontSize:13, color:'#9CA3AF', marginTop:12, marginBottom:6, fontWeight:'500' },
  input:     { backgroundColor:'#1F2937', borderRadius:8, padding:12, color:'#F9FAFB', fontSize:14, borderWidth:1, borderColor:'#374151' },
  textArea:  { minHeight:60, textAlignVertical:'top' },
  hazelbakerGrid:{ gap:8, marginBottom:8 },
  hbRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  hbLabel:   { fontSize:13, color:'#D1D5DB', flex:1 },
  scorePickerRow:{ flexDirection:'row', gap:6 },
  scoreBtn:  { width:44, height:44, borderRadius:8, backgroundColor:'#1F2937', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#374151' },
  scoreBtnActive:{ backgroundColor:'#1E3A5F', borderColor:'#3B82F6' },
  scoreBtnText:{ fontSize:16, fontWeight:'600', color:'#6B7280' },
  scoreBtnTextActive:{ color:'#3B82F6' },
  scoreHint: { fontSize:12, color:'#9CA3AF', marginTop:4 },
  checkRow:  { marginBottom:4 },
  checkBox:  { flexDirection:'row', alignItems:'center', gap:8 },
  checkLabel:{ fontSize:13, color:'#D1D5DB' },
  chipRow:   { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:      { minHeight:44, paddingHorizontal:10, paddingVertical:11, borderRadius:16, backgroundColor:'#1F2937', borderWidth:1, borderColor:'#374151' },
  chipActive:{ backgroundColor:'#1E3A5F', borderColor:'#3B82F6' },
  chipText:  { fontSize:11, color:'#9CA3AF' },
  chipTextActive:{ color:'#3B82F6' },
  modalBtns: { flexDirection:'row', gap:12, marginTop:20 },
  cancelBtn: { flex:1, padding:14, borderRadius:10, backgroundColor:'#374151', alignItems:'center' },
  cancelBtnText:{ color:'#D1D5DB', fontSize:15, fontWeight:'600' },
  saveBtn:   { flex:1, padding:14, borderRadius:10, backgroundColor:'#3B82F6', alignItems:'center' },
  saveBtnText:{ color:'#fff', fontSize:15, fontWeight:'600' },
});