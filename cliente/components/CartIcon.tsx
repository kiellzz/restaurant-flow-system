import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export function CartIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 3.5H4.5L6.5 15.5H17.5L19.5 7.5H5.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="18.5" r="1.3" fill={color} />
      <Circle cx="15.5" cy="18.5" r="1.3" fill={color} />
    </Svg>
  );
}
