import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from 'src/features/common/useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('setTimeout', () => {
    it('should call callback after delay', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useTimer());

      act(() => {
        result.current.setTimeout(callback, 1000);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear previous timeout when called again', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const { result } = renderHook(() => useTimer());

      act(() => {
        result.current.setTimeout(callback1, 1000);
      });

      act(() => {
        result.current.setTimeout(callback2, 1000);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should cleanup on unmount', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useTimer());

      act(() => {
        result.current.setTimeout(callback, 1000);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('setInterval', () => {
    it('should call callback repeatedly', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useTimer());

      act(() => {
        result.current.setInterval(callback, 500);
      });

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should cleanup on unmount', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useTimer());

      act(() => {
        result.current.setInterval(callback, 500);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should cancel pending timeout', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useTimer());

      act(() => {
        result.current.setTimeout(callback, 1000);
      });

      act(() => {
        result.current.clear();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
