import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  postedDate: string;
  description: string;
  requirements: string[];
  category: string;
}

const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp HK',
    location: 'Hong Kong',
    salary: 'HK$50,000 - 80,000',
    matchScore: 95,
    postedDate: '2 days ago',
    description: 'We are looking for a Senior Frontend Engineer to join our team and help build the next generation of our product.',
    requirements: ['React', 'TypeScript', '5+ years experience'],
    category: 'IT',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'FinServe Ltd',
    location: 'Central, HK',
    salary: 'HK$60,000 - 90,000',
    matchScore: 88,
    postedDate: '1 week ago',
    description: 'Lead product strategy and work with engineering teams to deliver innovative financial solutions.',
    requirements: ['5+ years PM experience', 'FinTech background', 'Mandarin'],
    category: 'Finance',
  },
  {
    id: '3',
    title: 'Marketing Specialist',
    company: 'BrandHouse',
    location: 'Wan Chai, HK',
    salary: 'HK$30,000 - 45,000',
    matchScore: 72,
    postedDate: '3 days ago',
    description: 'Execute marketing campaigns across digital channels and analyze performance metrics.',
    requirements: ['Digital marketing', 'Google Ads', 'Analytics'],
    category: 'Marketing',
  },
  {
    id: '4',
    title: 'Backend Developer',
    company: 'DataFlow Systems',
    location: 'Kwun Tong, HK',
    salary: 'HK$45,000 - 70,000',
    matchScore: 90,
    postedDate: '5 days ago',
    description: 'Build scalable backend services and APIs for our data platform.',
    requirements: ['Node.js', 'Python', 'AWS', 'PostgreSQL'],
    category: 'IT',
  },
  {
    id: '5',
    title: 'Financial Analyst',
    company: 'InvestCo',
    location: 'Admiralty, HK',
    salary: 'HK$40,000 - 65,000',
    matchScore: 78,
    postedDate: '1 day ago',
    description: 'Analyze market trends and provide investment recommendations to clients.',
    requirements: ['CFA', 'Excel', 'Bloomberg', 'Financial modeling'],
    category: 'Finance',
  },
];

const CATEGORIES = ['All', 'IT', 'Finance', 'Marketing', 'Sales', 'HR', 'Design'];

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAuthenticated, token } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  const fetchMatches = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    setIsLoadingMatches(true);
    try {
      const response = await fetch('https://localhost:8000/api/v1/jobs/matches', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobs && Array.isArray(data.jobs)) {
          setJobs([...MOCK_JOBS, ...data.jobs]);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMatches();
    }
  }, [isAuthenticated, fetchMatches]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchText.toLowerCase()) ||
      job.company.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || job.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isAuthenticated) {
      await fetchMatches();
    } else {
      setJobs(MOCK_JOBS);
    }
    setRefreshing(false);
  }, [isAuthenticated, fetchMatches]);

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
  };

  const handleJobPress = (job: Job) => {
    setSelectedJob(job);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <Pressable
      onPress={() => handleJobPress(item)}
      style={({ pressed }) => [
        styles.jobCard,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <ThemedText type="subtitle" style={styles.jobTitle}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.companyName}>{item.company}</ThemedText>
        </View>
        <View
          style={[
            styles.matchBadge,
            {
              backgroundColor:
                item.matchScore >= 90
                  ? theme.success || '#4CAF50'
                  : item.matchScore >= 75
                  ? '#2196F3'
                  : theme.textSecondary,
            },
          ]}>
          <ThemedText type="small" style={styles.matchText}>
            {item.matchScore}%
          </ThemedText>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Location</ThemedText>
          <ThemedText themeColor="textSecondary">{item.location}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Salary</ThemedText>
          <ThemedText themeColor="textSecondary">{item.salary}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Category</ThemedText>
          <ThemedText themeColor="textSecondary">{item.category}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Posted</ThemedText>
          <ThemedText themeColor="textSecondary">{item.postedDate}</ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ThemedText type="title" style={styles.headerTitle}>
        獵頭雷達
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.headerSubtitle}>
        Find your next opportunity
      </ThemedText>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.backgroundElement },
        ]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search job titles..."
          placeholderTextColor={theme.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            onPress={() => handleCategoryPress(category)}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === category
                    ? theme.text
                    : theme.backgroundElement,
              },
            ]}>
            <ThemedText
              type="small"
              style={[
                styles.categoryText,
                {
                  color:
                    selectedCategory === category
                      ? theme.background
                      : theme.text,
                },
              ]}>
              {category}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {(!isAuthenticated) && (
        <View
          style={[
            styles.authPlaceholder,
            { backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="small" style={styles.authPlaceholderText}>
            Sign in to see personalized matches
          </ThemedText>
        </View>
      )}

      {isLoadingMatches && (
        <View style={styles.loadingContainer}>
          <ThemedText type="small" themeColor="textSecondary">
            Loading your matches...
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          contentPlatformStyle,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.text}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText themeColor="textSecondary">
              No jobs found matching your criteria
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={selectedJob !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}>
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.background },
            ]}
            onStartShouldSetResponder={() => true}>
            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <ThemedText type="title">{selectedJob.title}</ThemedText>
                  <Pressable onPress={handleCloseModal} style={styles.closeButton}>
                    <ThemedText type="link">Close</ThemedText>
                  </Pressable>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText type="subtitle">{selectedJob.company}</ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Location</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.location}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Salary</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.salary}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Category</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.category}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Match Score</ThemedText>
                    <View
                      style={[
                        styles.matchBadge,
                        {
                          backgroundColor:
                            selectedJob.matchScore >= 90
                              ? '#4CAF50'
                              : selectedJob.matchScore >= 75
                              ? '#2196F3'
                              : theme.textSecondary,
                        },
                      ]}>
                      <ThemedText type="small" style={styles.matchText}>
                        {selectedJob.matchScore}%
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Posted</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.postedDate}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText type="subtitle">Description</ThemedText>
                  <ThemedText style={styles.descriptionText}>
                    {selectedJob.description}
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText type="subtitle">Requirements</ThemedText>
                  {selectedJob.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <ThemedText themeColor="textSecondary">• {req}</ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginBottom: Spacing.two,
  },
  searchContainer: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  categoryText: {
    fontSize: 14,
  },
  authPlaceholder: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  authPlaceholderText: {
    textAlign: 'center',
  },
  loadingContainer: {
    padding: Spacing.two,
    alignItems: 'center',
  },
  jobCard: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  companyName: {
    fontSize: 14,
    marginTop: Spacing.half,
  },
  matchBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  matchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  closeButton: {
    padding: Spacing.two,
  },
  modalSection: {
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  descriptionText: {
    lineHeight: 22,
  },
  requirementItem: {
    marginVertical: Spacing.half,
  },
});