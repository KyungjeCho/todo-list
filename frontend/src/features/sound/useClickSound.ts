import { useSoundStore } from '../../store/soundStore';
import { soundService } from './soundService';

export interface UseClickSoundResult {
  /**
   * Triggers a click sound. Safe to call unconditionally — guards
   * (user preference, recording session, asset readiness) live in
   * soundService.play().
   */
  play: () => void;
  /** Mirror of soundStore.enabled for rare conditional UI. */
  enabled: boolean;
}

export function useClickSound(): UseClickSoundResult {
  const enabled = useSoundStore((s) => s.enabled);
  return {
    play: () => soundService.play(),
    enabled,
  };
}
