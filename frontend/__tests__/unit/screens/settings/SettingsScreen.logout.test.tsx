import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import type { UserProfile } from 'src/types/user';

const mockUpdateSettings = jest.fn();
const mockLogout = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

const alertSpy = jest.spyOn(Alert, 'alert');

const baseProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

describe('SettingsScreen 로그아웃', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onLogout prop이 있으면 로그아웃 버튼을 렌더링한다', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={mockUpdateSettings}
        onLogout={mockLogout}
      />,
    );

    expect(screen.getByTestId('logout-button')).toBeTruthy();
  });

  it('onLogout prop이 없으면 로그아웃 버튼이 표시되지 않는다', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.queryByTestId('logout-button')).toBeNull();
  });

  it('로그아웃 버튼을 누르면 확인 Alert가 표시된다', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={mockUpdateSettings}
        onLogout={mockLogout}
      />,
    );

    fireEvent.press(screen.getByTestId('logout-button'));

    expect(alertSpy).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('Alert에서 확인을 누르면 onLogout이 호출된다', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={mockUpdateSettings}
        onLogout={mockLogout}
      />,
    );

    fireEvent.press(screen.getByTestId('logout-button'));

    // Alert.alert(title, message, buttons) — 마지막 인자의 destructive 버튼을 호출
    const buttons = alertSpy.mock.calls[0][2];
    expect(buttons).toBeDefined();
    const confirmButton = buttons!.find((b) => b.style === 'destructive');
    expect(confirmButton).toBeDefined();
    confirmButton!.onPress?.();

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('Alert에서 취소를 누르면 onLogout이 호출되지 않는다', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={mockUpdateSettings}
        onLogout={mockLogout}
      />,
    );

    fireEvent.press(screen.getByTestId('logout-button'));

    const buttons = alertSpy.mock.calls[0][2];
    const cancelButton = buttons!.find((b) => b.style === 'cancel');
    cancelButton?.onPress?.();

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
