import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import { useSoundStore } from 'src/store/soundStore';
import type { UserProfile } from 'src/types/user';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockUpdateSettings = jest.fn();

const mockProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

describe('SettingsScreen — 버튼 클릭음 토글 (US2)', () => {
  beforeEach(() => {
    useSoundStore.setState({ enabled: true, hydrated: true });
    jest.clearAllMocks();
  });

  it('토글(button-sound-toggle)을 렌더링한다', () => {
    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('button-sound-toggle')).toBeTruthy();
  });

  it('초기 value는 useSoundStore.enabled를 반영한다', () => {
    useSoundStore.setState({ enabled: false, hydrated: true });

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    const toggle = screen.getByTestId('button-sound-toggle');
    expect(toggle.props.value).toBe(false);
  });

  it('토글 ON → OFF로 바꾸면 setEnabled(false)가 호출된다', () => {
    const setEnabledSpy = jest
      .spyOn(useSoundStore.getState(), 'setEnabled')
      .mockResolvedValue(undefined);

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    const toggle = screen.getByTestId('button-sound-toggle');
    fireEvent(toggle, 'valueChange', false);

    expect(setEnabledSpy).toHaveBeenCalledWith(false);
  });

  it('외부에서 store.enabled가 바뀌면 토글 value도 재렌더된다', () => {
    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('button-sound-toggle').props.value).toBe(true);

    act(() => {
      useSoundStore.setState({ enabled: false, hydrated: true });
    });

    expect(screen.getByTestId('button-sound-toggle').props.value).toBe(false);
  });
});
