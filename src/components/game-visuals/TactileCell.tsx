import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getCellPresentation, type VisualCellState } from '../../game-visuals/presentation';
import { StateMarker } from './StateMarker';

export interface TactileCellProps extends ViewProps {
  state?: VisualCellState;
  pressed?: boolean;
  disabled?: boolean;
}

export function TactileCell({ children, state = 'neutral', pressed = false, disabled = false, style, ...props }: TactileCellProps) {
  const { theme } = useTheme();
  const presentation = getCellPresentation(theme.colors, theme.materials, state, pressed, disabled);
  return (
    <View {...props} style={[
      {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: presentation.backgroundColor,
        borderWidth: presentation.borderWidth, borderColor: presentation.borderColor,
        borderRadius: theme.borderRadius.md,
        opacity: presentation.opacity,
        shadowColor: '#000000', shadowOffset: { width: 0, height: theme.materials.cellDepth },
        shadowOpacity: presentation.shadowOpacity,
        shadowRadius: 2, elevation: presentation.elevation,
        transform: [{ translateY: presentation.translateY }],
      },
      style,
    ]}>
      {children}
      <StateMarker marker={presentation.marker} color={state === 'winning' || state === 'found' ? theme.materials.celebration : theme.colors.focus} />
    </View>
  );
}
