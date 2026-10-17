import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { usePhotoLibrary } from '@/context/PhotoLibraryContext';
import { useColors } from '@/hooks/useColors';
import * as PhotoLibrary from '@/lib/photo-library';
import type { PhotoMetadata, PhotoPermission } from '@/lib/photo-library.types';

type ReviewKind = 'screenshots' | 'videos';

export function MediaReviewScreen({ kind }: { kind: ReviewKind }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingRemovalIds, keptIds, keepPhoto, markForRemoval } = usePhotoLibrary();
  const [permission, setPermission] = useState<PhotoPermission | null>(null);
  const [items, setItems] = useState<PhotoMetadata[]>([]);
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isScreenshots = kind === 'screenshots';
  const title = isScreenshots ? 'Screenshot sweep' : 'Review videos';
  const subtitle = isScreenshots
    ? 'A quick, private pass through screenshots saved in your Photos library.'
    : 'Review recent clips one at a time. Nothing leaves your camera roll until you confirm.';

  const scan = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = isScreenshots
        ? await PhotoLibrary.queryScreenshotPhotos(240)
        : await PhotoLibrary.queryVideoPage(0, 120);
      setItems(result);
      setScanned(true);
      if (result.length === 0) {
        setMessage(isScreenshots
          ? 'No screenshots were found in the photos you shared with Clearspace.'
          : 'There are no videos in the photos you shared with Clearspace.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Clearspace could not read these items. Try again.');
    } finally {
      setBusy(false);
    }
  }, [isScreenshots]);

  useEffect(() => {
    let active = true;
    PhotoLibrary.getPhotoPermission()
      .then((result) => {
        if (!active) return;
        setPermission(result);
        if (result.granted) void scan();
      })
      .catch(() => {
        if (active) setPermission(null);
      });
    return () => { active = false; };
  }, [scan]);

  const requestAccess = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await PhotoLibrary.requestPhotoAccess();
      setPermission(result);
      if (result.granted) await scan();
      else setMessage('Allow photo access in Settings to review your library.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Photo access could not be requested.');
    } finally {
      setBusy(false);
    }
  };

  const reviewed = useMemo(() => new Set([...pendingRemovalIds, ...keptIds]), [pendingRemovalIds, keptIds]);
  const remaining = items.filter((item) => !reviewed.has(item.id));
  const act = (id: string, action: 'keep' | 'review') => {
    if (action === 'keep') keepPhoto(id);
    else markForRemoval(id);
  };
  const openSettings = () => { void Linking.openSettings(); };
  const needsSettings = permission?.status === 'denied' && !permission.canAskAgain;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{isScreenshots ? 'A LITTLE LESS CLUTTER' : 'MAKE ROOM FOR NEW MEMORIES'}</Text>
          <View style={{ width: 42 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

        {permission === null ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Checking photo access…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}><Feather name="image" size={20} color={colors.secondaryForeground} /></View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Your photos stay on this device</Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Allow access so Clearspace can find {isScreenshots ? 'screenshots' : 'videos'} to review. You choose whether anything is kept or queued.</Text>
            <Pressable onPress={needsSettings ? openSettings : requestAccess} disabled={busy} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}>
              {busy ? <ActivityIndicator color="white" /> : <Feather name={needsSettings ? 'settings' : 'image'} size={15} color="white" />}
              <Text style={styles.primaryButtonText}>{needsSettings ? 'Open Settings' : 'Allow photo access'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Feather name={isScreenshots ? 'image' : 'film'} size={16} color={colors.accentForeground} /></View>
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{scanned ? `${remaining.length} to review` : 'Ready when you are'}</Text>
                <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{scanned ? 'Keep choices are saved. Review choices wait in your Clearspace Bin.' : 'We only read items you have shared with the app.'}</Text>
              </View>
              <Pressable onPress={() => void scan()} disabled={busy} accessibilityLabel="Scan again" style={[styles.refreshButton, { borderColor: colors.border }]}>
                {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={15} color={colors.foreground} />}
              </Pressable>
            </View>

            {isScreenshots ? (
              <View style={styles.grid}>
                {remaining.map((item) => (
                  <View key={item.id} style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Image source={{ uri: item.id }} style={styles.screenshotPreview} contentFit="cover" />
                    <Text numberOfLines={1} style={[styles.itemDate, { color: colors.mutedForeground }]}>{formatDate(item.creationTime)}</Text>
                    <View style={styles.itemActions}>
                      <SmallAction label="Keep" icon="heart" onPress={() => act(item.id, 'keep')} color={colors.primary} textColor="white" />
                      <SmallAction label="Review" icon="archive" onPress={() => act(item.id, 'review')} color={colors.secondary} textColor={colors.foreground} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.videoList}>
                {remaining.map((item) => (
                  <View key={item.id} style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.videoPreviewWrap}>
                      <Image source={{ uri: item.id }} style={styles.videoPreview} contentFit="cover" />
                      <View style={styles.playBadge}><Feather name="play" size={12} color="white" /></View>
                    </View>
                    <View style={styles.videoCopy}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.foreground }]}>{item.filename || 'Video'}</Text>
                      <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{formatDate(item.creationTime)}</Text>
                      <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{item.width && item.height ? `${item.width} × ${item.height}` : 'Video in your camera roll'}</Text>
                      <View style={styles.itemActions}>
                        <SmallAction label="Keep" icon="heart" onPress={() => act(item.id, 'keep')} color={colors.primary} textColor="white" />
                        <SmallAction label="Review" icon="archive" onPress={() => act(item.id, 'review')} color={colors.secondary} textColor={colors.foreground} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {scanned && remaining.length === 0 ? (
              <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}><Feather name="check" size={20} color={colors.secondaryForeground} /></View>
                <Text style={[styles.stateTitle, { color: colors.foreground }]}>You’re all caught up</Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>You can scan again any time. Your original photos and videos stay in Photos until you confirm removal.</Text>
              </View>
            ) : null}
          </>
        )}
        {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Reviewing an item never deletes it. Confirm removals from the Clearspace Bin when you’re ready.</Text>
      </ScrollView>
    </View>
  );
}

function SmallAction({ label, icon, onPress, color, textColor }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void; color: string; textColor: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.smallAction, { backgroundColor: color }]}>
      <Feather name={icon} size={12} color={textColor} />
      <Text style={[styles.smallActionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function formatDate(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 8, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -1, fontFamily: 'Inter_700Bold', marginTop: 26 },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 7, marginBottom: 18 },
  summary: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  summaryText: { fontSize: 9, lineHeight: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  refreshButton: { width: 34, height: 34, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  photoCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 8 },
  screenshotPreview: { width: '100%', height: 180, borderRadius: 8, backgroundColor: 'rgba(14,19,20,0.06)' },
  itemDate: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 6 },
  itemActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  smallAction: { minHeight: 30, flex: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 5 },
  smallActionText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  videoList: { gap: 9, marginTop: 12 },
  videoCard: { minHeight: 126, borderWidth: 1, borderRadius: 13, padding: 9, flexDirection: 'row', gap: 11 },
  videoPreviewWrap: { width: 104, height: 104, borderRadius: 9, overflow: 'hidden', position: 'relative' },
  videoPreview: { width: '100%', height: '100%', backgroundColor: 'rgba(14,19,20,0.08)' },
  playBadge: { position: 'absolute', left: 37, top: 37, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(14,19,20,0.62)', alignItems: 'center', justifyContent: 'center' },
  videoCopy: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  stateCard: { borderWidth: 1, borderRadius: 14, padding: 19, alignItems: 'center', marginTop: 10 },
  stateIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle: { fontSize: 15, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  stateText: { fontSize: 10, lineHeight: 16, textAlign: 'center', fontFamily: 'Inter_400Regular', marginTop: 6 },
  primaryButton: { minHeight: 42, borderRadius: 21, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 15 },
  primaryButtonText: { color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold' },
  message: { fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 12, fontFamily: 'Inter_500Medium' },
  footer: { fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 22, fontFamily: 'Inter_400Regular' },
});
