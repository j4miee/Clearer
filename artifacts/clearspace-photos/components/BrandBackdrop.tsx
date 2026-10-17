import React from 'react';
import { StyleSheet, View } from 'react-native';

const verticalLines = Array.from({ length: 16 }, (_, index) => index);
const horizontalLines = Array.from({ length: 30 }, (_, index) => index);

/** The web app's grid canvas and warm ambient color, adapted for native screens. */
export function BrandBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.coralGlow} />
      <View style={styles.honeyGlow} />
      {verticalLines.map((index) => (
        <View key={`v-${index}`} style={[styles.verticalLine, { left: index * 32 }]} />
      ))}
      {horizontalLines.map((index) => (
        <View key={`h-${index}`} style={[styles.horizontalLine, { top: index * 32 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coralGlow: { position: 'absolute', width: 270, height: 270, borderRadius: 135, top: -150, right: -110, backgroundColor: 'rgba(255,90,54,0.12)' },
  honeyGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, bottom: 70, left: -150, backgroundColor: 'rgba(255,201,60,0.13)' },
  verticalLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(14,19,20,0.055)' },
  horizontalLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(14,19,20,0.055)' },
});
