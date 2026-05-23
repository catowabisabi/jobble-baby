import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface StreakShareCardProps {
  streakCount: number;
  latestScore: number;
}

export function StreakShareCard({ streakCount, latestScore }: StreakShareCardProps) {
  const getTierEmoji = (streak: number): string => {
    if (streak >= 30) return '🏆';
    if (streak >= 7) return '🌟';
    if (streak >= 3) return '🎯';
    return '💪';
  };

  const getTierLabel = (streak: number): string => {
    if (streak >= 30) return 'Gold Streaker';
    if (streak >= 7) return 'Silver Streaker';
    if (streak >= 3) return 'Bronze Streaker';
    return 'Getting Started';
  };

  const handleShare = useCallback(async () => {
    const message = `I practiced interview skills ${streakCount} days in a row! 🎯 Score: ${latestScore.toFixed(1)}\n\nJoin me on Jobble Baby - AI-powered interview practice!`;
    
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message });
      } else {
        await Share.share({ message, title: 'My Interview Practice Streak' });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [streakCount, latestScore]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievement Unlocked!</Text>
        <Text style={styles.tierEmoji}>{getTierEmoji(streakCount)}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.streakText}>
          <Text style={styles.streakNumber}>{streakCount}</Text>
          <Text style={styles.streakLabel}> day streak</Text>
        </Text>
        <Text style={styles.tierLabel}>{getTierLabel(streakCount)}</Text>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Latest Score</Text>
        <Text style={styles.scoreValue}>{latestScore.toFixed(1)}</Text>
      </View>
      
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share Achievement</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer}>
        I practiced interview skills {streakCount} days in a row! 🎯 Score: {latestScore.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tierEmoji: {
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakText: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNumber: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: 'bold',
  },
  streakLabel: {
    color: '#9ca3af',
    fontSize: 18,
    marginLeft: 4,
  },
  tierLabel: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  scoreContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  scoreValue: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});