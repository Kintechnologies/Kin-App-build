import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KinMark } from './KinMark';
import { Colors, Typography } from '../constants/brand';

interface KinLogoProps {
  markSize?: number;
  fontSize?: number;
  color?: string;
  gap?: number;
}

/** Full horizontal lockup: mark + wordmark. Use in nav headers and splash. */
export const KinLogo = ({
  markSize = 24,
  fontSize = 22,
  color = Colors.text,
  gap = 10,
}: KinLogoProps) => (
  <View style={[styles.row, { gap }]}>
    <KinMark size={markSize} />
    <Text style={[styles.wordmark, { fontSize, color }]}>kin</Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: {
    fontFamily: Typography.families.sansMed,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
});

export default KinLogo;
