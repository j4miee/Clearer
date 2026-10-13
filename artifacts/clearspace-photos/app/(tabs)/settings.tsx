import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePhotoLibrary } from '@/context/PhotoLibraryContext';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { freedBytes, clearedPhotoCount, pendingRemovalIds } = usePhotoLibrary();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: Platform.OS === 'web' ? 110 : 105 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to home"
            onPress={() => router.push('/')}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.foreground }]}>
          <View style={[styles.profileMark, { backgroundColor: colors.accent }]}>
            <Feather name="shield" size={19} color={colors.accentForeground} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileTitle, { color: colors.card }]}>Private by default</Text>
            <Text style={[styles.profileBody, { color: colors.muted }]}>
              Photo details and ranking stay on this device.
            </Text>
          </View>
          <Feather name="check" size={18} color={colors.accent} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HOW PICKS WORK</Text>
        <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow
            icon="aperture"
            title="On-device smart ranking"
            detail="Uses favourites, resolution and local file size. It does not inspect visual sharpness."
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="clock"
            title="Similar moments"
            detail="Groups photos taken close together with similar dimensions. No images are uploaded."
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="check-circle"
            title="Deletion always needs confirmation"
            detail="A swipe only marks a photo. You review the selection before the phone's delete prompt."
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR PROGRESS</Text>
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.progressIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="archive" size={19} color={colors.secondaryForeground} />
          </View>
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              {clearedPhotoCount} {clearedPhotoCount === 1 ? 'photo' : 'photos'} removed
            </Text>
            <Text style={[styles.progressBody, { color: colors.mutedForeground }]}>
              {freedBytes > 0 ? `About ${(freedBytes / 1_000_000).toFixed(1)} MB of local files` : 'No file-size estimate available'}
            </Text>
          </View>
        </View>

        {pendingRemovalIds.length > 0 ? (
          <Pressable
            onPress={() => router.push('/library')}
            style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="trash-2" size={16} color={colors.primary} />
            <Text style={[styles.pendingText, { color: colors.foreground }]}>
              {pendingRemovalIds.length} photo{pendingRemovalIds.length === 1 ? '' : 's'} waiting for your review
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SYNC WITH WEB</Text>
        <SyncCard colors={colors} />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>Clearspace</Text>
          <Text style={[styles.aboutBody, { color: colors.mutedForeground }]}>
            Make space for what’s worth keeping.
          </Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>Version 1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SyncCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { deviceId, lastSync, syncNow, getLinkCode, linkWithCode } = usePhotoLibrary();
  const [code, setCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = (fn: () => Promise<string | void>) => async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await fn();
      if (typeof result === 'string') setMessage(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 23 }]}>
      <Text style={[styles.settingTitle, { color: colors.foreground }]}>Share progress with Clearspace web</Text>
      <Text style={[styles.settingDetail, { color: colors.mutedForeground }]} numberOfLines={1}>
        ID {deviceId ?? '…'}
        {lastSync ? ` · ${lastSync.platforms.join(' + ')}` : ''}
      </Text>
      <View style={styles.syncRow}>
        <Pressable testID="native-sync-now" disabled={busy} onPress={run(async () => { await syncNow(); return 'Progress synced.'; })}
          style={[styles.syncButton, { backgroundColor: colors.foreground }]}>
          <Text style={[styles.syncButtonText, { color: colors.card }]}>{busy ? 'Working…' : 'Sync now'}</Text>
        </Pressable>
        <Pressable testID="native-get-code" disabled={busy} onPress={run(async () => { setMyCode(await getLinkCode()); })}
          style={[styles.syncButton, { borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.syncButtonText, { color: colors.foreground }]}>Link code</Text>
        </Pressable>
      </View>
      {myCode ? <Text style={[styles.syncCode, { color: colors.foreground }]}>{myCode}</Text> : null}
      <View style={styles.syncRow}>
        <TextInput
          testID="native-code-input" value={code} onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={6} autoCapitalize="characters" placeholder="ENTER CODE" placeholderTextColor={colors.mutedForeground}
          style={[styles.syncInput, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable testID="native-link" disabled={busy || code.length !== 6}
          onPress={run(async () => { await linkWithCode(code); setCode(''); return 'Linked with web.'; })}
          style={[styles.syncButton, { backgroundColor: colors.primary, opacity: code.length === 6 ? 1 : 0.5 }]}>
          <Text style={[styles.syncButtonText, { color: colors.primaryForeground }]}>Link</Text>
        </Pressable>
      </View>
      {message ? <Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>{message}</Text> : null}
    </View>
  );
}

function InfoRow({
  icon,
  title,
  detail,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={17} color={colors.secondaryForeground} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  iconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 23, letterSpacing: -0.7, fontFamily: 'Inter_600SemiBold' },
  profileCard: { minHeight: 100, borderRadius: 21, padding: 17, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  profileMark: { width: 43, height: 43, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  profileBody: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold', marginBottom: 10, marginTop: 2 },
  settingGroup: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 27 },
  settingRow: { minHeight: 77, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12 },
  settingIcon: { width: 37, height: 37, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingCopy: { flex: 1, marginLeft: 11, paddingRight: 3 },
  settingTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  settingDetail: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 4 },
  divider: { height: 1, marginLeft: 61 },
  progressCard: { minHeight: 78, borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressIcon: { width: 37, height: 37, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  progressCopy: { flex: 1, marginLeft: 11 },
  progressTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressBody: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  pendingCard: { minHeight: 54, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 23 },
  pendingText: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium' },
  aboutCard: { borderWidth: 1, borderRadius: 18, padding: 16 },
  aboutTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  aboutBody: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 5 },
  version: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 18 },
  syncRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  syncButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  syncButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  syncInput: { flex: 2, minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, letterSpacing: 4, fontFamily: 'Inter_600SemiBold' },
  syncCode: { fontSize: 26, letterSpacing: 8, fontFamily: 'Inter_700Bold', marginTop: 12 },
});
