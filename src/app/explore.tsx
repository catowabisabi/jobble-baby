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
  ActivityIndicator,
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
  salary_range: string;
  job_type: string;
  match_score: number;
  posted_date: string;
  tags: string[];
  description_snippet: string;
}

const CATEGORIES = ['All', 'engineering', 'sales', 'marketing', 'finance', 'operations', 'general'];

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAuthenticated, token } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchJobs = useCallback(async (category?: string) => {
    if (!isAuthenticated || !token) {
      setJobs([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') {
        params.append('job_type', category.toLowerCase());
      }
      params.append('limit', '50');

      const response = await fetch(`https://localhost:8000/api/v1/jobs/matches?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.warn('Failed to fetch jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs(selectedCategory);
    } else {
      setJobs([]);
    }
  }, [isAuthenticated, selectedCategory, fetchJobs]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchText.toLowerCase()) ||
      job.company.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs(selectedCategory);
    setRefreshing(false);
  }, [isAuthenticated, selectedCategory, fetchJobs]);

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
  };

  const handleJobPress = (job: Job) => {
    setSelectedJob(job);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
  };

  const formatMatchScore = (score: number) => Math.round(score * 100);

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
                formatMatchScore(item.match_score) >= 90
                  ? '#4CAF50'
                  : formatMatchScore(item.match_score) >= 75
                  ? '#2196F3'
                  : theme.textSecondary,
            },
          ]}>
          <ThemedText type="small" style={styles.matchText}>
            {formatMatchScore(item.match_score)}%
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
          <ThemedText themeColor="textSecondary">{item.salary_range}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Type</ThemedText>
          <ThemedText themeColor="textSecondary">{item.job_type}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Posted</ThemedText>
          <ThemedText themeColor="textSecondary">{item.posted_date}</ThemedText>
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
            Sign in to see job listings
          </ThemedText>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.text} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
            Loading jobs...
          </ThemedText>
        </View>
      )}

      {error && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: theme.backgroundElement },
          ]}>
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
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
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <ThemedText themeColor="textSecondary">
                No jobs found matching your criteria
              </ThemedText>
            </View>
          ) : null
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
                      {selectedJob.salary_range}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Type</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.job_type}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Match Score</ThemedText>
                    <View
                      style={[
                        styles.matchBadge,
                        {
                          backgroundColor:
                            formatMatchScore(selectedJob.match_score) >= 90
                              ? '#4CAF50'
                              : formatMatchScore(selectedJob.match_score) >= 75
                              ? '#2196F3'
                              : theme.textSecondary,
                        },
                      ]}>
                      <ThemedText type="small" style={styles.matchText}>
                        {formatMatchScore(selectedJob.match_score)}%
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Posted</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {selectedJob.posted_date}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText type="subtitle">Description</ThemedText>
                  <ThemedText style={styles.descriptionText}>
                    {selectedJob.description_snippet}
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText type="subtitle">Skills/Tags</ThemedText>
                  <View style={styles.tagsContainer}>
                    {selectedJob.tags.map((tag, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
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
    flexDirection: 'row',
    gap: Spacing.two,
  },
  loadingText: {
    marginLeft: Spacing.two,
  },
  errorContainer: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff5252',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
});