import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import type { UserProfile } from 'src/types/user';

const mockUpdateSettings = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const mockProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko-KR',
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('설정 화면이 렌더링된다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      expect(screen.getByTestId('settings-screen')).toBeTruthy();
    });

    it('현재 계획 시간을 표시한다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      expect(screen.getByTestId('plan-time-value')).toBeTruthy();
      expect(screen.getByText('08:00')).toBeTruthy();
    });

    it('현재 회고 시간을 표시한다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      expect(screen.getByTestId('review-time-value')).toBeTruthy();
      expect(screen.getByText('22:00')).toBeTruthy();
    });

    it('현재 타임존을 표시한다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      expect(screen.getByTestId('timezone-value')).toBeTruthy();
      expect(screen.getByText('Seoul')).toBeTruthy();
    });
  });

  describe('계획 시간 변경', () => {
    it('계획 시간 영역을 탭하면 시간 선택 UI가 나타난다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent.press(screen.getByTestId('plan-time-button'));

      expect(screen.getByTestId('time-picker')).toBeTruthy();
    });

    it('계획 시간을 변경하면 onUpdateSettings가 호출된다', async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        planTime: '09:00',
      });

      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent.press(screen.getByTestId('plan-time-button'));
      fireEvent(screen.getByTestId('time-picker'), 'onChange', {
        type: 'set',
        nativeEvent: { timestamp: new Date('2026-03-28T09:00:00').getTime() },
      });

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ planTime: '09:00' }),
        );
      });
    });
  });

  describe('회고 시간 변경', () => {
    it('회고 시간을 변경하면 onUpdateSettings가 호출된다', async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        reviewTime: '21:00',
      });

      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent.press(screen.getByTestId('review-time-button'));
      fireEvent(screen.getByTestId('time-picker'), 'onChange', {
        type: 'set',
        nativeEvent: { timestamp: new Date('2026-03-28T21:00:00').getTime() },
      });

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ reviewTime: '21:00' }),
        );
      });
    });
  });

  describe('NULL 시 알림 해제', () => {
    it('계획 알림 해제 토글을 누르면 planTime이 null로 설정된다', async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        planTime: null,
      });

      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent(
        screen.getByTestId('plan-notification-toggle'),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ planTime: null }),
        );
      });
    });

    it('회고 알림 해제 토글을 누르면 reviewTime이 null로 설정된다', async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        reviewTime: null,
      });

      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent(
        screen.getByTestId('review-notification-toggle'),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ reviewTime: null }),
        );
      });
    });

    it('알림이 해제된 상태에서 토글을 누르면 기본 시간으로 알림이 활성화된다', async () => {
      const profileNoNotification: UserProfile = {
        ...mockProfile,
        planTime: null,
      };
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        planTime: '08:00',
      });

      render(
        <SettingsScreen
          profile={profileNoNotification}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent(
        screen.getByTestId('plan-notification-toggle'),
        'valueChange',
        true,
      );

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            planTime: expect.any(String),
          }),
        );
      });
    });
  });

  describe('타임존 선택', () => {
    it('타임존 영역을 탭하면 타임존 선택 UI가 나타난다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent.press(screen.getByTestId('timezone-button'));

      expect(screen.getByTestId('timezone-picker')).toBeTruthy();
    });

    it('타임존을 변경하면 onUpdateSettings가 호출된다', async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockProfile,
        timezone: 'America/New_York',
      });

      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
        />,
      );

      fireEvent.press(screen.getByTestId('timezone-button'));
      fireEvent.press(screen.getByText('America/New_York'));

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ timezone: 'America/New_York' }),
        );
      });
    });
  });

  describe('loading 상태', () => {
    it('loading 상태에서 로딩 인디케이터를 표시한다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
          isLoading={true}
        />,
      );

      expect(screen.getByTestId('settings-loading')).toBeTruthy();
    });
  });

  describe('error 상태', () => {
    it('에러 발생 시 에러 메시지를 표시한다', () => {
      render(
        <SettingsScreen
          profile={mockProfile}
          onUpdateSettings={mockUpdateSettings}
          error="설정 변경에 실패했습니다"
        />,
      );

      expect(screen.getByText('설정 변경에 실패했습니다')).toBeTruthy();
    });
  });
});
