import { useState } from 'react';
import { Platform, type NativeSyntheticEvent, type TargetedEvent, type ViewStyle } from 'react-native';

/** Token-colored keyboard focus, without outlining pointer presses. */
export function useWebFocusRing(color: string) {
  const [focusVisible, setFocusVisible] = useState(false);
  const onFocus = (event: NativeSyntheticEvent<TargetedEvent>) => {
    if (Platform.OS !== 'web') return;
    const target = event.target as unknown as { matches?: (selector: string) => boolean };
    setFocusVisible(target.matches?.(':focus-visible') ?? true);
  };
  const style: ViewStyle | undefined = focusVisible
    ? { outlineColor: color, outlineStyle: 'solid', outlineWidth: 3, outlineOffset: 3 }
    : undefined;
  return { onFocus, onBlur: () => setFocusVisible(false), style };
}
