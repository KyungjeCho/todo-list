/**
 * Feature 006 — UI Button Click Sound
 * Internal TypeScript contracts for the sound feedback subsystem.
 *
 * These types are the authoritative shape of exports consumed by
 * screens/components. They are NOT published as a runtime API; the
 * contract exists to lock signatures before implementation.
 */

import type { TouchableOpacityProps } from 'react-native';

// ----------------------------------------------------------------------------
// soundService — singleton, infra-level wrapper around expo-audio
// ----------------------------------------------------------------------------

export type SoundAssetStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ClickSoundService {
  /**
   * App bootstrap hook. Loads the MP3 asset and instantiates a single
   * AudioPlayer. Safe to call multiple times (idempotent).
   */
  preload(): Promise<void>;

  /**
   * Fire-and-forget playback. Must return within a few ms.
   * Internally applies the PlaybackGuard (see data-model.md §3).
   * Never throws. On any failure, silently no-ops.
   */
  play(): void;

  /**
   * Informs the service that a recording session is active, so that
   * click sounds do not leak into the recorded audio or fight the
   * shared AudioSession. Called by useVoiceRecording.
   */
  setRecordingActive(active: boolean): void;

  /** Current asset status — exposed only for diagnostics/tests. */
  getStatus(): SoundAssetStatus;

  /** Release native resources (test teardown, rarely at runtime). */
  dispose(): void;
}

// ----------------------------------------------------------------------------
// soundStore — Zustand store, persists via expo-secure-store
// ----------------------------------------------------------------------------

export interface SoundStoreState {
  /** Current in-memory toggle value. Source of truth for UI. */
  enabled: boolean;
  /** True once hydrate() has completed at least once. */
  hydrated: boolean;
}

export interface SoundStoreActions {
  /**
   * Reads the persisted flag from secure-store. Falls back to
   * `enabled = true` on any error. Must be called during app boot.
   */
  hydrate(): Promise<void>;

  /**
   * Updates memory state immediately, then persists. Persist failures
   * are logged (dev only) and do NOT roll back UI state.
   */
  setEnabled(next: boolean): Promise<void>;
}

export type SoundStore = SoundStoreState & SoundStoreActions;

// ----------------------------------------------------------------------------
// useClickSound — feature-level hook consumed by UI
// ----------------------------------------------------------------------------

export interface UseClickSoundResult {
  /**
   * Triggers a click sound, respecting user preference + recording
   * guard. Safe to call unconditionally; no-ops when disabled.
   */
  play: () => void;
  /** Mirror of soundStore.enabled for conditional UI (rare). */
  enabled: boolean;
}

export type UseClickSound = () => UseClickSoundResult;

// ----------------------------------------------------------------------------
// SoundPressable — drop-in replacement for TouchableOpacity
// ----------------------------------------------------------------------------

export interface SoundPressableProps extends TouchableOpacityProps {
  /**
   * Opt-out for cases where a button should remain silent
   * (e.g., destructive long-press confirmation).
   * Default: false (sound plays).
   */
  disableSound?: boolean;
}

// ----------------------------------------------------------------------------
// SettingsScreen integration (existing screen, new wiring)
// ----------------------------------------------------------------------------

/**
 * SettingsScreen does NOT receive a new prop. It reads/writes the
 * sound preference directly via useSoundStore(), mirroring how
 * feature 005 integrated language/timezone without expanding the
 * UserProfile prop surface. This keeps the screen decoupled from
 * backend profile updates (which would be inappropriate here — see
 * research.md R4).
 */
export type SoundPreferenceWiring = 'via useSoundStore, no prop change';
