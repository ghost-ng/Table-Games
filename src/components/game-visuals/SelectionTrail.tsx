import React, { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getSelectionTrailPresentation, type NormalizedPoint } from '../../game-visuals/presentation';

export interface SelectionTrailProps {
  points: readonly NormalizedPoint[];
  found: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SelectionTrail({ points, found, style }: SelectionTrailProps) {
  const { theme } = useTheme();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const trail = getSelectionTrailPresentation(points, layout.width, layout.height, found);
  const color = theme.materials.selectionTrail;
  const thickness = 6;
  return (
    <View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={({ nativeEvent }) => setLayout({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })} style={[StyleSheet.absoluteFillObject, style]}>
      {trail.segments.map((segment, index) => (
        <View key={index} style={{ position: 'absolute', left: segment.x - segment.length / 2, top: segment.y - thickness / 2, width: segment.length, height: thickness, borderRadius: thickness / 2, backgroundColor: color, opacity: trail.opacity, transform: [{ rotate: `${segment.angle}rad` }] }} />
      ))}
      {trail.start && <View style={{ position: 'absolute', left: trail.start.x - 5, top: trail.start.y - 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color, opacity: trail.opacity }} />}
      {trail.end && <View style={{ position: 'absolute', left: trail.end.x - 5, top: trail.end.y - 5, width: 10, height: 10, borderWidth: 2, borderColor: color, opacity: trail.opacity }} />}
      {trail.end && trail.foundMarker && <Text style={{ position: 'absolute', left: trail.end.x + 5, top: trail.end.y - 9, color: theme.materials.celebration, fontSize: 12, fontWeight: '700' }}>{trail.foundMarker}</Text>}
    </View>
  );
}
