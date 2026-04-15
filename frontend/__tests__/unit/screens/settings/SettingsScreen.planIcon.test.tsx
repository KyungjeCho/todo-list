import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from '@testing-library/react-native';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import type { UserProfile } from 'src/types/user';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const baseProfile: UserProfile = {
  id: 'u-1',
  userName: '테스트',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

describe('SettingsScreen — 계획알림 아이콘 상태 동기화 (FR-005~007)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('초기 ON 상태에서 아이콘 accessibilityLabel === "계획알림 활성"', () => {
    render(
      <SettingsScreen
        profile={baseProfile}
        onUpdateSettings={jest.fn().mockResolvedValue(baseProfile)}
      />,
    );
    expect(screen.getByLabelText('계획알림 활성')).toBeTruthy();
  });

  it('초기 OFF 상태(planTime === null)에서 마운트 즉시 비활성 아이콘이 렌더된다 (FR-006)', () => {
    // WHY(FR-006): 앱 재시작/화면 재진입 시 저장된 값이 즉시 아이콘에 반영되어야 한다.
    render(
      <SettingsScreen
        profile={{ ...baseProfile, planTime: null }}
        onUpdateSettings={jest.fn().mockResolvedValue(baseProfile)}
      />,
    );
    expect(screen.getByLabelText('계획알림 비활성')).toBeTruthy();
  });

  it('토글 OFF 시 아이콘이 비활성 변형으로 전환된다 (FR-005)', async () => {
    const updatedProfile = { ...baseProfile, planTime: null };
    const onUpdate = jest.fn().mockResolvedValue(updatedProfile);
    const { rerender } = render(
      <SettingsScreen profile={baseProfile} onUpdateSettings={onUpdate} />,
    );

    const toggle = screen.getByTestId('plan-notification-toggle');
    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    // optimistic: 즉시 비활성 아이콘이 보여야 함
    expect(screen.getByLabelText('계획알림 비활성')).toBeTruthy();

    // 서버 성공 후 profile 갱신된 상태로 재렌더(실서비스에서 useAuthStore가 갱신)
    rerender(
      <SettingsScreen profile={updatedProfile} onUpdateSettings={onUpdate} />,
    );
    expect(screen.getByLabelText('계획알림 비활성')).toBeTruthy();
  });

  it('저장 실패 시 이전 상태로 롤백된다 (FR-007)', async () => {
    const onUpdate = jest.fn().mockRejectedValue(new Error('500'));
    render(
      <SettingsScreen profile={baseProfile} onUpdateSettings={onUpdate} />,
    );

    const toggle = screen.getByTestId('plan-notification-toggle');
    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('계획알림 활성')).toBeTruthy();
    });
  });
});
