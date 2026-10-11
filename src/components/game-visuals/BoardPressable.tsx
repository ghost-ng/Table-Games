import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useWebFocusRing } from '../../utils/useWebFocusRing';
import { getBoardFocusPresentation } from '../../game-visuals/presentation';

/** Preserve the control contract while drawing keyboard focus above decorative art. */
export function BoardPressable({ style, onFocus, onBlur, ...props }: PressableProps) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const outline = getBoardFocusPresentation(theme.colors.focus, Boolean(focus.style));
  return (
    <Pressable {...props}
      onFocus={(event) => { focus.onFocus(event); onFocus?.(event); }}
      onBlur={(event) => { focus.onBlur(); onBlur?.(event); }}
      style={(state) => [typeof style === 'function' ? style(state) : style, outline]}
    />
  );
}
