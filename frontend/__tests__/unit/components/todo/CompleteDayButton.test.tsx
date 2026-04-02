import { render, fireEvent, screen } from '@testing-library/react-native';
import { CompleteDayButton } from 'src/components/todo/CompleteDayButton';

const mockOnComplete = jest.fn();

describe('CompleteDayButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('"오늘의 일정 완료" 버튼을 렌더링한다', () => {
      render(<CompleteDayButton onComplete={mockOnComplete} />);

      expect(screen.getByTestId('complete-day-button')).toBeTruthy();
    });

    it('버튼 텍스트를 표시한다', () => {
      render(<CompleteDayButton onComplete={mockOnComplete} />);

      expect(screen.getByText(/일정 완료/)).toBeTruthy();
    });
  });

  describe('일정 완료 API 호출', () => {
    it('버튼 탭 시 onComplete 콜백이 호출된다', () => {
      render(<CompleteDayButton onComplete={mockOnComplete} />);

      fireEvent.press(screen.getByTestId('complete-day-button'));

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(
        <CompleteDayButton onComplete={mockOnComplete} isLoading={true} />,
      );

      expect(screen.getByTestId('complete-day-loading')).toBeTruthy();
    });

    it('로딩 중일 때 버튼이 비활성화된다', () => {
      render(
        <CompleteDayButton onComplete={mockOnComplete} isLoading={true} />,
      );

      fireEvent.press(screen.getByTestId('complete-day-button'));

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('이월 결과 표시', () => {
    const carriedOverResult = {
      carriedOverCount: 2,
      carriedOverTodos: [
        { fromTodoId: 'from-1', toTodoId: 'to-1', content: '이월 항목 1' },
        { fromTodoId: 'from-2', toTodoId: 'to-2', content: '이월 항목 2' },
      ],
    };

    it('이월 결과가 있을 때 이월 정보를 표시한다', () => {
      render(
        <CompleteDayButton
          onComplete={mockOnComplete}
          carriedOverResult={carriedOverResult}
        />,
      );

      expect(screen.getByTestId('carried-over-result')).toBeTruthy();
    });

    it('이월된 항목 수를 표시한다', () => {
      render(
        <CompleteDayButton
          onComplete={mockOnComplete}
          carriedOverResult={carriedOverResult}
        />,
      );

      expect(screen.getByText(/2/)).toBeTruthy();
    });

    it('이월된 항목 내용을 표시한다', () => {
      render(
        <CompleteDayButton
          onComplete={mockOnComplete}
          carriedOverResult={carriedOverResult}
        />,
      );

      expect(screen.getByText('이월 항목 1')).toBeTruthy();
      expect(screen.getByText('이월 항목 2')).toBeTruthy();
    });

    it('이월 결과가 없을 때(0건) 이월 정보를 표시하지 않는다', () => {
      const noCarryOver = { carriedOverCount: 0, carriedOverTodos: [] };

      render(
        <CompleteDayButton
          onComplete={mockOnComplete}
          carriedOverResult={noCarryOver}
        />,
      );

      expect(screen.queryByTestId('carried-over-result')).toBeNull();
    });
  });

  describe('중복 완료 방지', () => {
    it('이미 완료된 상태이면 버튼이 비활성화된다', () => {
      render(
        <CompleteDayButton onComplete={mockOnComplete} isCompleted={true} />,
      );

      fireEvent.press(screen.getByTestId('complete-day-button'));

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('이미 완료된 상태이면 완료 안내 텍스트를 표시한다', () => {
      render(
        <CompleteDayButton onComplete={mockOnComplete} isCompleted={true} />,
      );

      expect(screen.getByTestId('already-completed-text')).toBeTruthy();
    });

    it('에러 발생 시 에러 메시지를 표시한다', () => {
      render(
        <CompleteDayButton
          onComplete={mockOnComplete}
          error="이미 완료된 날짜입니다"
        />,
      );

      expect(screen.getByText('이미 완료된 날짜입니다')).toBeTruthy();
    });
  });

  describe('접근성', () => {
    it('버튼에 접근성 라벨이 있다', () => {
      render(<CompleteDayButton onComplete={mockOnComplete} />);

      const button = screen.getByTestId('complete-day-button');
      expect(
        button.props.accessibilityLabel || button.props['aria-label'],
      ).toBeTruthy();
    });

    it('비활성화 상태에서 접근성 상태가 반영된다', () => {
      render(
        <CompleteDayButton onComplete={mockOnComplete} isCompleted={true} />,
      );

      const button = screen.getByTestId('complete-day-button');
      expect(
        button.props.accessibilityState?.disabled ?? button.props.disabled,
      ).toBe(true);
    });
  });
});
