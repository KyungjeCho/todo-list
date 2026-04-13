import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from 'src/i18n';
import { TimezoneSelectScreen } from 'src/screens/settings/TimezoneSelectScreen';

jest.spyOn(Alert, 'alert');

const safeAreaMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>{ui}</SafeAreaProvider>,
  );
}

/**
 * T048 [US4] TimezoneSelectScreen 테스트
 * - 목록 렌더링, 현재 선택 최상단 고정, 검색 필터링, 빈 결과, 선택/goBack, 실패 시 토스트
 */
describe('TimezoneSelectScreen', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    void i18n.changeLanguage('ko');
  });

  afterAll(async () => {
    await i18n.changeLanguage('ko');
  });

  it('화면이 렌더링되고 타임존 목록이 표시된다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByTestId('timezone-select-screen')).toBeTruthy();
    expect(screen.getByTestId('timezone-search')).toBeTruthy();
  });

  it('현재 선택된 타임존이 최상단(index 0)에 고정되고 ✓ 마크가 표시된다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="America/New_York"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    const firstItem = screen.getByTestId('timezone-item-0');
    expect(firstItem).toBeTruthy();
    // 첫 항목 내부에 현재 타임존 라벨과 ✓ 마크 포함
    expect(screen.getByTestId('timezone-item-0-selected')).toBeTruthy();
  });

  it('검색어 입력 시 목록이 필터링된다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.changeText(screen.getByTestId('timezone-search'), 'Tokyo');

    expect(screen.queryByText('Asia/Tokyo')).toBeTruthy();
    // 현재 선택은 항상 최상단에 남으므로 queryAll로 다른 타임존 없음 확인
    expect(screen.queryByText('America/New_York')).toBeNull();
  });

  it('검색어가 현재 선택과 매칭되지 않아도 현재 선택은 최상단에 남는다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.changeText(screen.getByTestId('timezone-search'), 'Tokyo');

    // 현재 선택(Asia/Seoul)은 검색어 "Tokyo"와 매칭되지 않지만 여전히 최상단에 고정
    expect(screen.getByTestId('timezone-item-0-selected')).toBeTruthy();
    expect(screen.queryByText('Asia/Seoul')).toBeTruthy();
    // 매칭된 Asia/Tokyo도 함께 보인다
    expect(screen.queryByText('Asia/Tokyo')).toBeTruthy();
  });

  it('✕ 초기화 버튼을 누르면 검색어가 비워진다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    const searchInput = screen.getByTestId('timezone-search');
    fireEvent.changeText(searchInput, 'Tokyo');
    expect(searchInput.props.value).toBe('Tokyo');

    fireEvent.press(screen.getByTestId('timezone-search-clear'));
    expect(searchInput.props.value).toBe('');
  });

  it('검색 결과가 없으면 noResults 메시지가 표시된다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.changeText(screen.getByTestId('timezone-search'), 'zzzzzxxxx');

    expect(screen.getByTestId('timezone-empty')).toBeTruthy();
    expect(screen.getByText('검색 결과가 없습니다')).toBeTruthy();
  });

  it('타임존 선택 시 onSelect 호출 후 onClose가 호출된다', async () => {
    mockOnSelect.mockResolvedValue(undefined);

    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.changeText(screen.getByTestId('timezone-search'), 'Tokyo');
    await act(async () => {
      fireEvent.press(screen.getByText('Asia/Tokyo'));
    });

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('Asia/Tokyo');
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('서버 저장 실패 시 에러 Alert가 표시되고 onClose는 호출되지 않는다', async () => {
    mockOnSelect.mockRejectedValue(new Error('Network error'));

    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.changeText(screen.getByTestId('timezone-search'), 'Tokyo');
    await act(async () => {
      fireEvent.press(screen.getByText('Asia/Tokyo'));
    });

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('Asia/Tokyo');
    });
    expect(Alert.alert).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('닫기 버튼을 누르면 onClose가 호출된다', () => {
    renderWithProvider(
      <TimezoneSelectScreen
        current="Asia/Seoul"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('timezone-select-close'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
