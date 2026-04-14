import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import i18n from 'src/i18n';
import { SettingsScreen } from 'src/screens/settings/SettingsScreen';
import type { UserProfile } from 'src/types/user';

const mockUpdateSettings = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.spyOn(Alert, 'alert');

const mockProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

/**
 * T034 [US2] 언어 선택 UI 테스트
 */
describe('SettingsScreen 언어 선택', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.changeLanguage('ko');
  });

  afterAll(async () => {
    await i18n.changeLanguage('ko');
  });

  it('언어 항목이 표시되고 profile.language의 원어명이 표시된다', () => {
    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('language-button')).toBeTruthy();
    const languageValue = screen.getByTestId('language-value');
    expect(languageValue).toBeTruthy();
    expect(languageValue.props.children).toBe('한국어');
  });

  it('언어 항목을 탭하면 언어 선택 목록이 나타난다', () => {
    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    fireEvent.press(screen.getByTestId('language-button'));

    expect(screen.getByTestId('language-picker')).toBeTruthy();
  });

  it('언어 목록에 4개 언어가 원어명으로 표시된다', () => {
    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    fireEvent.press(screen.getByTestId('language-button'));

    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('日本語')).toBeTruthy();
    expect(screen.getByText('Español')).toBeTruthy();
  });

  it('언어를 선택하면 language-value가 즉시 변경되고 서버 API가 호출된다', async () => {
    mockUpdateSettings.mockResolvedValue({
      ...mockProfile,
      language: 'en',
    });

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    fireEvent.press(screen.getByTestId('language-button'));
    fireEvent.press(screen.getByText('English'));

    // language-value가 즉시 English로 변경되어야 한다 (낙관적 업데이트)
    expect(screen.getByTestId('language-value').props.children).toBe('English');
    expect(i18n.language).toBe('en');

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'en' }),
      );
    });
  });

  it('서버 저장 실패 시 language-value는 선택한 언어로 유지되고 에러 Alert가 표시된다', async () => {
    mockUpdateSettings.mockRejectedValue(new Error('Network error'));

    render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    fireEvent.press(screen.getByTestId('language-button'));
    fireEvent.press(screen.getByText('English'));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'en' }),
      );
    });

    // language-value가 English로 유지되어야 한다 (로컬 UI 유지)
    expect(screen.getByTestId('language-value').props.children).toBe('English');
    expect(i18n.language).toBe('en');

    // 에러 Alert가 표시되어야 한다
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('영어 프로필이면 i18n 전역 상태와 무관하게 English로 표시된다', () => {
    // i18n.language는 ko인 상태에서 profile만 en — props가 source of truth
    const enProfile: UserProfile = {
      ...mockProfile,
      language: 'en',
    };

    render(
      <SettingsScreen
        profile={enProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('language-value').props.children).toBe('English');
  });

  it('재시작 시 서버 저장값이 복원된다 (profile.language에 따라 표시)', () => {
    // i18n.language는 ko인 상태에서 profile만 es — props가 source of truth
    const esProfile: UserProfile = {
      ...mockProfile,
      language: 'es',
    };

    render(
      <SettingsScreen
        profile={esProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('language-value').props.children).toBe('Español');
  });

  it('외부에서 profile.language가 갱신되면 낙관적 값을 해제하고 props에 따라 표시된다', async () => {
    mockUpdateSettings.mockResolvedValue({
      ...mockProfile,
      language: 'en',
    });

    const { rerender } = render(
      <SettingsScreen
        profile={mockProfile}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('language-value').props.children).toBe('한국어');

    // 사용자가 영어를 선택 → 낙관적 업데이트
    fireEvent.press(screen.getByTestId('language-button'));
    fireEvent.press(screen.getByText('English'));
    expect(screen.getByTestId('language-value').props.children).toBe('English');

    // 부모에서 profile이 일본어로 갱신 → 낙관적 오버라이드 해제, props 반영
    rerender(
      <SettingsScreen
        profile={{ ...mockProfile, language: 'ja' }}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    expect(screen.getByTestId('language-value').props.children).toBe('日本語');
  });

  it('i18n 전역이 다른 값이어도 profile.language만으로 올바르게 표시된다', async () => {
    // i18n.language를 ja로 설정하지만 profile은 es
    await i18n.changeLanguage('ja');

    render(
      <SettingsScreen
        profile={{ ...mockProfile, language: 'es' }}
        onUpdateSettings={mockUpdateSettings}
      />,
    );

    // props가 source of truth이므로 Español 표시
    expect(screen.getByTestId('language-value').props.children).toBe('Español');
  });
});
