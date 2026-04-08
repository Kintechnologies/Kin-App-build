import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface KinMarkProps {
  size?: number;
  color?: string;
}

/** The three-circle family constellation mark. Use for icons, app icon, tab bar. */
export const KinMark = ({ size = 32, color = '#7CB87A' }: KinMarkProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Top circle — child */}
    <Circle cx="32" cy="20" r="8" fill={color} />
    {/* Bottom-left circle — parent */}
    <Circle cx="21.75" cy="37.9" r="9" fill={color} />
    {/* Bottom-right circle — parent */}
    <Circle cx="42.25" cy="37.9" r="9" fill={color} />
  </Svg>
);

export default KinMark;
