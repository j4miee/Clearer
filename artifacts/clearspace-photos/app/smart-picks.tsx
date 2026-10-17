import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { usePhotoLibrary } from '@/context/PhotoLibraryContext';
import { useColors } from '@/hooks/useColors';
import * as PhotoLibrary from '@/lib/photo-library';
import type { PhotoMetadata, PhotoPermission } from '@/lib/photo-library.types';

type SimilarGroup = { id: string; photos: PhotoMetadata[] };

function ratio(photo: PhotoMetadata) {
  if (!photo.width || !photo.height) return 0;
  return Math.min(photo.width, photo.height) / Math.max(photo.width, photo.height);
}

function findSimilarGroups(photos: PhotoMetadata[]): SimilarGroup[] {
  const sorted = [...photos].filter((photo) => photo.creationTime != null).sort((a, b) => (a.creationTime ?? 0) - (b.creationTime ?? 0));
  const groups: PhotoMetadata[][] = [];
  let current: PhotoMetadata[] = [];
  for (const photo of sorted) {
    const previous = current[current.length - 1];
    if (!previous) {
      current = [photo];
      continue;
    }
    const closeInTime = (photo.creationTime ?? 0) - (previous.creationTime ?? 0) <= 90_000;
    const similarShape = Math.abs(ratio(photo) - ratio(previous)) <= 0.12;
    if (closeInTime && similarShape) current.push(photo);
    else {
      if (current.length > 1) groups.push(current);
      current = [photo];
    }
  }
  if (current.length > 1) groups.push(current);
  return groups.map((items, index) => ({
    id: `suggestion-${index}-${items[0]?.id ?? 'photos'}`,
    photos: [...items].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0);
    }),
  })).sort((a, b) => (b.photos[0]?.creationTime ?? 0) - (a.photos[0]?.creationTime ?? 0));
}

export default function SmartPicksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingRemovalIds, keptIds, markForRemoval, keepPhoto } = usePhotoLibrary();
  const [permission, setPermission] = useState<PhotoPermission | null>(null);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [screenshots, setScreenshots] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const reviewed = useMemo(() => new Set([...pendingRemovalIds, ...keptIds]), [pendingRemovalIds, keptIds]);
  const availablePhotos = photos.filter((photo) => !reviewed.has(photo.id));
  const screenshotCutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const availableScreenshots = screenshots.filter(
    (photo) => !reviewed.has(photo.id) && photo.creationTime != null && photo.creationTime <= screenshotCutoff,
  );
  const similarGroups = findSimilarGroups(availablePhotos);
  const lowResolution = availablePhotos.filter((photo) => Math.min(photo.width ?? 0, photo.height ?? 0) > 0 && Math.min(photo.width ?? 0, photo.height ?? 0) < 500).slice(0, 12);

  const scan = async () => {
    setMessage('');
    if (Platform.OS === 'web') {
      setMessage('Open the native Expo app on your iPhone to use these on-device suggestions.');
      return;
    }
    setLoading(true);
    try {
      const current = await PhotoLibrary.getPhotoPermission();
      const access = current.granted ? current : await PhotoLibrary.requestPhotoAccess();
      setPermission(access);
      if (!access.granted) {
        setMessage('Allow photo access to create private suggestions from your library.');
        return;
      }
      const [page, screenshotsPage] = await Promise.all([
        PhotoLibrary.queryPhotoPage(0, 240),
        PhotoLibrary.queryScreenshotPhotos(240),
      ]);
      setPhotos(page);
      setScreenshots(screenshotsPage);
      if (page.length === 0) setMessage('No photos were available in the selected library access.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not scan photo details.');
    } finally {
      setLoading(false);
    }
  };

  const mark = (id: string) => markForRemoval(id);
  const keep = (id: string) => keepPhoto(id);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>PRIVATE BY DESIGN</Text>
          <View style={{ width: 42 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>AI assist.{ '\n' }Your call.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A first set of smart picks, built from photo details on this device.</Text>

        <View style={[styles.privacyCard, { backgroundColor: colors.foreground }]}>
          <Feather name="shield" size={16} color={colors.accent} />
          <Text style={styles.privacyText}>Your photos stay on your phone. This version uses capture time, dimensions, favourites and Apple Photos screenshot labels. It does not upload images or claim to recognize faces, pets or text.</Text>
        </View>

        {photos.length === 0 ? (
          <Pressable onPress={() => void scan()} disabled={loading} style={[styles.scanButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
            {loading ? <ActivityIndicator color="white" /> : <Feather name="aperture" size={17} color="white" />}
            <Text style={styles.scanButtonText}>{loading ? 'Looking at photo details…' : permission?.granted ? 'Refresh smart picks' : 'Scan my photos'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void scan()} disabled={loading} style={[styles.refreshButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={14} color={colors.foreground} />}
            <Text style={[styles.refreshText, { color: colors.foreground }]}>{loading ? 'Refreshing…' : 'Refresh suggestions'}</Text>
          </Pressable>
        )}
        {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}

        <SectionTitle title="KEEP-WORTHY MOMENTS" count={similarGroups.length ? `${similarGroups.length} sets` : '—'} colors={colors} />
        {similarGroups.length ? similarGroups.slice(0, 8).map((group) => (
          <View key={group.id} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.groupHeading}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{group.photos.length} similar moments</Text>
                <Text style={[styles.cardDetail, { color: colors.mutedForeground }]}>Suggested keeper is the favourite or highest-resolution photo.</Text>
              </View>
              <View style={[styles.suggestedBadge, { backgroundColor: colors.accent }]}><Text style={[styles.suggestedText, { color: colors.accentForeground }]}>KEEP PICK</Text></View>
            </View>
            <View style={styles.thumbRow}>
              {group.photos.slice(0, 4).map((photo, index) => (
                <View key={photo.id} style={styles.thumbWrap}>
                  <Image source={{ uri: photo.id }} style={styles.thumbnail} contentFit="cover" />
                  {index === 0 ? <View style={styles.bestMarker}><Feather name="star" size={10} color="white" /></View> : null}
                </View>
              ))}
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Keep suggestion" icon="heart" primary onPress={() => keep(group.photos[0].id)} colors={colors} />
              <ActionButton label="Review set" icon="copy" onPress={() => router.push('/library')} colors={colors} />
            </View>
          </View>
        )) : photos.length > 0 ? <EmptyNote text="No similar bursts found in the latest 240 photos." colors={colors} /> : null}

        <SectionTitle title="OLDER SCREENSHOTS" count={availableScreenshots.length ? String(availableScreenshots.length) : '—'} colors={colors} />
        {availableScreenshots.slice(0, 8).map((photo) => (
          <PhotoRow key={photo.id} photo={photo} detail={photo.creationTime ? new Date(photo.creationTime).toLocaleDateString() : 'Date unavailable'} onKeep={() => keep(photo.id)} onMark={() => mark(photo.id)} colors={colors} />
        ))}
        {photos.length > 0 && availableScreenshots.length === 0 ? <EmptyNote text="No screenshot album items found in the photos you shared." colors={colors} /> : null}

        <SectionTitle title="SMALL IMAGES TO REVIEW" count={lowResolution.length ? String(lowResolution.length) : '—'} colors={colors} />
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>Low resolution can mean an accidental shot, but can also be perfectly intentional. These are only suggestions.</Text>
        {lowResolution.slice(0, 6).map((photo) => (
          <PhotoRow key={photo.id} photo={photo} detail={`${photo.width} × ${photo.height} pixels`} onKeep={() => keep(photo.id)} onMark={() => mark(photo.id)} colors={colors} />
        ))}

        <SectionTitle title="MORE PRIVATE PHOTO AI" count="NEXT" colors={colors} />
        <View style={[styles.futureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FeatureLine title="People and pets" body="On-device image recognition can highlight meaningful photos. It is not enabled in this Expo Go build." colors={colors} />
          <FeatureLine title="Tickets and text" body="Reading ticket details needs local text recognition. PDFs live in Files, outside the Photos library." colors={colors} />
          <FeatureLine title="Exact duplicates" body="This first pass groups close-in-time photos with similar dimensions; it does not claim pixel-perfect duplicate detection." colors={colors} />
        </View>
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Suggestions never delete anything. Marked photos stay queued until you review and confirm removal.</Text>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, count, colors }: { title: string; count: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text><Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{count}</Text></View>;
}

function PhotoRow({ photo, detail, onKeep, onMark, colors }: { photo: PhotoMetadata; detail: string; onKeep: () => void; onMark: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.photoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: photo.id }} style={styles.rowImage} contentFit="cover" />
      <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.cardTitle, { color: colors.foreground }]}>{photo.filename || 'Photo'}</Text><Text style={[styles.cardDetail, { color: colors.mutedForeground }]}>{detail}</Text>
        <View style={styles.rowActions}><Pressable onPress={onKeep} style={[styles.smallAction, { backgroundColor: colors.secondary }]}><Text style={[styles.smallActionText, { color: colors.foreground }]}>Keep</Text></Pressable><Pressable onPress={onMark} style={[styles.smallAction, { backgroundColor: 'rgba(255,90,54,0.13)' }]}><Text style={[styles.smallActionText, { color: colors.primary }]}>Mark to review</Text></Pressable></View>
      </View>
    </View>
  );
}

function ActionButton({ label, icon, primary, onPress, colors }: { label: string; icon: keyof typeof Feather.glyphMap; primary?: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} style={[styles.actionButton, { backgroundColor: primary ? colors.primary : 'transparent', borderColor: primary ? colors.primary : colors.border }]}><Feather name={icon} size={13} color={primary ? 'white' : colors.foreground} /><Text style={[styles.actionText, { color: primary ? 'white' : colors.foreground }]}>{label}</Text></Pressable>;
}

function EmptyNote({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.emptyNote, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.cardDetail, { color: colors.mutedForeground }]}>{text}</Text></View>;
}

function FeatureLine({ title, body, colors }: { title: string; body: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.featureLine}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.cardDetail, { color: colors.mutedForeground }]}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 38, lineHeight: 43, letterSpacing: -1.5, fontFamily: 'Inter_700Bold', marginTop: 27 },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 7, marginBottom: 16 },
  privacyCard: { borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  privacyText: { flex: 1, color: 'white', fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  scanButton: { minHeight: 48, borderRadius: 12, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  scanButtonText: { color: 'white', fontSize: 12, fontFamily: 'Inter_700Bold' },
  refreshButton: { minHeight: 42, borderWidth: 1, borderRadius: 12, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  message: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 9, fontFamily: 'Inter_400Regular' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 9 },
  sectionTitle: { fontSize: 9, letterSpacing: 1.05, fontFamily: 'Inter_600SemiBold' },
  sectionCount: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  groupCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 9 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  cardDetail: { fontSize: 9, lineHeight: 14, fontFamily: 'Inter_400Regular', marginTop: 3 },
  suggestedBadge: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5 },
  suggestedText: { fontSize: 7, letterSpacing: 0.5, fontFamily: 'Inter_700Bold' },
  thumbRow: { flexDirection: 'row', gap: 7, marginTop: 11 },
  thumbWrap: { flex: 1, position: 'relative' },
  thumbnail: { height: 84, borderRadius: 7, backgroundColor: '#D9D8D3' },
  bestMarker: { position: 'absolute', right: 5, top: 5, width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A36' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  actionButton: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  photoRow: { borderWidth: 1, borderRadius: 11, padding: 9, flexDirection: 'row', gap: 10, marginBottom: 8 },
  rowImage: { width: 66, height: 76, borderRadius: 7, backgroundColor: '#D9D8D3' },
  rowCopy: { flex: 1, justifyContent: 'center' },
  rowActions: { flexDirection: 'row', gap: 7, marginTop: 7 },
  smallAction: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  smallActionText: { fontSize: 8, fontFamily: 'Inter_600SemiBold' },
  helper: { fontSize: 9, lineHeight: 14, marginBottom: 9, fontFamily: 'Inter_400Regular' },
  futureCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  featureLine: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(14,19,20,0.1)' },
  emptyNote: { borderWidth: 1, borderRadius: 10, padding: 12 },
  footer: { fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 15, fontFamily: 'Inter_400Regular' },
});
