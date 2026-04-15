import { render, fireEvent, screen } from '@testing-library/react-native';
import { OAuthProviderButton } from 'src/components/auth/OAuthProviderButton';

// WHY: jest에서 require로 불러오는 PNG는 실제 바이너리가 없어 number 핸들로 반환된다.
//      테스트에서는 ImageSourcePropType와 호환되는 객체 형태로 mock한다.
const mockIconSource = { uri: 'mock://google.png' } as const;

describe('OAuthProviderButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('iconSource가 주어지면 Image가 렌더된다', () => {
    render(
      <OAuthProviderButton
        provider="google"
        label="Google로 계속하기"
        iconSource={mockIconSource}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId('oauth-icon-google')).toBeTruthy();
  });

  it('iconSource가 없으면 텍스트-only로 폴백된다 (FR-010)', () => {
    render(
      <OAuthProviderButton
        provider="apple"
        label="Apple로 계속하기"
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('oauth-icon-apple')).toBeNull();
    expect(screen.getByText('Apple로 계속하기')).toBeTruthy();
  });

  it('Image.onError 발생 시 아이콘이 제거되고 텍스트는 유지된다 (FR-010)', () => {
    render(
      <OAuthProviderButton
        provider="kakao"
        label="카카오로 계속하기"
        iconSource={mockIconSource}
        onPress={jest.fn()}
      />,
    );
    const icon = screen.getByTestId('oauth-icon-kakao');
    fireEvent(icon, 'error', { nativeEvent: { error: 'load-failed' } });
    expect(screen.queryByTestId('oauth-icon-kakao')).toBeNull();
    expect(screen.getByText('카카오로 계속하기')).toBeTruthy();
  });

  it('onPress 콜백이 탭 시 호출된다', () => {
    const onPress = jest.fn();
    render(
      <OAuthProviderButton
        provider="naver"
        label="네이버로 계속하기"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId('login-button-naver'));
    expect(onPress).toHaveBeenCalled();
  });
});
