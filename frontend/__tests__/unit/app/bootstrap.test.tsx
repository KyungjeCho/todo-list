import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockHydrate = jest.fn().mockResolvedValue(undefined);
const mockPreload = jest.fn().mockResolvedValue(undefined);

jest.mock('src/store/soundStore', () => ({
  useSoundStore: Object.assign(() => true, {
    getState: () => ({
      enabled: true,
      hydrated: false,
      hydrate: mockHydrate,
      setEnabled: jest.fn().mockResolvedValue(undefined),
    }),
    setState: jest.fn(),
    subscribe: jest.fn(() => () => undefined),
  }),
}));

jest.mock('src/features/sound/soundService', () => ({
  soundService: {
    preload: mockPreload,
    play: jest.fn(),
    setRecordingActive: jest.fn(),
    getStatus: jest.fn(() => 'ready'),
    dispose: jest.fn(),
  },
}));

jest.mock('@expo-google-fonts/noto-sans', () => ({
  useFonts: () => [true],
  NotoSans_400Regular: 'regular',
  NotoSans_500Medium: 'medium',
  NotoSans_600SemiBold: 'semibold',
  NotoSans_700Bold: 'bold',
}));

jest.mock('src/app/navigation/AuthNavigator', () => ({
  AuthNavigator: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: { restoreTokens: () => Promise<void> }) => unknown) =>
      selector({ restoreTokens: jest.fn().mockResolvedValue(undefined) }),
    {
      getState: () => ({
        restoreTokens: jest.fn().mockResolvedValue(undefined),
      }),
      setState: jest.fn(),
    },
  ),
}));

describe('App bootstrap', () => {
  beforeEach(() => {
    mockHydrate.mockClear();
    mockPreload.mockClear();
  });

  it('앱 마운트 시 soundStore.hydrate()와 soundService.preload()를 각 1회 호출한다', async () => {
    const App = (await import('../../../App')).default;
    render(<App />);

    await waitFor(() => {
      expect(mockHydrate).toHaveBeenCalledTimes(1);
      expect(mockPreload).toHaveBeenCalledTimes(1);
    });
  });
});
