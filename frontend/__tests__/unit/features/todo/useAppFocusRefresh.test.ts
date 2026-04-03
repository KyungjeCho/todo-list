import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';
import { useAppFocusRefresh } from 'src/features/todo/useAppFocusRefresh';
import * as getCurrentDateModule from 'src/features/todo/getCurrentDate';

describe('useAppFocusRefresh', () => {
  let appStateListeners: Array<(state: AppStateStatus) => void>;
  let mockRefresh: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    appStateListeners = [];
    mockRefresh = jest.fn();

    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(
        (
          _type: string,
          listener: (state: AppStateStatus) => void,
        ): NativeEventSubscription => {
          appStateListeners.push(listener);
          return { remove: jest.fn() };
        },
      );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function simulateAppStateChange(state: AppStateStatus): void {
    for (const listener of appStateListeners) {
      listener(state);
    }
  }

  describe('앱 포커스 복귀 시 데이터 새로고침', () => {
    it('AppState 리스너를 등록한다', () => {
      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('백그라운드에서 포그라운드로 복귀 시 onRefresh를 호출한다', () => {
      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      act(() => {
        simulateAppStateChange('background');
      });
      act(() => {
        simulateAppStateChange('active');
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('inactive에서 active로 전환 시에도 onRefresh를 호출한다', () => {
      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      act(() => {
        simulateAppStateChange('inactive');
      });
      act(() => {
        simulateAppStateChange('active');
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('이미 active 상태에서 active로 변경 시 onRefresh를 호출하지 않는다', () => {
      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      act(() => {
        simulateAppStateChange('active');
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('언마운트 시 AppState 리스너를 제거한다', () => {
      const mockRemove = jest.fn();
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation(
          (
            _type: string,
            listener: (state: AppStateStatus) => void,
          ): NativeEventSubscription => {
            appStateListeners.push(listener);
            return { remove: mockRemove };
          },
        );

      const { unmount } = renderHook(() =>
        useAppFocusRefresh({ onRefresh: mockRefresh }),
      );

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('포그라운드 자정 경과 시 자동 갱신', () => {
    it('자정을 넘기면 onRefresh를 호출한다', () => {
      const spy = jest.spyOn(getCurrentDateModule, 'getCurrentDate');
      spy.mockReturnValue('2026-03-30');

      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      spy.mockReturnValue('2026-03-31');
      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('자정을 넘기지 않으면 자동 갱신이 발생하지 않는다', () => {
      const spy = jest.spyOn(getCurrentDateModule, 'getCurrentDate');
      spy.mockReturnValue('2026-03-30');

      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('백그라운드 복귀 후 자정이 지났으면 onRefresh를 호출한다', () => {
      const spy = jest.spyOn(getCurrentDateModule, 'getCurrentDate');
      spy.mockReturnValue('2026-03-30');

      renderHook(() => useAppFocusRefresh({ onRefresh: mockRefresh }));

      act(() => {
        simulateAppStateChange('background');
      });

      spy.mockReturnValue('2026-03-31');
      act(() => {
        simulateAppStateChange('active');
      });

      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
