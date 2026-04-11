import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, KinMarkGeometry, KinMarkSizes } from '../constants/brand';

// ─────────────────────────────────────────────────────
// KinMark — the three-circle family constellation symbol
// ─────────────────────────────────────────────────────

interface KinMarkProps {
  /** Size in dp (width = height, square). Default: 32 */
  size?: number;
  /** Fill color for all three circles. Default: brand green */
  color?: string;
}

/**
 * The Kin logo mark — three circles in an equilateral triangle.
 * Top circle (smaller) = child. Bottom two = parents.
 *
 * Use this standalone for: tab bar, app icon, notification icons.
 * For nav headers / onboarding, use KinLogo (mark + wordmark).
 *
 * @example
 * <KinMark size={24} />                            // Tab bar
 * <KinMark size={64} />                            // Onboarding splash
 * <KinMark size={22} color={Colors.text2} />       // Dimmed variant
 */
export const KinMark: React.FC<KinMarkProps> = ({
  size = 32,
  color = Colors.green,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox={KinMarkGeometry.viewBox}
    accessibilityLabel="Kin"
    accessibilityRole="image"
  >
    {/* Top circle — child (slightly smaller, r=8) */}
    <Circle
      cx={KinMarkGeometry.topCx}
      cy={KinMarkGeometry.topCy}
      r={KinMarkGeometry.topR}
      fill={color}
    />
    {/* Bottom-left circle — parent (r=9) */}
    <Circle
      cx={KinMarkGeometry.blCx}
      cy={KinMarkGeometry.blCy}
      r={KinMarkGeometry.blR}
      fill={color}
    />
    {/* Bottom-right circle — parent (r=9) */}
    <Circle
      cx={KinMarkGeometry.brCx}
      cy={KinMarkGeometry.brCy}
      r={KinMarkGeometry.brR}
      fill={color}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────
// KinLogo — horizontal lockup: mark + wordmark
// ─────────────────────────────────────────────────────

interface KinLogoProps {
  /** Mark size in dp. Wordmark scales proportionally. Default: 24 */
  markSize?: number;
  /** Color for both mark and wordmark. Default: Colors.text */
  color?: string;
  /** Gap between mark and wordmark. Default: 10 */
  gap?: number;
  /** Additional styles for the outer row container */
  style?: ViewStyle;
  /** Additional styles for the wordmark text */
  wordmarkStyle?: TextStyle;
}

/**
 * Full horizontal logo lockup: constellation mark + "kin" wordmark.
 *
 * Use for: nav headers, onboarding, settings/about screen.
 * Do NOT use in tab bar — use KinMark alone.
 *
 * @example
 * <KinLogo markSize={22} />                         // Nav header
 * <KinLogo markSize={64} color={Colors.text} />     // Onboarding splash
 * <KinLogo markSize={28} gap={12} />                // Settings header
 */
export const KinLogo: React.FC<KinLogoProps> = ({
  markSize = 24,
  color = Colors.text,
  gap = 10,
  style,
  wordmarkStyle,
}) => {
  const wordmarkSize = Math.round(markSize * 0.917); // ~22/24 ratio

  return (
    <View style={[styles.row, { gap }, style]}>
      <KinMark size={markSize} color={Colors.green} />
      <Text
        style={[
          styles.wordmark,
          { fontSize: wordmarkSize, color },
          wordmarkStyle,
        ]}
        allowFontScaling={false}
      >
        kin
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Typography.families.sansMedium, // 'Geist-Medium'
    letterSpacing: 0.2,
    lineHeight: undefined, // Let React Native handle it
    includeFontPadding: false,
  },
});

export default KinMark;
