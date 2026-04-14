import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  type GestureResponderEvent,
  type TouchableOpacityProps,
} from 'react-native';
import { soundService } from '../../features/sound/soundService';

export interface SoundPressableProps extends TouchableOpacityProps {
  /**
   * Opt-out for specific call sites that must stay silent
   * (e.g., destructive long-press confirmation).
   */
  disableSound?: boolean;
}

/**
 * Drop-in replacement for `TouchableOpacity` that plays a UI click
 * sound on committed taps. Sound is suppressed when the button is
 * disabled, when `disableSound` is set, when the user has turned the
 * feature off in settings, or when a recording session is active —
 * all guard logic lives in `soundService.play()`.
 */
export const SoundPressable: React.FC<SoundPressableProps> = ({
  onPress,
  disableSound,
  disabled,
  children,
  ...rest
}) => {
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!disableSound) {
        soundService.play();
      }
      onPress?.(event);
    },
    [disableSound, onPress],
  );

  return (
    <TouchableOpacity disabled={disabled} onPress={handlePress} {...rest}>
      {children}
    </TouchableOpacity>
  );
};
