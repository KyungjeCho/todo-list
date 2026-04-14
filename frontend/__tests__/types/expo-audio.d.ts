// WHY: Feature 006 test-only helpers from __mocks__/expo-audio.ts need to be visible
//      to `tsc --noEmit` (CI type-check). Module augmentation adds the symbols on top
//      of the real expo-audio types — Jest swaps the module at test time.
import 'expo-audio';

declare module 'expo-audio' {
  interface MockAudioPlayer {
    play: jest.Mock;
    seekTo: jest.Mock;
    remove: jest.Mock;
  }
  export function __getLastCreatedPlayer(): MockAudioPlayer | null;
  export function __resetAudioPlayerMocks(): void;
  export function __setCreateAudioPlayerShouldThrow(value: boolean): void;
}
