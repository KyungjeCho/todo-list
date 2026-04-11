import { render, screen } from '@testing-library/react-native';
import i18n from 'src/i18n';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import type { UserProfile } from 'src/types/user';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

const mockProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
};

const mockUpdateSettings = jest.fn();

/**
 * T013 [US1] SettingsScreen t() 호출 스냅샷 테스트
 * 언어를 영어로 전환하면 화면 텍스트가 영어로 표시되어야 한다.
 * 하드코딩 한국어가 남아있으면 이 테스트는 실패한다.
 */
describe('SettingsScreen i18n', () => {
  afterAll(async () => {
    await i18n.changeLanguage('ko');
  });

  it('영어로 전환 시 섹션 제목이 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Notification Settings')).toBeTruthy();
    expect(screen.getByText('Region Settings')).toBeTruthy();
    expect(screen.getByText('Information')).toBeTruthy();
  });

  it('영어로 전환 시 알림 라벨이 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByText('Plan Notification')).toBeTruthy();
    expect(screen.getByText('Review Notification')).toBeTruthy();
  });

  it('영어로 전환 시 정보 섹션 항목이 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByText('Timezone')).toBeTruthy();
    expect(screen.getByText('Open Source License')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Contact')).toBeTruthy();
  });

  it('알림 해제 시 disabled 텍스트가 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    const profileDisabled: UserProfile = {
      ...mockProfile,
      planTime: null,
    };

    render(
      <SettingsScreen
        profile={profileDisabled}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByText('Disabled')).toBeTruthy();
  });

  it('한국어로 전환 시 한국어로 표시된다', async () => {
    await i18n.changeLanguage('ko');

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByText('설정')).toBeTruthy();
    expect(screen.getByText('알림 설정')).toBeTruthy();
  });
});
