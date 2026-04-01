import { render, fireEvent, screen } from '@testing-library/react-native';
import { LoginScreen } from 'src/screens/auth/LoginScreen';
import type { OAuthProvider } from 'src/types/user';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('4개의 소셜 로그인 버튼을 렌더링한다', () => {
      render(<LoginScreen />);

      expect(screen.getByTestId('login-button-google')).toBeTruthy();
      expect(screen.getByTestId('login-button-naver')).toBeTruthy();
      expect(screen.getByTestId('login-button-kakao')).toBeTruthy();
      expect(screen.getByTestId('login-button-apple')).toBeTruthy();
    });

    it('각 버튼에 접근성 라벨이 포함되어 있다', () => {
      render(<LoginScreen />);

      expect(screen.getByLabelText('Google로 로그인')).toBeTruthy();
      expect(screen.getByLabelText('Naver로 로그인')).toBeTruthy();
      expect(screen.getByLabelText('Kakao로 로그인')).toBeTruthy();
      expect(screen.getByLabelText('Apple로 로그인')).toBeTruthy();
    });

    it('앱 타이틀을 표시한다', () => {
      render(<LoginScreen />);

      expect(screen.getByText(/todo/i)).toBeTruthy();
    });
  });

  describe('소셜 로그인 탭 이벤트', () => {
    const providers: OAuthProvider[] = ['google', 'naver', 'kakao', 'apple'];

    it.each(providers)(
      '%s 로그인 버튼 탭 시 onLogin 콜백이 해당 provider로 호출된다',
      (provider) => {
        const mockOnLogin = jest.fn();
        render(<LoginScreen onLogin={mockOnLogin} />);

        fireEvent.press(screen.getByTestId(`login-button-${provider}`));

        expect(mockOnLogin).toHaveBeenCalledWith(provider);
      },
    );

    it.each(providers)(
      '%s 로그인 버튼 탭 시 한 번만 호출된다',
      (provider) => {
        const mockOnLogin = jest.fn();
        render(<LoginScreen onLogin={mockOnLogin} />);

        fireEvent.press(screen.getByTestId(`login-button-${provider}`));

        expect(mockOnLogin).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(<LoginScreen isLoading={true} />);

      expect(screen.getByTestId('login-loading-indicator')).toBeTruthy();
    });

    it('로딩 중일 때 로그인 버튼이 비활성화된다', () => {
      render(<LoginScreen isLoading={true} />);

      const googleButton = screen.getByTestId('login-button-google');
      expect(googleButton.props.accessibilityState?.disabled ?? googleButton.props.disabled).toBe(true);
    });

    it('로딩 중이 아닐 때 로딩 인디케이터를 표시하지 않는다', () => {
      render(<LoginScreen isLoading={false} />);

      expect(screen.queryByTestId('login-loading-indicator')).toBeNull();
    });
  });

  describe('에러 상태', () => {
    it('에러 메시지가 있을 때 에러를 표시한다', () => {
      render(<LoginScreen error="인증에 실패했습니다" />);

      expect(screen.getByText('인증에 실패했습니다')).toBeTruthy();
    });

    it('에러 메시지가 없을 때 에러를 표시하지 않는다', () => {
      render(<LoginScreen />);

      expect(screen.queryByTestId('login-error-message')).toBeNull();
    });
  });
});
