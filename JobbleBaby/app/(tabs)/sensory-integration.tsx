import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, Modal, TextInput, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const { width: SCREEN_W } = Dimensions.get('window');

const BIRTHDATE_KEY = STORAGE_KEYS.BABY_BIRTHDATE;
const SENSORY_ENTRIES_KEY = STORAGE_KEYS.SENSORY_ENTRIES;
const SENSORY_SCORES_KEY = STORAGE_KEYS.SENSORY_DOMAIN_SCORES;

interface Milestone {
  id: string;
  labelKey: string;
  color: string;
  minMonth: number;
  maxMonth: number;
  descriptionKey: string;
  activities: string[];
  signs: string[];
  redFlags: string[];
}

interface Domain {
  id: string;
  labelKey: string;
  icon: string;
  color: string;
  minMonth: number;
  maxMonth: number;
  descriptionKey: string;
  milestones: Milestone[];
  linkedTabs: string[];
}

const DOMAINS: Domain[] = [
  {
    id: 'tactile',
    labelKey: 'sensoryIntegration.tactile',
    icon: 'hand-back-right-outline',
    color: '#F59E0B',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.tactileDesc',
    linkedTabs: ['vestibular-assessment', 'reflex-tracker'],
    milestones: [
      {
        id: 'tactile_0_2',
        labelKey: 'sensoryIntegration.tactile02m',
        color: '#F59E0B',
        minMonth: 0,
        maxMonth: 2,
        descriptionKey: 'sensoryIntegration.tactile02mDesc',
        activities: ['Skin-to-skin contact', 'Gentle stroking', 'Warm swaddle'],
        signs: ['Calms to touch', 'Focuses on faces', 'Rooting reflex active'],
        redFlags: ['No response to touch by 2 months', 'Averse to being held'],
      },
      {
        id: 'tactile_2_4',
        labelKey: 'sensoryIntegration.tactile24m',
        color: '#F59E0B',
        minMonth: 2,
        maxMonth: 4,
        descriptionKey: 'sensoryIntegration.tactile24mDesc',
        activities: ['Texture play with safe objects', 'Massage hands and feet', 'Different fabric exploration'],
        signs: ['Reaches for objects', 'Explores textures', 'Enjoys different surfaces'],
        redFlags: ['No reaching by 4 months', 'Extreme texture aversion'],
      },
      {
        id: 'tactile_4_6',
        labelKey: 'sensoryIntegration.tactile46m',
        color: '#F59E0B',
        minMonth: 4,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.tactile46mDesc',
        activities: ['Finger foods exploration', 'Playdough/sensory bin', 'Water play'],
        signs: ['Brings objects to mouth', 'Grasps intentionally', 'Explores food textures'],
        redFlags: ['No oral exploration by 6 months', 'Gags on all textures'],
      },
      {
        id: 'tactile_6_12',
        labelKey: 'sensoryIntegration.tactile612m',
        color: '#F59E0B',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.tactile612mDesc',
        activities: ['Sand play', 'Mud/dough play', 'Texture sorting games'],
        signs: ['Pincer grasp developing', 'Explores messy play', 'Seeks different textures actively'],
        redFlags: ['No pincer grasp by 10 months', 'Cannot tolerate messy hands'],
      },
    ],
  },
  {
    id: 'vestibular',
    labelKey: 'sensoryIntegration.vestibular',
    icon: 'human-handsup',
    color: '#8B5CF6',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.vestibularDesc',
    linkedTabs: ['vestibular-assessment'],
    milestones: [
      {
        id: 'vestibular_0_3',
        labelKey: 'sensoryIntegration.vestibular03m',
        color: '#8B5CF6',
        minMonth: 0,
        maxMonth: 3,
        descriptionKey: 'sensoryIntegration.vestibular03mDesc',
        activities: ['Gentle rocking', 'Carry in different positions', 'Slow position changes'],
        signs: ['Calms with movement', 'Head lag decreasing', 'Responds to tilting'],
        redFlags: ['Severe head lag past 4 months', 'No response to movement by 3 months'],
      },
      {
        id: 'vestibular_3_6',
        labelKey: 'sensoryIntegration.vestibular36m',
        color: '#8B5CF6',
        minMonth: 3,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.vestibular36mDesc',
        activities: ['Rolling practice', 'Supported bouncing', 'Swing toys'],
        signs: ['Initiates rolling', 'Enjoys being tilted', 'Head steady when upright'],
        redFlags: ['No rolling by 5 months', 'Persistent head lag'],
      },
      {
        id: 'vestibular_6_12',
        labelKey: 'sensoryIntegration.vestibular612m',
        color: '#8B5CF6',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.vestibular612mDesc',
        activities: ['Cruising practice', 'Climbing on soft surfaces', 'Balance activities'],
        signs: ['Pulls to stand', 'Cruises along furniture', 'Adapts to uneven surfaces'],
        redFlags: ['Cannot stand with support by 10 months', 'Fear of movement past 9 months'],
      },
    ],
  },
  {
    id: 'proprioceptive',
    labelKey: 'sensoryIntegration.proprioceptive',
    icon: 'human-male-female-child',
    color: '#14B8A6',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.proprioceptiveDesc',
    linkedTabs: ['bilateral-coordination'],
    milestones: [
      {
        id: 'proprioceptive_0_3',
        labelKey: 'sensoryIntegration.proprioceptive03m',
        color: '#14B8A6',
        minMonth: 0,
        maxMonth: 3,
        descriptionKey: 'sensoryIntegration.proprioceptive03mDesc',
        activities: ['Swaddled movement', 'Gentle limb guidance', 'Supported positioning'],
        signs: ['Arms and legs move symmetrically', 'Responds to being positioned', 'Blinks to own movements'],
        redFlags: ['Asymmetric movement by 2 months', 'No spontaneous movement'],
      },
      {
        id: 'proprioceptive_3_6',
        labelKey: 'sensoryIntegration.proprioceptive36m',
        color: '#14B8A6',
        minMonth: 3,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.proprioceptive36mDesc',
        activities: ['Reaching practice', 'Kicking movements', 'Tummy time with support'],
        signs: ['Reaches intentionally', 'Kicks both legs equally', 'Brings hands to midline'],
        redFlags: ['One-sided movement preference', 'No reaching by 5 months'],
      },
      {
        id: 'proprioceptive_6_12',
        labelKey: 'sensoryIntegration.proprioceptive612m',
        color: '#14B8A6',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.proprioceptive612mDesc',
        activities: ['Push-pull toys', 'Crawling over pillows', 'Ball roll and catch'],
        signs: ['Crawls with reciprocal leg movement', 'Pulls to stand', 'Throws objects intentionally'],
        redFlags: ['No crawling by 9 months', 'Cannot release object voluntarily'],
      },
    ],
  },
  {
    id: 'visual',
    labelKey: 'sensoryIntegration.visual',
    icon: 'eye-outline',
    color: '#3B82F6',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.visualDesc',
    linkedTabs: [],
    milestones: [
      {
        id: 'visual_0_2',
        labelKey: 'sensoryIntegration.visual02m',
        color: '#3B82F6',
        minMonth: 0,
        maxMonth: 2,
        descriptionKey: 'sensoryIntegration.visual02mDesc',
        activities: ['High contrast cards', 'Black and white patterns', 'Face-to-face at 20cm'],
        signs: ['Follows objects past midline', 'Focuses on faces', 'Recognizes caregiver face'],
        redFlags: ['Cannot fixate by 1 month', 'No tracking by 2 months'],
      },
      {
        id: 'visual_2_4',
        labelKey: 'sensoryIntegration.visual24m',
        color: '#3B82F6',
        minMonth: 2,
        maxMonth: 4,
        descriptionKey: 'sensoryIntegration.visual24mDesc',
        activities: ['Colorful mobiles', 'Reaching for bright objects', 'Mirror play'],
        signs: ['Follows moving objects 180°', 'Reaches for dangling toys', 'Interested in mirrors'],
        redFlags: ['No reaching for objects by 4 months', 'Eyes not tracking together'],
      },
      {
        id: 'visual_4_8',
        labelKey: 'sensoryIntegration.visual48m',
        color: '#3B82F6',
        minMonth: 4,
        maxMonth: 8,
        descriptionKey: 'sensoryIntegration.visual48mDesc',
        activities: ['Shape sorting toys', 'Page turning books', 'Hidden object games'],
        signs: ['Depth perception developing', 'Looks for dropped objects', 'Interested in pictures'],
        redFlags: ['No depth perception by 7 months', 'Constant eye turning'],
      },
      {
        id: 'visual_8_12',
        labelKey: 'sensoryIntegration.visual812m',
        color: '#3B82F6',
        minMonth: 8,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.visual812mDesc',
        activities: ['Simple puzzles', 'Copying gestures', 'Pointing games'],
        signs: ['Points to objects of interest', 'Identifies familiar pictures', 'Watches how things work'],
        redFlags: ['No pointing by 10 months', 'Does not follow pointing'],
      },
    ],
  },
  {
    id: 'auditory',
    labelKey: 'sensoryIntegration.auditory',
    icon: 'ear-hearing',
    color: '#22C55E',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.auditoryDesc',
    linkedTabs: [],
    milestones: [
      {
        id: 'auditory_0_3',
        labelKey: 'sensoryIntegration.auditory03m',
        color: '#22C55E',
        minMonth: 0,
        maxMonth: 3,
        descriptionKey: 'sensoryIntegration.auditory03mDesc',
        activities: ['Talk and sing to baby', 'Music boxes', 'White noise for sleep'],
        signs: ['Startles to loud sounds', 'Calms to voice', 'Turns toward sound'],
        redFlags: ['No startle reflex', 'No response to voice by 2 months'],
      },
      {
        id: 'auditory_3_6',
        labelKey: 'sensoryIntegration.auditory36m',
        color: '#22C55E',
        minMonth: 3,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.auditory36mDesc',
        activities: ['Name games', 'Rhythm instruments', 'Animal sounds'],
        signs: ['Responds to own name', 'Laughs at peek-a-boo', 'Vocalizes to music'],
        redFlags: ['No response to name by 6 months', 'No babbling by 6 months'],
      },
      {
        id: 'auditory_6_12',
        labelKey: 'sensoryIntegration.auditory612m',
        color: '#22C55E',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.auditory612mDesc',
        activities: ['Point and name objects', 'Simple commands', 'Music and dance'],
        signs: ['Understands "no"', 'Turns to sounds out of sight', 'Babbles with intonation'],
        redFlags: ['No words by 12 months', 'Does not respond to sounds from behind'],
      },
    ],
  },
  {
    id: 'oral_motor',
    labelKey: 'sensoryIntegration.oralMotor',
    icon: 'baby-carriage',
    color: '#EC4899',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.oralMotorDesc',
    linkedTabs: ['feeding-readiness'],
    milestones: [
      {
        id: 'oral_motor_0_3',
        labelKey: 'sensoryIntegration.oralMotor03m',
        color: '#EC4899',
        minMonth: 0,
        maxMonth: 3,
        descriptionKey: 'sensoryIntegration.oralMotor03mDesc',
        activities: ['Breast/bottle feeding', 'Pacifier use', 'Oral massage'],
        signs: ['Strong suck reflex', 'Rooting reflex active', 'Coordinated suck-swallow-breathe'],
        redFlags: ['Poor suck by 1 month', 'Choking during feeds'],
      },
      {
        id: 'oral_motor_3_6',
        labelKey: 'sensoryIntegration.oralMotor36m',
        color: '#EC4899',
        minMonth: 3,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.oralMotor36mDesc',
        activities: ['Teething toys', 'Flavored勺子引入口腔', 'Mouthing exploration'],
        signs: ['Opens mouth for spoon', 'Chews on toys', 'Rooting diminishes'],
        redFlags: ['No oral exploration by 6 months', 'Gags on all solids'],
      },
      {
        id: 'oral_motor_6_12',
        labelKey: 'sensoryIntegration.oralMotor612m',
        color: '#EC4899',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.oralMotor612mDesc',
        activities: ['Finger foods', 'Cup drinking practice', 'Biting through soft textures'],
        signs: ['Brings food to mouth', 'Chews with up-and-down motion', 'Drinks from cup with help'],
        redFlags: ['Cannot eat solids by 9 months', 'Excessive drooling past 8 months'],
      },
    ],
  },
  {
    id: 'interoceptive',
    labelKey: 'sensoryIntegration.interoceptive',
    icon: 'heart-pulse',
    color: '#EF4444',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'sensoryIntegration.interoceptiveDesc',
    linkedTabs: ['stress-cascade'],
    milestones: [
      {
        id: 'interoceptive_0_6',
        labelKey: 'sensoryIntegration.interoceptive06m',
        color: '#EF4444',
        minMonth: 0,
        maxMonth: 6,
        descriptionKey: 'sensoryIntegration.interoceptive06mDesc',
        activities: ['Responsive caregiving', 'Naming hunger/fullness cues', 'Comfort strategies'],
        signs: ['Shows hunger/fullness cues', 'Calms with consistent routines', 'Differentiates discomfort types'],
        redFlags: ['No hunger cues by 3 months', 'Cannot be soothed'],
      },
      {
        id: 'interoceptive_6_12',
        labelKey: 'sensoryIntegration.interoceptive612m',
        color: '#EF4444',
        minMonth: 6,
        maxMonth: 12,
        descriptionKey: 'sensoryIntegration.interoceptive612mDesc',
        activities: ['Potty awareness cues', 'Naming body sensations', 'Emotion coaching'],
        signs: ['Shows awareness of wet/dirty diaper', 'Points to hurt body part', 'Shows emotions clearly'],
        redFlags: ['No awareness of bodily needs by 10 months', 'No emotional expression'],
      },
    ],
  },
];

type ObservedBehavior = 'observed' | 'partial' | 'not_yet';

interface SensoryEntry {
  id: string;
  date: string;
  milestoneId: string;
  domainId: string;
  observed: ObservedBehavior;
  notes: string;
  babyAgeMonths: number;
}

function getMonthsFromBirth(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth()) +
      (now.getDate() - birth.getDate()) / 30;
    return Math.max(0, Math.min(months, 12));
  } catch {
    return 0;
  }
}

function getMilestoneStatus(milestone: Milestone, babyAgeMonths: number): 'active' | 'imminent' | 'passed' | 'not_started' {
  if (babyAgeMonths >= milestone.maxMonth) return 'passed';
  if (babyAgeMonths >= milestone.minMonth) return 'active';
  if (milestone.minMonth - babyAgeMonths <= 0.5) return 'imminent';
  return 'not_started';
}

function getStatusColor(status: string): string {
  if (status === 'active') return '#22C55E';
  if (status === 'imminent') return '#F59E0B';
  if (status === 'passed') return '#9CA3AF';
  return '#E5E7EB';
}

function getDomainStatus(domain: Domain, babyAgeMonths: number, entries: Record<string, SensoryEntry[]>): 'active' | 'imminent' | 'passed' | 'not_started' {
  const activeMilestones = domain.milestones.filter((m) => {
    const s = getMilestoneStatus(m, babyAgeMonths);
    return s === 'active' || s === 'imminent';
  });
  if (activeMilestones.length > 0) return 'active';
  const imminentMilestones = domain.milestones.filter((m) => {
    const s = getMilestoneStatus(m, babyAgeMonths);
    return s === 'passed' && (babyAgeMonths - m.maxMonth) <= 0.5;
  });
  if (imminentMilestones.length > 0) return 'imminent';
  const passedMilestones = domain.milestones.filter((m) => getMilestoneStatus(m, babyAgeMonths) === 'passed');
  if (passedMilestones.length > 0) return 'passed';
  return 'not_started';
}

const CROSS_MODAL_CORRELATIONS = [
  { domains: ['vestibular', 'proprioceptive'], labelKey: 'sensoryIntegration.correlationVestibularProprioceptive', descriptionKey: 'sensoryIntegration.correlationVestibularProprioceptiveDesc' },
  { domains: ['tactile', 'oral_motor'], labelKey: 'sensoryIntegration.correlationTactileOral', descriptionKey: 'sensoryIntegration.correlationTactileOralDesc' },
  { domains: ['visual', 'auditory'], labelKey: 'sensoryIntegration.correlationVisualAuditory', descriptionKey: 'sensoryIntegration.correlationVisualAuditoryDesc' },
  { domains: ['proprioceptive', 'tactile'], labelKey: 'sensoryIntegration.correlationProprioceptiveTactile', descriptionKey: 'sensoryIntegration.correlationProprioceptiveTactileDesc' },
  { domains: ['vestibular', 'visual'], labelKey: 'sensoryIntegration.correlationVestibularVisual', descriptionKey: 'sensoryIntegration.correlationVestibularVisualDesc' },
];

export default function SensoryIntegrationScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const bg = C.background;
  const cardBg = C.card;
  const textPrimary = C.text;
  const textSecondary = C.muted;

  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(0);
  const [entries, setEntries] = useState<Record<string, SensoryEntry[]>>({});
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBehavior, setSelectedBehavior] = useState<ObservedBehavior>('observed');
  const [entryNotes, setEntryNotes] = useState('');
  const [viewMode, setViewMode] = useState<'domains' | 'crossmodal'>('domains');

  useEffect(() => {
    loadBirthDate();
    loadEntries();
  }, []);

  const loadBirthDate = async () => {
    try {
      const bd = await safeGetItem(BIRTHDATE_KEY);
      if (bd) {
        setBirthDate(bd);
        setBabyAgeMonths(getMonthsFromBirth(bd));
      }
    } catch {}
  };

  const loadEntries = async () => {
    try {
      const raw = await safeGetItem(SENSORY_ENTRIES_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  };

  const saveEntries = async (updated: Record<string, SensoryEntry[]>) => {
    setEntries(updated);
    try {
      await safeSetItem(SENSORY_ENTRIES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const openMilestoneDetail = (domain: Domain, milestone: Milestone) => {
    setSelectedDomain(domain);
    setSelectedMilestone(milestone);
    setSelectedBehavior('observed');
    setEntryNotes('');
    setModalVisible(true);
  };

  const logCheckIn = async () => {
    if (!selectedDomain || !selectedMilestone) return;
    const entry: SensoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      milestoneId: selectedMilestone.id,
      domainId: selectedDomain.id,
      observed: selectedBehavior,
      notes: entryNotes.trim(),
      babyAgeMonths,
    };
    const updated = { ...entries };
    if (!updated[selectedMilestone.id]) updated[selectedMilestone.id] = [];
    updated[selectedMilestone.id].push(entry);
    await saveEntries(updated);
    setModalVisible(false);
  };

  const getRedFlagAlerts = (): { domain: Domain; milestone: Milestone }[] => {
    const alerts: { domain: Domain; milestone: Milestone }[] = [];
    for (const domain of DOMAINS) {
      for (const milestone of domain.milestones) {
        const status = getMilestoneStatus(milestone, babyAgeMonths);
        if (status !== 'passed') continue;
        const milestoneEntries = entries[milestone.id] || [];
        if (milestoneEntries.length === 0 && (babyAgeMonths - milestone.maxMonth) > 2) {
          alerts.push({ domain, milestone });
        } else if (milestoneEntries.length > 0) {
          const lastEntry = milestoneEntries[milestoneEntries.length - 1];
          if (lastEntry.observed !== 'observed' && (babyAgeMonths - milestone.maxMonth) > 2) {
            alerts.push({ domain, milestone });
          }
        }
      }
    }
    return alerts;
  };

  const getProgressCoverage = (): number => {
    const totalMilestones = DOMAINS.reduce((sum, d) => sum + d.milestones.length, 0);
    const coveredMilestones = DOMAINS.reduce((sum, d) => {
      return sum + d.milestones.filter((m) => (entries[m.id] || []).length > 0).length;
    }, 0);
    return totalMilestones > 0 ? Math.round((coveredMilestones / totalMilestones) * 100) : 0;
  };

  const getAmberAlerts = (): { domain: Domain; milestone: Milestone }[] => {
    const alerts: { domain: Domain; milestone: Milestone }[] = [];
    for (const domain of DOMAINS) {
      for (const milestone of domain.milestones) {
        const status = getMilestoneStatus(milestone, babyAgeMonths);
        if (status !== 'passed') continue;
        const milestoneEntries = entries[milestone.id] || [];
        if (milestoneEntries.length === 0 && (babyAgeMonths - milestone.maxMonth) > 1 && (babyAgeMonths - milestone.maxMonth) <= 2) {
          alerts.push({ domain, milestone });
        } else if (milestoneEntries.length > 0) {
          const lastEntry = milestoneEntries[milestoneEntries.length - 1];
          if (lastEntry.observed !== 'observed' && (babyAgeMonths - milestone.maxMonth) > 1 && (babyAgeMonths - milestone.maxMonth) <= 2) {
            alerts.push({ domain, milestone });
          }
        }
      }
    }
    return alerts;
  };

  const getDomainScore = (domainId: string): number => {
    const domain = DOMAINS.find((d) => d.id === domainId);
    if (!domain) return 0;
    const covered = domain.milestones.filter((m) => (entries[m.id] || []).length > 0).length;
    return Math.round((covered / domain.milestones.length) * 100);
  };

  const alerts = getRedFlagAlerts();
  const amberAlerts = getAmberAlerts();
  const progressCoverage = getProgressCoverage();

  const behaviorOptions: { value: ObservedBehavior; labelKey: string; color: string }[] = [
    { value: 'observed', labelKey: 'sensoryIntegration.observed', color: '#22C55E' },
    { value: 'partial', labelKey: 'sensoryIntegration.partial', color: '#F59E0B' },
    { value: 'not_yet', labelKey: 'sensoryIntegration.notYet', color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t('sensoryIntegration.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          {t('sensoryIntegration.subtitle')}
        </Text>
      </View>

      <View style={styles.viewModeRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'domains' && { backgroundColor: '#3B82F6' }]}
          onPress={() => setViewMode('domains')}
        >
          <Text style={[styles.viewModeBtnText, { color: viewMode === 'domains' ? '#fff' : textSecondary }]}>
            {t('sensoryIntegration.domains')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'crossmodal' && { backgroundColor: '#3B82F6' }]}
          onPress={() => setViewMode('crossmodal')}
        >
          <Text style={[styles.viewModeBtnText, { color: viewMode === 'crossmodal' ? '#fff' : textSecondary }]}>
            {t('sensoryIntegration.crossModal')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress Dashboard */}
        <View style={[styles.dashboardCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('sensoryIntegration.progressDashboard')}
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressCircle, { borderColor: '#3B82F6' }]}>
              <Text style={[styles.progressPercent, { color: '#3B82F6' }]}>{progressCoverage}%</Text>
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: textSecondary }]}>
                {t('sensoryIntegration.coverage')}
              </Text>
              <Text style={[styles.progressSubtext, { color: textSecondary }]}>
                {DOMAINS.reduce((sum, d) => sum + d.milestones.filter((m) => (entries[m.id] || []).length > 0).length, 0)}/{DOMAINS.reduce((sum, d) => sum + d.milestones.length, 0)} {t('sensoryIntegration.milestonesLogged')}
              </Text>
            </View>
          </View>
        </View>

        {/* Red Flag Alerts */}
        {alerts.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.alertTitle}>{t('sensoryIntegration.redFlagAlert')}</Text>
            </View>
            {alerts.map((a, i) => (
              <Text key={i} style={styles.alertText}>
                {t(a.domain.labelKey)}: {t(a.milestone.labelKey)} — {t('sensoryIntegration.delayed')} {Math.round(babyAgeMonths - a.milestone.maxMonth)} {t('sensoryIntegration.months')}
              </Text>
            ))}
          </View>
        )}

        {/* Amber Warnings */}
        {amberAlerts.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert" size={20} color="#F59E0B" />
              <Text style={[styles.alertTitle, { color: '#92400E' }]}>{t('sensoryIntegration.amberWarning')}</Text>
            </View>
            {amberAlerts.map((a, i) => (
              <Text key={i} style={[styles.alertText, { color: '#92400E' }]}>
                {t(a.domain.labelKey)}: {t(a.milestone.labelKey)} — {t('sensoryIntegration.delayed')} {Math.round(babyAgeMonths - a.milestone.maxMonth)} {t('sensoryIntegration.months')}
              </Text>
            ))}
          </View>
        )}

        {viewMode === 'domains' ? (
          <>
            {/* Domain Cards */}
            {DOMAINS.map((domain) => {
              const status = getDomainStatus(domain, babyAgeMonths, entries);
              const score = getDomainScore(domain.id);
              return (
                <TouchableOpacity
                  key={domain.id}
                  style={[styles.domainCard, { backgroundColor: cardBg }]}
                  onPress={() => {
                    setSelectedDomain(domain);
                    setModalVisible(true);
                  }}
                  accessibilityLabel={t(domain.labelKey)}
                  accessibilityRole="button"
                >
                  <View style={styles.domainCardHeader}>
                    <View style={[styles.domainColorBar, { backgroundColor: domain.color }]} />
                    <View style={styles.domainCardInfo}>
                      <View style={styles.domainTitleRow}>
                        <MaterialCommunityIcons name={domain.icon as any} size={20} color={domain.color} />
                        <Text style={[styles.domainName, { color: textPrimary }]}>
                          {t(domain.labelKey)}
                        </Text>
                      </View>
                      <Text style={[styles.domainRange, { color: textSecondary }]}>
                        {domain.minMonth}-{domain.maxMonth} {t('sensoryIntegration.months')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '30' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                        {status === 'active' ? t('sensoryIntegration.active') :
                         status === 'imminent' ? t('sensoryIntegration.imminent') :
                         status === 'passed' ? t('sensoryIntegration.passed') :
                         t('sensoryIntegration.notStarted')}
                      </Text>
                    </View>
                  </View>

                  {/* Milestone checklist */}
                  <View style={styles.milestoneList}>
                    {domain.milestones.map((milestone) => {
                      const mStatus = getMilestoneStatus(milestone, babyAgeMonths);
                      const coverage = (entries[milestone.id] || []).length;
                      return (
                        <View key={milestone.id} style={styles.milestoneRow}>
                          <View style={[styles.milestoneDot, { backgroundColor: getStatusColor(mStatus) }]} />
                          <Text style={[styles.milestoneLabel, { color: textSecondary }]} numberOfLines={1}>
                            {t(milestone.labelKey)}
                          </Text>
                          <Text style={[styles.milestoneAge, { color: textSecondary }]}>
                            {milestone.minMonth}-{milestone.maxMonth}m
                          </Text>
                          {coverage > 0 && (
                            <Text style={[styles.coverageCount, { color: '#22C55E' }]}>
                              {coverage} {t('sensoryIntegration.logs')}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Score bar */}
                  <View style={styles.scoreRow}>
                    <View style={[styles.scoreBar, { backgroundColor: '#E5E7EB' }]}>
                      <View style={[styles.scoreFill, { backgroundColor: domain.color, width: `${score}%` }]} />
                    </View>
                    <Text style={[styles.scoreText, { color: textSecondary }]}>{score}%</Text>
                  </View>

                  {/* Linked tabs */}
                  {domain.linkedTabs.length > 0 && (
                    <View style={styles.linkedTabsRow}>
                      {domain.linkedTabs.map((tab) => (
                        <TouchableOpacity
                          key={tab}
                          style={styles.linkedTabChip}
                          onPress={() => {
                            // Navigate handled by tab system
                          }}
                        >
                          <Text style={[styles.linkedTabChipText, { color: domain.color }]}>
                            → {t(`tabs.${tab.replace('-', '')}`) || tab}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <>
            {/* Cross-Modal Correlation View */}
            <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16 }]}>
              {t('sensoryIntegration.crossModalCorrelations')}
            </Text>
            {CROSS_MODAL_CORRELATIONS.map((corr) => {
              const domain1 = DOMAINS.find((d) => d.id === corr.domains[0]);
              const domain2 = DOMAINS.find((d) => d.id === corr.domains[1]);
              if (!domain1 || !domain2) return null;
              const score1 = getDomainScore(domain1.id);
              const score2 = getDomainScore(domain2.id);
              const avgScore = Math.round((score1 + score2) / 2);
              return (
                <View key={corr.labelKey} style={[styles.correlationCard, { backgroundColor: cardBg }]}>
                  <View style={styles.correlationHeader}>
                    <View style={styles.correlationDomains}>
                      <View style={[styles.corrDomainPill, { backgroundColor: domain1.color + '30' }]}>
                        <MaterialCommunityIcons name={domain1.icon as any} size={14} color={domain1.color} />
                        <Text style={[styles.corrDomainText, { color: domain1.color }]}>
                          {t(domain1.labelKey)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="plus" size={14} color={textSecondary} />
                      <View style={[styles.corrDomainPill, { backgroundColor: domain2.color + '30' }]}>
                        <MaterialCommunityIcons name={domain2.icon as any} size={14} color={domain2.color} />
                        <Text style={[styles.corrDomainText, { color: domain2.color }]}>
                          {t(domain2.labelKey)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.corrScore, { color: textSecondary }]}>{avgScore}%</Text>
                  </View>
                  <Text style={[styles.corrLabel, { color: textPrimary }]}>
                    {t(corr.labelKey)}
                  </Text>
                  <Text style={[styles.corrDescription, { color: textSecondary }]}>
                    {t(corr.descriptionKey)}
                  </Text>
                  <View style={[styles.scoreBar, { backgroundColor: '#E5E7EB', marginTop: 8 }]}>
                    <View style={[styles.scoreFill, { backgroundColor: '#3B82F6', width: `${avgScore}%` }]} />
                  </View>
                </View>
              );
            })}

            {/* Sensory Diet Suggestions */}
            <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16, marginTop: 16 }]}>
              {t('sensoryIntegration.sensoryDiet')}
            </Text>
            {DOMAINS.filter((d) => {
              const s = getDomainStatus(d, babyAgeMonths, entries);
              return s === 'active' || s === 'imminent';
            }).map((domain) => (
              <View key={domain.id} style={[styles.dietCard, { backgroundColor: cardBg }]}>
                <View style={styles.dietHeader}>
                  <MaterialCommunityIcons name={domain.icon as any} size={18} color={domain.color} />
                  <Text style={[styles.dietDomainName, { color: textPrimary }]}>
                    {t(domain.labelKey)}
                  </Text>
                </View>
                {domain.milestones
                  .filter((m) => getMilestoneStatus(m, babyAgeMonths) === 'active')
                  .flatMap((m) => m.activities)
                  .slice(0, 3)
                  .map((act, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="check-circle" size={14} color="#22C55E" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{act}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Domain Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          {selectedDomain && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedDomain.color }]} />
                <View style={styles.modalHeaderContent}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {t(selectedDomain.labelKey)}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {selectedDomain.minMonth}-{selectedDomain.maxMonth} {t('sensoryIntegration.months')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  accessibilityLabel={t('common.close')}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.whatIsIt')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(selectedDomain.descriptionKey)}
                  </Text>
                </View>

                {/* Milestones in this domain */}
                <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16, marginTop: 16 }]}>
                  {t('sensoryIntegration.milestones')}
                </Text>
                {selectedDomain.milestones.map((milestone) => {
                  const status = getMilestoneStatus(milestone, babyAgeMonths);
                  const coverage = (entries[milestone.id] || []).length;
                  return (
                    <TouchableOpacity
                      key={milestone.id}
                      style={[styles.milestoneCard, { backgroundColor: cardBg }]}
                      onPress={() => openMilestoneDetail(selectedDomain, milestone)}
                    >
                      <View style={styles.milestoneCardHeader}>
                        <View style={[styles.milestoneColorBar, { backgroundColor: milestone.color }]} />
                        <View style={styles.milestoneCardInfo}>
                          <Text style={[styles.milestoneName, { color: textPrimary }]}>
                            {t(milestone.labelKey)}
                          </Text>
                          <Text style={[styles.milestoneRange, { color: textSecondary }]}>
                            {milestone.minMonth}-{milestone.maxMonth} {t('sensoryIntegration.months')}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '30' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                            {status === 'active' ? t('sensoryIntegration.active') :
                             status === 'imminent' ? t('sensoryIntegration.imminent') :
                             status === 'passed' ? t('sensoryIntegration.passed') :
                             t('sensoryIntegration.notStarted')}
                          </Text>
                        </View>
                      </View>
                      {coverage > 0 && (
                        <Text style={[styles.coverageCount, { color: textSecondary, marginLeft: 16, marginTop: 4 }]}>
                          {coverage} {t('sensoryIntegration.checkIns')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Milestone Detail Modal */}
      <Modal
        visible={!!selectedMilestone && modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSelectedMilestone(null); setModalVisible(false); }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          {selectedMilestone && selectedDomain && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedMilestone.color }]} />
                <View style={styles.modalHeaderContent}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {t(selectedMilestone.labelKey)}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {selectedMilestone.minMonth}-{selectedMilestone.maxMonth} {t('sensoryIntegration.months')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setSelectedMilestone(null); setModalVisible(false); }}
                  accessibilityLabel={t('common.close')}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.whatIsIt')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(selectedMilestone.descriptionKey)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.activitySuggestions')}
                  </Text>
                  {selectedMilestone.activities.map((act, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{act}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.signs')}
                  </Text>
                  {selectedMilestone.signs.map((sign, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="eye" size={16} color="#3B82F6" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{sign}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.redFlags')}
                  </Text>
                  {selectedMilestone.redFlags.map((flag, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{flag}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('sensoryIntegration.logCheckIn')}
                  </Text>
                  <Text style={[styles.modalLabel, { color: textSecondary }]}>
                    {t('sensoryIntegration.observedBehavior')}
                  </Text>
                  <View style={styles.behaviorRow}>
                    {behaviorOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.behaviorOption,
                          { borderColor: textSecondary },
                          selectedBehavior === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        onPress={() => setSelectedBehavior(opt.value)}
                        accessibilityLabel={t(opt.labelKey)}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.behaviorText,
                            { color: textSecondary },
                            selectedBehavior === opt.value && { color: '#fff' },
                          ]}
                        >
                          {t(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: bg, color: textPrimary, borderColor: textSecondary },
                    ]}
                    placeholder={t('sensoryIntegration.notesPlaceholder')}
                    placeholderTextColor={textSecondary}
                    value={entryNotes}
                    onChangeText={setEntryNotes}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={logCheckIn}
                    accessibilityLabel={t('sensoryIntegration.log')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.logButtonText}>{t('sensoryIntegration.log')}</Text>
                  </TouchableOpacity>

                  {(entries[selectedMilestone.id] || []).length > 0 && (
                    <View style={styles.historyList}>
                      <Text style={[styles.historyTitle, { color: textPrimary }]}>
                        {t('sensoryIntegration.history')}
                      </Text>
                      {(entries[selectedMilestone.id] || []).map((entry) => (
                        <View key={entry.id} style={styles.historyEntry}>
                          <View style={[styles.historyDot, { backgroundColor: behaviorOptions.find((o) => o.value === entry.observed)?.color || '#9CA3AF' }]} />
                          <View style={styles.historyContent}>
                            <Text style={[styles.historyDate, { color: textSecondary }]}>
                              {entry.date} · {Math.round(entry.babyAgeMonths)}mo
                            </Text>
                            <Text style={[styles.historyBehavior, { color: textPrimary }]}>
                              {t(behaviorOptions.find((o) => o.value === entry.observed)?.labelKey || '')}
                            </Text>
                            {entry.notes && (
                              <Text style={[styles.historyNotes, { color: textSecondary }]}>
                                {entry.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  viewModeRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  viewModeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#E5E7EB' },
  viewModeBtnText: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  dashboardCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  progressPercent: { fontSize: 18, fontWeight: '700' },
  progressInfo: { flex: 1 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressSubtext: { fontSize: 12, marginTop: 2 },
  alertCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 4 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  alertText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
  domainCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, overflow: 'hidden' },
  domainCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  domainColorBar: { width: 4, height: 40, borderRadius: 2, marginRight: 10 },
  domainCardInfo: { flex: 1 },
  domainTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  domainName: { fontSize: 16, fontWeight: '600' },
  domainRange: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  milestoneList: { marginTop: 8 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  milestoneDot: { width: 8, height: 8, borderRadius: 4 },
  milestoneLabel: { flex: 1, fontSize: 13 },
  milestoneAge: { fontSize: 12 },
  coverageCount: { fontSize: 11, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  scoreBar: { flex: 1, height: 6, borderRadius: 3 },
  scoreFill: { height: 6, borderRadius: 3 },
  scoreText: { fontSize: 12, fontWeight: '600' },
  linkedTabsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  linkedTabChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  linkedTabChipText: { fontSize: 11, fontWeight: '500' },
  correlationCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14 },
  correlationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  correlationDomains: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corrDomainPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  corrDomainText: { fontSize: 12, fontWeight: '600' },
  corrScore: { fontSize: 14, fontWeight: '700' },
  corrLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  corrDescription: { fontSize: 13, lineHeight: 18 },
  dietCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14 },
  dietHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dietDomainName: { fontSize: 14, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  activityText: { flex: 1, fontSize: 13, lineHeight: 18 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalColorBar: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  modalHeaderContent: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalScroll: { flex: 1, paddingHorizontal: 16 },
  modalSection: { borderRadius: 12, padding: 14, marginTop: 16 },
  modalSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalText: { fontSize: 13, lineHeight: 20 },
  modalLabel: { fontSize: 13, marginBottom: 8 },
  behaviorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  behaviorOption: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  behaviorText: { fontSize: 12, fontWeight: '600' },
  notesInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  logButton: { backgroundColor: '#3B82F6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  logButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  historyList: { marginTop: 16 },
  historyTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  historyEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  historyContent: { flex: 1 },
  historyDate: { fontSize: 12 },
  historyBehavior: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  historyNotes: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  milestoneCard: { borderRadius: 12, padding: 12, marginBottom: 8, overflow: 'hidden' },
  milestoneCardHeader: { flexDirection: 'row', alignItems: 'center' },
  milestoneColorBar: { width: 4, height: 32, borderRadius: 2, marginRight: 10 },
  milestoneCardInfo: { flex: 1 },
  milestoneName: { fontSize: 14, fontWeight: '600' },
  milestoneRange: { fontSize: 12, marginTop: 2 },
  cardArrow: { marginLeft: 4 },
});
