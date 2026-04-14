import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ui.buttonClickSound.enabled';

interface SoundStoreState {
  enabled: boolean;
  hydrated: boolean;
}

interface SoundStoreActions {
  hydrate: () => Promise<void>;
  setEnabled: (next: boolean) => Promise<void>;
}

export type SoundStore = SoundStoreState & SoundStoreActions;

function devWarn(message: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[soundStore] ${message}`, error);
  }
}

export const useSoundStore = create<SoundStore>((set) => ({
  enabled: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored === 'true' || stored === 'false') {
        set({ enabled: stored === 'true', hydrated: true });
        return;
      }
      // Self-heal: unknown/missing value → write default and proceed.
      set({ enabled: true, hydrated: true });
      if (stored !== null) {
        try {
          await SecureStore.setItemAsync(STORAGE_KEY, 'true');
        } catch (err) {
          devWarn('self-heal write failed', err);
        }
      }
    } catch (err) {
      devWarn('hydrate read failed', err);
      set({ enabled: true, hydrated: true });
    }
  },

  setEnabled: async (next) => {
    set({ enabled: next });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next ? 'true' : 'false');
    } catch (err) {
      devWarn('setEnabled write failed', err);
    }
  },
}));
