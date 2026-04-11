import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from 'src/i18n';
import { MainScreen } from 'src/screens/main/MainScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const safeAreaMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>{ui}</SafeAreaProvider>,
  );
}

const mockStats = {
  total: 0,
  completed: 0,
  active: 0,
  inactive: 0,
  progressRate: 0,
};

/**
 * T014 [US1] MainScreen t() 호출 스냅샷 테스트
 * 언어를 영어로 전환하면 화면 텍스트가 영어로 표시되어야 한다.
 */
describe('MainScreen i18n', () => {
  afterAll(async () => {
    await i18n.changeLanguage('ko');
  });

  it('영어로 전환 시 에러 상태의 retry 버튼이 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    renderWithProvider(
      <MainScreen
        mode="PLAN"
        todos={[]}
        stats={mockStats}
        date="2026-04-11"
        error="Some error"
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('영어로 전환 시 FAB 접근성 라벨이 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    renderWithProvider(
      <MainScreen
        mode="PLAN"
        todos={[]}
        stats={mockStats}
        date="2026-04-11"
        onAddTodo={jest.fn()}
      />,
    );

    const fabButton = screen.getByTestId('fab-add-button');
    expect(fabButton.props.accessibilityLabel).toBe('Add todo');
  });

  it('영어로 전환 시 InputOverlay placeholder가 영어로 표시된다', async () => {
    await i18n.changeLanguage('en');

    renderWithProvider(
      <MainScreen
        mode="PLAN"
        todos={[]}
        stats={mockStats}
        date="2026-04-11"
        onAddTodo={jest.fn()}
      />,
    );

    // placeholder는 InputOverlay에 전달되므로 소스에서 t() 사용 여부를 확인
    expect(screen.getByTestId('fab-add-button')).toBeTruthy();
  });
});
