import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { useColors } from '@/hooks/useColors';

type PickedFile = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedAt: number | null;
};

function formatSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return 'Size unavailable';
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatModified(timestamp: number | null) {
  if (!timestamp) return 'Date unavailable';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<PickedFile[]>([]);
  const [keptCount, setKeptCount] = useState(0);
  const [removedFromReviewCount, setRemovedFromReviewCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const currentFile = queue[0];

  const chooseFiles = async () => {
    setBusy(true);
    setErrorMessage('');
    try {
      const selection = await File.pickFileAsync({ multipleFiles: true, mimeTypes: ['*/*'] });
      if (selection.canceled) return;
      const picked = selection.result.map((file) => ({
        id: file.uri,
        uri: file.uri,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        modifiedAt: file.modificationTime,
      }));
      setQueue((existing) => {
        const known = new Set(existing.map((file) => file.id));
        return [...existing, ...picked.filter((file) => !known.has(file.id))];
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The Files picker could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  const keepFile = () => {
    setKeptCount((count) => count + 1);
    setQueue((files) => files.slice(1));
  };

  const removeFromReview = () => {
    if (!currentFile) return;
    Alert.alert(
      'Remove from this review?',
      'This only skips the file in Clearspace. The original file on your device will not be changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip file',
          onPress: () => {
            setRemovedFromReviewCount((count) => count + 1);
            setQueue((files) => files.slice(1));
          },
        },
      ],
    );
  };

  const isImage = currentFile?.mimeType.startsWith('image/');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            testID="files-back"
            accessibilityLabel="Back to home"
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ON-DEVICE REVIEW</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Files</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <View style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="shield" size={16} color={colors.secondaryForeground} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
            Choose files from Apple’s Files app to review PDFs, tickets and other documents. Clearspace can only see the files you select here.
          </Text>
        </View>

        {currentFile ? (
          <>
            <View style={[styles.progressLine, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.progressText, { color: colors.secondaryForeground }]}>
                FILE {keptCount + removedFromReviewCount + 1} · {queue.length} LEFT TO REVIEW
              </Text>
            </View>
            <View style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {isImage ? (
                <Image source={{ uri: currentFile.uri }} style={styles.preview} contentFit="contain" />
              ) : (
                <View style={[styles.documentIcon, { backgroundColor: colors.accent }]}>
                  <Feather name={currentFile.mimeType === 'application/pdf' ? 'file-text' : 'file'} size={34} color={colors.accentForeground} />
                  <Text style={[styles.documentType, { color: colors.accentForeground }]}>
                    {currentFile.mimeType === 'application/pdf' ? 'PDF' : 'DOCUMENT'}
                  </Text>
                </View>
              )}
              <View style={styles.fileDetails}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>
                  {currentFile.name}
                </Text>
                <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>{formatSize(currentFile.size)}</Text>
                <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>{formatModified(currentFile.modifiedAt)}</Text>
                <Text style={[styles.fileType, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {currentFile.mimeType}
                </Text>
              </View>
            </View>

            <Text style={[styles.safeNote, { color: colors.mutedForeground }]}>
              Clearspace won’t delete or alter the original. “Skip file” only removes it from this review.
            </Text>
            <View style={styles.actions}>
              <Pressable
                testID="skip-file-review"
                onPress={removeFromReview}
                style={({ pressed }) => [styles.skipButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.72 : 1 }]}
              >
                <Feather name="skip-forward" size={16} color={colors.mutedForeground} />
                <Text style={[styles.skipText, { color: colors.foreground }]}>Skip file</Text>
              </Pressable>
              <Pressable
                testID="keep-reviewed-file"
                onPress={keepFile}
                style={({ pressed }) => [styles.keepButton, { backgroundColor: colors.foreground, opacity: pressed ? 0.76 : 1 }]}
              >
                <Feather name="check" size={16} color={colors.card} />
                <Text style={[styles.keepText, { color: colors.card }]}>Keep</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="folder" size={22} color={colors.secondaryForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground}]}>
              {keptCount + removedFromReviewCount > 0 ? 'You’re up to date' : 'Choose files to review'}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {keptCount + removedFromReviewCount > 0
                ? `${keptCount} kept · ${removedFromReviewCount} skipped. Choose another batch whenever you like.`
                : 'Select PDFs, tickets, images or other files from Files, iCloud Drive or a provider on your device.'}
            </Text>
            <Pressable
              testID="choose-files"
              disabled={busy}
              onPress={() => void chooseFiles()}
              style={({ pressed }) => [styles.chooseButton, { backgroundColor: colors.foreground, opacity: busy || pressed ? 0.72 : 1 }]}
            >
              <Feather name={busy ? 'loader' : 'folder-plus'} size={16} color={colors.card} />
              <Text style={[styles.chooseText, { color: colors.card }]}>{busy ? 'Opening Files…' : 'Choose files'}</Text>
            </Pressable>
          </View>
        )}

        {currentFile ? (
          <Pressable testID="choose-more-files" disabled={busy} onPress={() => void chooseFiles()} style={styles.addMoreButton}>
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addMoreText, { color: colors.primary }]}>{busy ? 'Opening Files…' : 'Add more files'}</Text>
          </Pressable>
        ) : null}

        {errorMessage ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { alignItems: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 23, letterSpacing: -0.7, fontFamily: 'Inter_600SemiBold', marginTop: 3 },
  privacyCard: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 18 },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  progressLine: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 9 },
  progressText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  fileCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  preview: { width: '100%', height: 270, backgroundColor: 'rgba(14,19,20,0.04)' },
  documentIcon: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  documentType: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'Inter_700Bold' },
  fileDetails: { padding: 16 },
  fileName: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_600SemiBold' },
  fileMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 5 },
  fileType: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 9 },
  safeNote: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 14, paddingHorizontal: 8, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  skipButton: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  skipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  keepButton: { minHeight: 48, flex: 1, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  keepText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyCard: { borderWidth: 1, borderRadius: 16, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 26, marginTop: 5 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  emptyBody: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8, fontFamily: 'Inter_400Regular' },
  chooseButton: { minHeight: 46, borderRadius: 23, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  chooseText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addMoreButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 15 },
  addMoreText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  errorText: { textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 10, fontFamily: 'Inter_500Medium' },
});
