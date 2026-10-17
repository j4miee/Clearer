import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { usePhotoLibrary } from '@/context/PhotoLibraryContext';
import { useColors } from '@/hooks/useColors';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function WeeklyRecapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dailyHistory, streakDays, bestStreak, keptIds } = usePhotoLibrary();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const progress = dailyHistory.find((entry) => entry.date === key);
    return { key, date, progress };
  });
  const cleared = days.reduce((sum, day) => sum + (day.progress?.clearedCount ?? 0), 0);
  const kept = days.reduce((sum, day) => sum + (day.progress?.keptCount ?? 0), 0);
  const freed = days.reduce((sum, day) => sum + (day.progress?.freedBytes ?? 0), 0);
  const max = Math.max(1, ...days.map((day) => day.progress?.clearedCount ?? 0));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>[WEEKLY] YOUR RECAP</Text>
          <View style={{ width: 42 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>A little more room.{ '\n' }A lot more clarity.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your last seven days, kept private on this device.</Text>

        <View style={[styles.hero, { backgroundColor: colors.foreground }]}>
          <Text style={styles.heroLabel}>SPACE RECLAIMED</Text>
          <Text style={styles.heroValue}>{freed >= 1_000_000 ? `${(freed / 1_000_000).toFixed(1)} MB` : `${Math.round(freed / 1000)} KB`}</Text>
          <Text style={styles.heroFoot}>{cleared} {cleared === 1 ? 'photo' : 'photos'} cleared this week</Text>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Daily progress</Text>
          <View style={styles.chart}>
            {days.map(({ key, date, progress }) => {
              const amount = progress?.clearedCount ?? 0;
              return (
                <View key={key} style={styles.dayColumn}>
                  <Text style={[styles.dayValue, { color: colors.mutedForeground }]}>{amount || ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${amount ? Math.max(10, (amount / max) * 100) : 3}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="KEPT" value={String(kept)} colors={colors} />
          <Stat label="CURRENT STREAK" value={`${streakDays}d`} colors={colors} />
          <Stat label="BEST STREAK" value={`${bestStreak}d`} colors={colors} />
        </View>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>{keptIds.length} photos currently marked to keep. Review and change those choices any time.</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 32, lineHeight: 37, letterSpacing: -1.2, fontFamily: 'Inter_700Bold', marginTop: 29 },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 8, marginBottom: 21 },
  hero: { borderRadius: 14, padding: 19 },
  heroLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_500Medium' },
  heroValue: { color: 'white', fontSize: 42, letterSpacing: -1.5, fontFamily: 'Inter_700Bold', marginTop: 9 },
  heroFoot: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 5 },
  chartCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 12 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  chart: { height: 154, flexDirection: 'row', gap: 10, marginTop: 14 },
  dayColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dayValue: { height: 15, fontSize: 9, fontFamily: 'Inter_500Medium' },
  barTrack: { width: '100%', height: 110, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(14,19,20,0.07)', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  dayLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 7 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 10, padding: 10, justifyContent: 'space-between' },
  statLabel: { fontSize: 7, letterSpacing: 0.5, fontFamily: 'Inter_500Medium' },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  note: { fontSize: 10, lineHeight: 16, marginTop: 14, fontFamily: 'Inter_400Regular' },
});
