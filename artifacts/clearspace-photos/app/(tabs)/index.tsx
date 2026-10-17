import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePhotoLibrary } from '@/context/PhotoLibraryContext';
import { BrandBackdrop } from '@/components/BrandBackdrop';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    scannedPhotoCount,
    similarGroupCount,
    pendingRemovalIds,
    keptIds,
    freedBytes,
    clearedPhotoCount,
    xp,
    streakDays,
    bestStreak,
    dailyHistory,
  } = usePhotoLibrary();

  const weeklyDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const progress = dailyHistory.find((entry) => entry.date === date);
    return { date, label: day.toLocaleDateString(undefined, { weekday: 'narrow' }), clearedCount: progress?.clearedCount ?? 0 };
  });
  const weeklyEntries = dailyHistory.filter((entry) => weeklyDays.some((day) => day.date === entry.date));
  const weekCleared = weeklyEntries.reduce((sum, entry) => sum + entry.clearedCount, 0);
  const weekFreed = weeklyEntries.reduce((sum, entry) => sum + entry.freedBytes, 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 15, paddingBottom: Platform.OS === 'web' ? 115 : 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <View style={styles.brandGlyph} />
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>Clearspace</Text>
              <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>V2.0 / ON-DEVICE</Text>
            </View>
          </View>
          <Pressable
            testID="open-settings"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Feather name="sliders" size={17} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>[01] SPACE RECLAIMED</Text>
          <View style={styles.metricRow}>
            <Text style={[styles.headline, { color: colors.foreground }]}>
              {freedBytes >= 1_000_000 ? (freedBytes / 1_000_000).toFixed(1) : Math.round(freedBytes / 1000)}
            </Text>
            <Text style={[styles.metricUnit, { color: colors.primary }]}>{freedBytes >= 1_000_000 ? 'MB' : 'KB'}</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Keep the moments. Clear the rest. {clearedPhotoCount} {clearedPhotoCount === 1 ? 'photo' : 'photos'} cleared to date.
          </Text>
        </View>

        <Pressable
          testID="start-photo-review"
          onPress={() => router.push('/library')}
          style={({ pressed }) => [
            styles.reviewCard,
            { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.99 : 1 }] },
          ]}
        >
          <View style={styles.reviewCardTop}>
            <View style={[styles.reviewIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Feather name="copy" size={18} color={colors.primaryForeground} />
            </View>
            <Feather name="arrow-up-right" size={18} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.reviewTitle, { color: colors.primaryForeground }]}>Start swiping</Text>
          <Text style={[styles.reviewDetail, { color: 'rgba(255,255,255,0.82)' }]}>
            {scannedPhotoCount > 0
              ? `${similarGroupCount} sets found in ${scannedPhotoCount} scanned photos`
              : 'Find quick bursts and choose the version worth keeping'}
          </Text>
          <View style={styles.reviewCardBottom}>
            <Text style={[styles.reviewAction, { color: colors.primaryForeground }]}>
              {scannedPhotoCount > 0 ? 'Continue review' : 'Scan on this device'}
            </Text>
            <Feather name="arrow-right" size={15} color={colors.primaryForeground} />
          </View>
        </Pressable>

        <View style={[styles.featureHeading, { marginTop: 25 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>More ways to clear space</Text>
          <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>ON DEVICE</Text>
        </View>
        <FeatureTile
          testID="open-smart-picks"
          icon="aperture"
          eyebrow="GOOD MOMENTS, KEPT"
          title="Smart picks"
          detail="Compare similar shots, older screenshots and small images. You decide what stays."
          action="See suggestions"
          tint={colors.accent}
          iconColor={colors.accentForeground}
          colors={colors}
          onPress={() => router.push('/smart-picks')}
        />
        <FeatureTile
          testID="open-screenshot-sweep"
          icon="image"
          eyebrow="QUICK CLEANUP"
          title="Screenshot sweep"
          detail="Review screenshots in a focused grid. Keep useful ones or queue the rest for review."
          action="Review screenshots"
          tint={colors.secondary}
          iconColor={colors.secondaryForeground}
          colors={colors}
          onPress={() => router.push('/screenshots')}
        />
        <FeatureTile
          testID="open-video-review"
          icon="film"
          eyebrow="MAKE ROOM FOR NEW MEMORIES"
          title="Review videos"
          detail="Browse recent clips and mark the ones you no longer need. Nothing is deleted without your confirmation."
          action="Browse videos"
          tint={colors.accent}
          iconColor={colors.accentForeground}
          colors={colors}
          onPress={() => router.push('/videos')}
        />
        <FeatureTile
          testID="open-files-review"
          icon="folder"
          eyebrow="BEYOND YOUR CAMERA ROLL"
          title="Review files"
          detail="Sort through PDFs, tickets and other files you choose from the Files app."
          action="Choose files"
          tint={colors.secondary}
          iconColor={colors.secondaryForeground}
          colors={colors}
          onPress={() => router.push('/files')}
        />
        <FeatureTile
          testID="open-weekly-recap"
          icon="bar-chart-2"
          eyebrow="YOUR PROGRESS"
          title="Weekly recap"
          detail={`${weekCleared} photos cleared this week · ${weekFreed >= 1_000_000 ? `${(weekFreed / 1_000_000).toFixed(1)} MB` : `${Math.round(weekFreed / 1000)} KB`} reclaimed`}
          action="See your recap"
          tint={colors.accent}
          iconColor={colors.accentForeground}
          colors={colors}
          onPress={() => router.push('/weekly-recap')}
        />

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your library</Text>
          <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>LOCAL ONLY</Text>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>[02] FREED</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{freedBytes >= 1_000_000 ? `${(freedBytes / 1_000_000).toFixed(1)} MB` : `${Math.round(freedBytes / 1000)} KB`}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>[03] CLEARED</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{clearedPhotoCount}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>[04] KEPT</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{keptIds.length}</Text>
          </View>
        </View>

        <View style={[styles.levelCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.levelTop}>
            <View>
              <Text style={[styles.levelEyebrow, { color: 'rgba(255,255,255,0.58)' }]}>LEVEL {String(Math.floor(xp / 100) + 1).padStart(2, '0')}</Text>
              <Text style={[styles.levelValue, { color: colors.card }]}>{xp} <Text style={styles.xpUnit}>XP</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.levelEyebrow, { color: 'rgba(255,255,255,0.58)' }]}>STREAK</Text>
              <Text style={[styles.streakValue, { color: colors.card }]}>{streakDays} days</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(3, xp % 100)}%` }]} />
          </View>
          <Text style={[styles.progressLabel, { color: 'rgba(255,255,255,0.58)' }]}>{xp % 100}/100 XP TO NEXT LEVEL · BEST STREAK {bestStreak}</Text>
        </View>

        <View style={[styles.libraryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.libraryIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={17} color={colors.secondaryForeground} />
          </View>
          <View style={styles.libraryCopy}>
            <Text style={[styles.libraryTitle, { color: colors.foreground }]}>Nothing leaves your phone</Text>
            <Text style={[styles.libraryDetail, { color: colors.mutedForeground }]}>
              Suggestions use capture time, photo dimensions, favourites and local file size — not visual AI.
            </Text>
          </View>
          <Feather name="check" size={16} color={colors.primary} />
        </View>

        {pendingRemovalIds.length > 0 ? (
          <Pressable
            testID="open-removal-review"
            onPress={() => router.push('/library')}
            style={[styles.queueCard, { backgroundColor: `${colors.destructive}10`, borderColor: `${colors.destructive}32` }]}
          >
            <Feather name="trash-2" size={17} color={colors.destructive} />
            <View style={styles.queueCopy}>
              <Text style={[styles.queueTitle, { color: colors.foreground }]}>
                {pendingRemovalIds.length} {pendingRemovalIds.length === 1 ? 'photo' : 'photos'} in the Clearspace Bin
              </Text>
              <Text style={[styles.queueDetail, { color: colors.mutedForeground }]}>
                Not deleted yet · restore or review deletion
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        {clearedPhotoCount > 0 ? (
          <View style={[styles.clearedCard, { borderColor: colors.border }]}>
            <View style={[styles.clearedIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="archive" size={15} color={colors.secondaryForeground} />
            </View>
            <View style={styles.libraryCopy}>
              <Text style={[styles.clearedTitle, { color: colors.foreground }]}>
                {clearedPhotoCount} {clearedPhotoCount === 1 ? 'photo' : 'photos'} removed
              </Text>
              <Text style={[styles.clearedDetail, { color: colors.mutedForeground }]}>
                {freedBytes > 0 ? `About ${(freedBytes / 1_000_000).toFixed(1)} MB of local files` : 'Removed from your photo library'}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Feather name="lock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Review every choice before anything is deleted.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureTile({
  testID,
  icon,
  eyebrow,
  title,
  detail,
  action,
  tint,
  iconColor,
  colors,
  onPress,
}: {
  testID: string;
  icon: keyof typeof Feather.glyphMap;
  eyebrow: string;
  title: string;
  detail: string;
  action: string;
  tint: string;
  iconColor: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.featureCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <View>
        <View style={styles.featureTop}>
          <View style={[styles.featureIcon, { backgroundColor: tint }]}>
            <Feather name={icon} size={18} color={iconColor} />
          </View>
          <Feather name="arrow-up-right" size={18} color={colors.foreground} />
        </View>
        <Text style={[styles.featureEyebrow, { color: colors.mutedForeground }]}>{eyebrow}</Text>
        <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.featureDetail, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
      <View style={styles.featureBottom}>
        <Text style={[styles.featureAction, { color: colors.primary }]}>{action}</Text>
        <Feather name="arrow-right" size={13} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 21 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0E1314' },
  brandGlyph: { width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: '#FF5A36' },
  brandName: { fontSize: 19, letterSpacing: -0.7, fontFamily: 'Inter_700Bold' },
  brandCaption: { fontSize: 8, letterSpacing: 1.15, fontFamily: 'Inter_500Medium', marginTop: 3 },
  settingsButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { marginTop: 34, marginBottom: 24 },
  privacyText: { fontSize: 10, letterSpacing: 1.3, fontFamily: 'Inter_500Medium' },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  headline: { fontSize: 76, lineHeight: 82, letterSpacing: -4, fontFamily: 'Inter_700Bold' },
  metricUnit: { fontSize: 26, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  subtitle: { fontSize: 12, lineHeight: 19, fontFamily: 'Inter_400Regular', marginTop: 7 },
  reviewCard: { borderRadius: 14, padding: 18, minHeight: 155 },
  reviewCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewTitle: { fontSize: 24, letterSpacing: -0.7, fontFamily: 'Inter_700Bold', marginTop: 16 },
  reviewDetail: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular', marginTop: 5, maxWidth: 245 },
  reviewCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  reviewAction: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 29, marginBottom: 11 },
  sectionTitle: { fontSize: 16, letterSpacing: -0.3, fontFamily: 'Inter_600SemiBold' },
  sectionNote: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold' },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statTile: { flex: 1, minHeight: 76, borderWidth: 1, borderRadius: 10, padding: 10, justifyContent: 'space-between' },
  statLabel: { fontSize: 8, letterSpacing: 0.8, fontFamily: 'Inter_500Medium' },
  statValue: { fontSize: 15, letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  levelCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  levelTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  levelEyebrow: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_500Medium' },
  levelValue: { fontSize: 34, lineHeight: 38, fontFamily: 'Inter_700Bold', marginTop: 3 },
  xpUnit: { fontSize: 12, color: '#FF5A36' },
  streakValue: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  progressTrack: { height: 6, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.13)', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#FF5A36' },
  progressLabel: { fontSize: 8, letterSpacing: 0.5, fontFamily: 'Inter_500Medium', marginTop: 7 },
  featureHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  featureCard: { minHeight: 155, borderRadius: 15, borderWidth: 1, padding: 16, marginBottom: 11, justifyContent: 'space-between' },
  featureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureEyebrow: { fontSize: 8, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  featureTitle: { fontSize: 20, letterSpacing: -0.5, fontFamily: 'Inter_700Bold', marginTop: 3 },
  featureDetail: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 4, maxWidth: 290 },
  featureBottom: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  featureAction: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  libraryCard: { borderWidth: 1, borderRadius: 14, minHeight: 77, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  libraryIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  libraryCopy: { flex: 1 },
  libraryTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  libraryDetail: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', marginTop: 4 },
  queueCard: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 13 },
  queueCopy: { flex: 1 },
  queueTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  queueDetail: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  clearedCard: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, marginTop: 17 },
  clearedIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  clearedTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  clearedDetail: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 23 },
  footerText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
