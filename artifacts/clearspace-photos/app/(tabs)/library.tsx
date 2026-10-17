import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePhotoLibrary, type ReviewStateSnapshot } from '@/context/PhotoLibraryContext';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import * as PhotoLibrary from '@/lib/photo-library';
import type { PhotoMetadata, PhotoPermission } from '@/lib/photo-library.types';

type RankedPhoto = PhotoMetadata;
type SimilarGroup = { id: string; photos: RankedPhoto[] };
type SwipeDecision = 'keep' | 'remove' | 'favorite';
type SwipeHistory = {
  decision: SwipeDecision;
  photoId: string;
  photoIds: string[];
  previousGroupIndex: number;
  previousCardIndex: number;
  wasFavorite: boolean;
  reviewState: ReviewStateSnapshot;
};

const PAGE_SIZE = 240;
const BURST_WINDOW_MS = 90_000;
const MAX_GROUP_SPAN_MS = 180_000;
const ASPECT_RATIO_TOLERANCE = 0.12;

function aspectRatio(photo: PhotoMetadata) {
  if (!photo.width || !photo.height) return 0;
  return Math.min(photo.width, photo.height) / Math.max(photo.width, photo.height);
}

function rankPhotos(photos: RankedPhoto[]) {
  return [...photos].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    const aPixels = (a.width ?? 0) * (a.height ?? 0);
    const bPixels = (b.width ?? 0) * (b.height ?? 0);
    if (aPixels !== bPixels) return bPixels - aPixels;
    return (b.fileSize ?? 0) - (a.fileSize ?? 0);
  });
}

function groupNearbyPhotos(
  photos: RankedPhoto[],
  pendingIds: string[],
  keptIds: string[],
): SimilarGroup[] {
  const alreadyDecided = new Set([...pendingIds, ...keptIds]);
  const candidates = photos
    .filter((photo) => photo.creationTime != null && !alreadyDecided.has(photo.id))
    .sort((a, b) => (a.creationTime ?? 0) - (b.creationTime ?? 0));
  const groups: RankedPhoto[][] = [];
  let current: RankedPhoto[] = [];

  const finishGroup = () => {
    if (current.length > 1) groups.push(current);
    current = [];
  };

  for (const photo of candidates) {
    const previous = current[current.length - 1];
    if (!previous) {
      current = [photo];
      continue;
    }
    const elapsed = (photo.creationTime ?? 0) - (previous.creationTime ?? 0);
    const groupSpan = (photo.creationTime ?? 0) - (current[0].creationTime ?? 0);
    const ratioDelta = Math.abs(aspectRatio(photo) - aspectRatio(previous));
    if (
      elapsed <= BURST_WINDOW_MS &&
      groupSpan <= MAX_GROUP_SPAN_MS &&
      ratioDelta <= ASPECT_RATIO_TOLERANCE
    ) {
      current.push(photo);
    } else {
      finishGroup();
      current = [photo];
    }
  }
  finishGroup();

  return groups
    .map((group, index) => ({
      id: `set-${index}-${group[0]?.id ?? 'unknown'}`,
      photos: rankPhotos(group),
    }))
    .sort(
      (a, b) =>
        (b.photos[0]?.creationTime ?? 0) - (a.photos[0]?.creationTime ?? 0),
    );
}

async function addLocalFileSizes(groups: SimilarGroup[]) {
  const allPhotos = groups.flatMap((group) => group.photos);
  const sizes = new Map<string, number | null>();

  for (let index = 0; index < allPhotos.length; index += 8) {
    const chunk = allPhotos.slice(index, index + 8);
    await Promise.all(
      chunk.map(async (photo) => {
        try {
          sizes.set(photo.id, await PhotoLibrary.getLocalPhotoFileSize(photo.id));
        } catch {
          sizes.set(photo.id, null);
        }
      }),
    );
  }

  return groups.map((group) => ({
    ...group,
    photos: rankPhotos(
      group.photos.map((photo) => ({
        ...photo,
        fileSize: sizes.get(photo.id) ?? null,
      })),
    ),
  }));
}

function formatSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return 'Size unavailable';
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return 'Date unavailable';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMegapixels(photo: RankedPhoto) {
  const pixels = (photo.width ?? 0) * (photo.height ?? 0);
  return pixels > 0 ? `${(pixels / 1_000_000).toFixed(1)} MP` : 'Resolution unavailable';
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    ready,
    pendingRemovalIds,
    keptIds,
    xp,
    streakDays,
    bestStreak,
    lastActivityDate,
    dailyHistory,
    markForRemoval,
    markSetForRemoval,
    restoreFromBin,
    keepPhoto,
    favoritePhoto,
    restoreReviewState,
    recordDeleted,
    setScanSummary,
  } = usePhotoLibrary();
  const [permission, setPermission] = useState<PhotoPermission | null>(null);
  const [photos, setPhotos] = useState<RankedPhoto[]>([]);
  const [groups, setGroups] = useState<SimilarGroup[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyDeleting, setBusyDeleting] = useState(false);
  const [busyFavoriting, setBusyFavoriting] = useState(false);
  const [lastDecision, setLastDecision] = useState<SwipeHistory | null>(null);
  const [declinedSetId, setDeclinedSetId] = useState<string | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const decisionRef = useRef<(decision: SwipeDecision) => void>(() => undefined);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    PhotoLibrary.getPhotoPermission()
      .then((result) => {
        if (active) setPermission(result);
      })
      .catch(() => {
        if (active) setPermission(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const scanPage = useCallback(
    async (startOver: boolean) => {
      if (Platform.OS === 'web') return;
      setLastDecision(null);
      setDeclinedSetId(null);
      const pageOffset = startOver ? 0 : offset;
      const previous = startOver ? [] : photos;
      setIsScanning(true);
      setErrorMessage('');
      setDeleteError('');
      try {
        const page = await PhotoLibrary.queryPhotoPage(pageOffset, PAGE_SIZE);
        const combined = [
          ...previous,
          ...page
            .filter((photo) => !previous.some((existing) => existing.id === photo.id))
            .map((photo) => ({ ...photo, fileSize: null })),
        ];
        const rawGroups = groupNearbyPhotos(combined, pendingRemovalIds, keptIds);
        const rankedGroups = await addLocalFileSizes(rawGroups);
        setPhotos(combined);
        setGroups(rankedGroups);
        setGroupIndex(0);
        setCardIndex(0);
        setOffset(pageOffset + page.length);
        setHasMore(page.length === PAGE_SIZE);
        setHasScanned(true);
        setScanSummary(combined.length, rankedGroups.length);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Clearspace could not read the photo library. Try again.',
        );
      } finally {
        setIsScanning(false);
      }
    },
    [offset, photos, pendingRemovalIds, keptIds, setScanSummary],
  );

  const requestAccessAndScan = async () => {
    if (Platform.OS === 'web') return;
    setErrorMessage('');
    try {
      const result = await PhotoLibrary.requestPhotoAccess();
      setPermission(result);
      if (result.granted) await scanPage(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Photo access could not be requested.',
      );
    }
  };

  const activeGroup = groups[groupIndex];
  const currentPhoto = activeGroup?.photos[cardIndex];
  const nextPhoto =
    activeGroup?.photos[cardIndex + 1] ?? groups[groupIndex + 1]?.photos[0];
  const completed = hasScanned && !isScanning && !currentPhoto;
  const advance = async (decision: SwipeDecision) => {
    if (!currentPhoto || !activeGroup || busyFavoriting) return;
    const reviewState: ReviewStateSnapshot = {
      pendingRemovalIds,
      keptIds,
      xp,
      streakDays,
      bestStreak,
      lastActivityDate,
      dailyHistory,
    };
    const history: SwipeHistory = {
      decision,
      photoId: currentPhoto.id,
      photoIds: [currentPhoto.id],
      previousGroupIndex: groupIndex,
      previousCardIndex: cardIndex,
      wasFavorite: currentPhoto.isFavorite,
      reviewState,
    };
    if (decision === 'remove') {
      const alreadyKeptInSet = activeGroup.photos.some((photo) =>
        keptIds.includes(photo.id),
      );
      const unreviewedAlternative = activeGroup.photos
        .slice(cardIndex + 1)
        .some((photo) => !pendingRemovalIds.includes(photo.id));
      if (!alreadyKeptInSet && !unreviewedAlternative) {
        if (declinedSetId !== activeGroup.id) {
          setDeclinedSetId(activeGroup.id);
          Alert.alert(
            'Keep one photo from this set',
            'Clearspace asks you to keep one version from each similar set. If none of these photos is wanted, tap the removal button again to review moving the whole set to your Clearspace Bin.',
            [{ text: 'Got it' }],
          );
          return;
        }
        const setIds = activeGroup.photos.map((photo) => photo.id);
        Alert.alert(
          'Move the whole set to the Clearspace Bin?',
          `This stages all ${setIds.length} photos for later review${activeGroup.photos.some((photo) => photo.isFavorite) ? ', including any Photos favourites' : ''}. Nothing is deleted now. You can restore them from the bin before choosing Review delete.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Move to bin',
              style: 'destructive',
              onPress: () => {
                markSetForRemoval(setIds);
                setLastDecision({ ...history, decision: 'remove', photoIds: setIds });
                setDeclinedSetId(null);
                setNotice(`${setIds.length} photos moved to the Clearspace Bin. Nothing has been deleted.`);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGroupIndex(groupIndex + 1);
                setCardIndex(0);
              },
            },
          ],
        );
        return;
      }
      markForRemoval(currentPhoto.id);
      setNotice('Marked for removal. Nothing is deleted until you confirm.');
    } else if (decision === 'keep') {
      keepPhoto(currentPhoto.id);
      setNotice('Kept in this set.');
    } else {
      setBusyFavoriting(true);
      try {
        await PhotoLibrary.setPhotoFavorite(currentPhoto.id, !currentPhoto.isFavorite);
        favoritePhoto(currentPhoto.id);
        const updated = { ...currentPhoto, isFavorite: !currentPhoto.isFavorite };
        setPhotos((current) => current.map((photo) => photo.id === updated.id ? updated : photo));
        setGroups((current) => current.map((group) => ({
          ...group,
          photos: group.photos.map((photo) => photo.id === updated.id ? updated : photo),
        })));
        setNotice(currentPhoto.isFavorite ? 'Removed from Favourites.' : 'Added to your iPhone Favourites.');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not update this photo’s Favourites status.');
        setBusyFavoriting(false);
        return;
      }
      setBusyFavoriting(false);
    }
    setLastDecision(history);
    setDeclinedSetId(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cardIndex + 1 < activeGroup.photos.length) {
      setCardIndex(cardIndex + 1);
    } else {
      setGroupIndex(groupIndex + 1);
      setCardIndex(0);
    }
  };
  decisionRef.current = advance;

  const animateDecision = (decision: SwipeDecision) => {
    Animated.timing(pan, {
      toValue: decision === 'favorite'
        ? { x: 0, y: -520 }
        : { x: decision === 'keep' ? 480 : -480, y: 0 },
      duration: 190,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        pan.setValue({ x: 0, y: 0 });
        decisionRef.current(decision);
      }
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || gesture.dy < -8,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 105) {
            animateDecision('keep');
          } else if (gesture.dx < -105) {
            animateDecision('remove');
          } else if (gesture.dy < -105) {
            animateDecision('favorite');
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
              friction: 7,
            }).start();
          }
        },
      }),
    [pan],
  );

  const undoLastDecision = async () => {
    if (!lastDecision || busyFavoriting || busyDeleting) return;
    const previous = lastDecision;
    if (previous.decision === 'favorite') {
      try {
        if (!previous.wasFavorite) await PhotoLibrary.setPhotoFavorite(previous.photoId, false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not undo the Favourites change.');
        return;
      }
    }
    restoreReviewState(previous.reviewState);
    if (previous.decision === 'favorite') {
      setPhotos((current) => current.map((photo) => photo.id === previous.photoId
        ? { ...photo, isFavorite: previous.wasFavorite }
        : photo));
      setGroups((current) => current.map((group) => ({
        ...group,
        photos: group.photos.map((photo) => photo.id === previous.photoId
          ? { ...photo, isFavorite: previous.wasFavorite }
          : photo),
      })));
    }
    setGroupIndex(previous.previousGroupIndex);
    setCardIndex(previous.previousCardIndex);
    setLastDecision(null);
    setDeclinedSetId(null);
    setNotice('Last action undone.');
  };

  const removeMarked = () => {
    if (Platform.OS === 'web' || pendingRemovalIds.length === 0 || busyDeleting) return;
    const ids = [...pendingRemovalIds];
    const knownBytes = photos
      .filter((photo) => ids.includes(photo.id))
      .reduce((total, photo) => total + (photo.fileSize ?? 0), 0);

    Alert.alert(
      `Remove ${ids.length} ${ids.length === 1 ? 'photo' : 'photos'}?`,
      'Your phone will ask you to confirm the deletion. This cannot be undone from Clearspace.',
      [
        { text: 'Keep reviewing', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setBusyDeleting(true);
            setDeleteError('');
            try {
              await PhotoLibrary.deletePhotos(ids);
            } catch (error) {
              setDeleteError(
                error instanceof Error
                  ? error.message
                  : 'The phone did not approve deletion. Your photos are unchanged.',
              );
              setBusyDeleting(false);
              return;
            }

            const removed = new Set(ids);
            setLastDecision(null);
            const nextGroups = groups
              .map((group) => ({
                ...group,
                photos: group.photos.filter(
                  (photo) =>
                    !removed.has(photo.id) &&
                    !pendingRemovalIds.includes(photo.id) &&
                    !keptIds.includes(photo.id),
                ),
              }))
              .filter((group) => group.photos.length > 1);
            try {
              await recordDeleted(ids, knownBytes);
            } catch {
              setDeleteError('The photos were removed, but Clearspace could not save the local progress count.');
            }
            try {
              setPhotos((current) => current.filter((photo) => !removed.has(photo.id)));
              setGroups(nextGroups);
              setGroupIndex(0);
              setCardIndex(0);
              setScanSummary(Math.max(0, photos.length - ids.length), nextGroups.length);
              setNotice('Photos removed from your library.');
            } finally {
              setBusyDeleting(false);
            }
          },
        },
      ],
    );
  };

  const openSettings = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      setErrorMessage('Open your device settings to allow photo access.');
    }
  };

  const manageLimitedAccess = async () => {
    try {
      await PhotoLibrary.presentLimitedPhotoPicker();
      const result = await PhotoLibrary.getPhotoPermission();
      setPermission(result);
    } catch {
      setErrorMessage('Photo access settings could not be opened.');
    }
  };

  const rotation = pan.x.interpolate({
    inputRange: [-240, 240],
    outputRange: ['-14deg', '14deg'],
    extrapolate: 'clamp',
  });
  const keepOpacity = pan.x.interpolate({
    inputRange: [0, 70, 180],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });
  const removeOpacity = pan.x.interpolate({
    inputRange: [-180, -70, 0],
    outputRange: [1, 0.55, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Platform.OS === 'web' ? 112 : 116 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            testID="library-back"
            accessibilityLabel="Back to home"
            onPress={() => router.push('/')}
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ON-DEVICE REVIEW</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Similar moments</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        {Platform.OS === 'web' ? (
          <EmptyPanel
            icon="smartphone"
            title="Open Clearspace on your phone"
            body="Photo libraries are available in the native app. Your photos are never uploaded."
            colors={colors}
          />
        ) : !ready || permission === null ? (
          <EmptyPanel
            icon="image"
            title="Checking photo access"
            body="Your library is only read after you allow access."
            colors={colors}
            loading
          />
        ) : !permission.granted ? (
          <EmptyPanel
            icon="image"
            title="Start with your camera roll"
            body="Clearspace reads your photos on this device to group quick bursts and suggest which version has the most detail. Nothing leaves your phone."
            colors={colors}
            actionLabel={
              permission.status === 'denied' && !permission.canAskAgain
                ? 'Open device settings'
                : 'Allow photo access'
            }
            onAction={
              permission.status === 'denied' && !permission.canAskAgain
                ? openSettings
                : requestAccessAndScan
            }
          />
        ) : !hasScanned && !isScanning ? (
          <EmptyPanel
            icon="aperture"
            title="A careful first scan"
            body="We’ll look at up to 240 recent photos at a time. Groups are based on capture time and similar dimensions, then ranked on-device by favourites, resolution and file size."
            colors={colors}
            actionLabel="Scan my photos"
            onAction={() => void scanPage(true)}
          />
        ) : isScanning ? (
          <EmptyPanel
            icon="aperture"
            title="Looking for similar moments"
            body="Reading photo details and comparing capture times on this device."
            colors={colors}
            loading
          />
        ) : currentPhoto && activeGroup ? (
          <>
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              Swipe right to keep · left to mark for removal · up for Favourite
            </Text>
            <View style={styles.groupMeta}>
              <View>
                <Text style={[styles.groupTitle, { color: colors.foreground }]}>
                  Set {groupIndex + 1} of {groups.length}
                </Text>
                <Text style={[styles.groupCaption, { color: colors.mutedForeground }]}>
                  {activeGroup.photos.length} photos · {formatDate(activeGroup.photos[0]?.creationTime ?? null)}
                </Text>
              </View>
              <View style={[styles.localTag, { backgroundColor: `${colors.accent}40` }]}>
                <Feather name="smartphone" size={13} color={colors.accentForeground} />
                <Text style={[styles.localTagText, { color: colors.accentForeground }]}>On device</Text>
              </View>
            </View>

            <View style={styles.cardArea}>
              {groups[groupIndex + 1]?.photos[0] ? (
                <View style={[styles.stackCard, styles.stackCardBack, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image
                    source={{ uri: groups[groupIndex + 1].photos[0]?.id }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={120}
                  />
                </View>
              ) : null}
              {nextPhoto ? (
                <View style={[styles.stackCard, styles.stackCardMiddle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: nextPhoto.id }} style={styles.cardImage} contentFit="cover" transition={120} />
                </View>
              ) : null}
              <Animated.View
                testID="swipe-photo-card"
                {...responder.panHandlers}
                style={[
                  styles.stackCard,
                  styles.frontCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: rotation }] },
                ]}
              >
                <Image source={{ uri: currentPhoto.id }} style={styles.cardImage} contentFit="cover" transition={120} />
                <View style={styles.imageScrim} />
                {cardIndex === 0 ? (
                  <View style={[styles.recommendedTag, { backgroundColor: colors.accent }]}>
                    <Feather name={currentPhoto.isFavorite ? 'heart' : 'star'} size={13} color={colors.accentForeground} />
                    <Text style={[styles.recommendedText, { color: colors.accentForeground }]}>
                      {currentPhoto.isFavorite ? 'Your favourite' : 'Suggested best'}
                    </Text>
                  </View>
                ) : null}
                <Animated.View style={[styles.swipeStamp, styles.keepStamp, { borderColor: colors.secondary, opacity: keepOpacity }]}>
                  <Text style={[styles.stampText, { color: colors.secondary }]}>KEEP</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeStamp, styles.removeStamp, { borderColor: colors.primaryForeground, opacity: removeOpacity }]}>
                  <Text style={[styles.stampText, { color: colors.primaryForeground }]}>REMOVE</Text>
                </Animated.View>
                <View style={styles.photoOverlay}>
                  <Text style={[styles.photoName, { color: colors.card }]} numberOfLines={1}>
                    {currentPhoto.filename ?? 'Photo'}
                  </Text>
                  <Text style={[styles.photoDetails, { color: colors.card }]}>
                    {formatMegapixels(currentPhoto)} · {formatSize(currentPhoto.fileSize)}
                  </Text>
                </View>
              </Animated.View>
            </View>

            <Text style={[styles.recommendationReason, { color: colors.mutedForeground }]}>
              {currentPhoto.isFavorite
                ? 'Already in Favourites — Clearspace will never auto-mark it for removal.'
                : cardIndex === 0
                  ? 'Suggested by resolution and local file size. This is not a visual sharpness test.'
                  : 'Compare this photo with the suggested version before deciding.'}
            </Text>

            <View style={styles.decisionRow}>
              <Pressable
                testID="undo-swipe"
                accessibilityLabel="Undo last swipe"
                accessibilityState={{ disabled: !lastDecision }}
                disabled={!lastDecision || busyFavoriting || busyDeleting}
                onPress={() => void undoLastDecision()}
                style={({ pressed }) => [
                  styles.decisionButton,
                  styles.undoDecision,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: !lastDecision ? 0.42 : pressed ? 0.72 : 1 },
                ]}
              >
                <Feather name="rotate-ccw" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                testID="mark-photo-for-removal"
                accessibilityLabel="Mark photo for removal"
                onPress={() => animateDecision('remove')}
                style={({ pressed }) => [
                  styles.decisionButton,
                  styles.removeDecision,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Feather name="x" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                testID="favorite-photo"
                accessibilityLabel={currentPhoto.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                disabled={busyFavoriting || busyDeleting}
                onPress={() => animateDecision('favorite')}
                style={({ pressed }) => [
                  styles.decisionButton,
                  styles.favoriteDecision,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: busyFavoriting ? 0.55 : pressed ? 0.72 : 1 },
                ]}
              >
                <Feather name="heart" size={19} color={currentPhoto.isFavorite ? colors.primary : colors.accentForeground} />
              </Pressable>
              <Pressable
                testID="keep-photo"
                accessibilityLabel="Keep photo"
                onPress={() => animateDecision('keep')}
                style={({ pressed }) => [
                  styles.decisionButton,
                  styles.keepDecision,
                  { backgroundColor: colors.foreground, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Feather name="check" size={20} color={colors.card} />
              </Pressable>
            </View>
            <Text style={[styles.decisionHint, { color: colors.mutedForeground }]}>
              {cardIndex + 1} / {activeGroup.photos.length} · tap undo to go back
            </Text>
          </>
        ) : completed ? (
          <EmptyPanel
            icon="check-circle"
            title={groups.length ? 'That set is reviewed' : 'No quick-burst sets found'}
            body={
              groups.length
                ? 'Your keep choices are saved on this device. Photos marked for removal are still in your library until you confirm.'
                : 'We group photos captured close together with similar dimensions. Try scanning older photos, or come back after taking a burst.'
            }
            colors={colors}
            actionLabel={hasMore ? 'Scan older photos' : 'Scan again'}
            onAction={() => void scanPage(!hasMore)}
          />
        ) : null}

        {permission?.granted && permission.accessPrivileges === 'limited' && Platform.OS !== 'web' ? (
          <Pressable
            testID="manage-limited-access"
            onPress={() => void manageLimitedAccess()}
            style={[styles.manageAccess, { borderColor: colors.border }]}
          >
            <Feather name="image" size={14} color={colors.primary} />
            <Text style={[styles.manageAccessText, { color: colors.primary }]}>Manage selected photos</Text>
          </Pressable>
        ) : null}

        {permission?.granted && hasScanned ? (
          <Pressable
            testID="rescan-library"
            onPress={() => void scanPage(true)}
            disabled={isScanning}
            style={styles.rescanButton}
          >
            <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
            <Text style={[styles.rescanText, { color: colors.mutedForeground }]}>Rescan recent photos</Text>
          </Pressable>
        ) : null}

        {notice ? (
          <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
            <Feather name="check-circle" size={15} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.secondaryForeground }]}>{notice}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.destructive}12` }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
            <Pressable onPress={requestAccessAndScan} style={styles.retryButton}>
              <Text style={[styles.retryText, { color: colors.destructive }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {deleteError ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.destructive}12` }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{deleteError}</Text>
          </View>
        ) : null}

        {pendingRemovalIds.length > 0 ? (
          <View style={[styles.pendingPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pendingCopy}>
              <Text style={[styles.pendingTitle, { color: colors.foreground }]}>
                Clearspace Bin · {pendingRemovalIds.length} {pendingRemovalIds.length === 1 ? 'photo' : 'photos'}
              </Text>
              <Text style={[styles.pendingSubcopy, { color: colors.mutedForeground }]}>
                Safe for now. Restore them or review deletion when you’re ready.
              </Text>
            </View>
            <Pressable
              testID="restore-binned-photos"
              disabled={busyDeleting}
              onPress={() => {
                const restoredIds = [...pendingRemovalIds];
                restoreFromBin(restoredIds);
                const restored = new Set(restoredIds);
                setGroups(groupNearbyPhotos(
                  photos,
                  pendingRemovalIds.filter((id) => !restored.has(id)),
                  keptIds,
                ));
                setGroupIndex(0);
                setCardIndex(0);
                setLastDecision(null);
                setDeclinedSetId(null);
                setNotice('Photos restored to review. No files were deleted.');
              }}
              style={({ pressed }) => [styles.restoreBinButton, { borderColor: colors.border, opacity: busyDeleting || pressed ? 0.55 : 1 }]}
            >
              <Text style={[styles.restoreBinText, { color: colors.foreground }]}>Restore</Text>
            </Pressable>
            <Pressable
              testID="remove-marked-photos"
              disabled={busyDeleting || Platform.OS === 'web'}
              onPress={removeMarked}
              style={({ pressed }) => [
                styles.removeMarkedButton,
                { backgroundColor: colors.primary, opacity: pressed || busyDeleting ? 0.72 : 1 },
              ]}
            >
              <Feather name={busyDeleting ? 'loader' : 'trash-2'} size={15} color={colors.primaryForeground} />
              <Text style={[styles.removeMarkedText, { color: colors.primaryForeground }]}>
                {busyDeleting ? 'Waiting…' : 'Review delete'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  colors,
  actionLabel,
  onAction,
  loading = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  colors: ReturnType<typeof useColors>;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={[styles.emptyPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={loading ? 'loader' : icon} size={21} color={colors.secondaryForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          testID="photo-library-action"
          onPress={onAction}
          style={({ pressed }) => [
            styles.scanButton,
            { backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.scanButtonText, { color: colors.card }]}>{actionLabel}</Text>
          <Feather name="arrow-right" size={16} color={colors.card} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerCopy: { alignItems: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  title: { fontSize: 22, letterSpacing: -0.7, fontFamily: 'Inter_600SemiBold' },
  intro: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 19, marginBottom: 5 },
  emptyPanel: { borderWidth: 1, borderRadius: 14, alignItems: 'center', paddingHorizontal: 21, paddingVertical: 27, marginTop: 27 },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 19, lineHeight: 25, textAlign: 'center', letterSpacing: -0.4, fontFamily: 'Inter_600SemiBold' },
  emptyBody: { fontSize: 12, lineHeight: 19, textAlign: 'center', fontFamily: 'Inter_400Regular', marginTop: 8 },
  scanButton: { minHeight: 45, paddingHorizontal: 16, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  scanButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  groupMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 14 },
  groupTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  groupCaption: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  localTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  localTagText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  cardArea: { height: 420, position: 'relative', alignItems: 'center', marginTop: 2, marginBottom: 12 },
  stackCard: { position: 'absolute', left: 8, right: 8, top: 0, height: 400, overflow: 'hidden', borderRadius: 14, borderWidth: 1 },
  stackCardBack: { transform: [{ scale: 0.93 }, { translateY: 18 }], opacity: 0.6 },
  stackCardMiddle: { transform: [{ scale: 0.965 }, { translateY: 9 }], opacity: 0.82 },
  frontCard: { left: 0, right: 0, top: 0, height: 400, borderWidth: 1 },
  cardImage: { width: '100%', height: '100%' },
  imageScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 22, 23, 0.15)' },
  recommendedTag: { position: 'absolute', left: 14, top: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7 },
  recommendedText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  swipeStamp: { position: 'absolute', top: 59, borderWidth: 2, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
  keepStamp: { left: 16, transform: [{ rotate: '-12deg' }] },
  removeStamp: { right: 16, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 15, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  photoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 17, paddingTop: 35, paddingBottom: 16, backgroundColor: 'rgba(15, 22, 23, 0.54)' },
  photoName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  photoDetails: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 5 },
  recommendationReason: { fontSize: 11, lineHeight: 16, minHeight: 34, textAlign: 'center', fontFamily: 'Inter_400Regular', paddingHorizontal: 8 },
  decisionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 11, marginBottom: 8 },
  decisionButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  undoDecision: { borderWidth: 1 },
  favoriteDecision: { borderWidth: 1 },
  removeDecision: { borderWidth: 1 },
  keepDecision: {},
  decisionHint: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  manageAccess: { marginTop: 15, borderTopWidth: 1, paddingTop: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  manageAccessText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  rescanButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  rescanText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  notice: { borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  noticeText: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium' },
  errorBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  errorText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  retryButton: { alignSelf: 'flex-start', marginTop: 8 },
  retryText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  pendingPanel: { borderWidth: 1, borderRadius: 17, padding: 13, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingCopy: { flex: 1 },
  pendingTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  pendingSubcopy: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', marginTop: 3 },
  removeMarkedButton: { minHeight: 40, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  removeMarkedText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  restoreBinButton: { minHeight: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  restoreBinText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
