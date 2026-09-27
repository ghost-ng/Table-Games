import React from 'react';
import { Text, type TextStyle } from 'react-native';
import type { StateMarker as Marker } from '../../game-visuals/presentation';

// Labels and roles belong to the enclosing game cell or button.
export function StateMarker({ marker, color, size = 14 }: { marker: Marker; color: string; size?: number }) {
  if (!marker.glyph) return null;
  const style: TextStyle = marker.shape === 'dot'
    ? { position: 'absolute', alignSelf: 'center', fontSize: size * 2, color, fontWeight: '700' }
    : { position: 'absolute', right: 2, bottom: 1, fontSize: size, color, fontWeight: '700' };
  return (
    <Text pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {marker.glyph}
    </Text>
  );
}
