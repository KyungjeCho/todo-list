import { render, fireEvent, screen } from '@testing-library/react-native';
import { CalendarScreen } from 'src/screens/calendar/CalendarScreen';

interface DaySummary {
  date: string;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  carriedOverCount: number;
}

const mockDays: DaySummary[] = [
  {
    date: '2026-03-01',
    totalCount: 3,
    completedCount: 2,
    activeCount: 1,
    carriedOverCount: 0,
  },
  {
    date: '2026-03-05',
    totalCount: 1,
    completedCount: 1,
    activeCount: 0,
    carriedOverCount: 0,
  },
  {
    date: '2026-03-15',
    totalCount: 5,
    completedCount: 3,
    activeCount: 2,
    carriedOverCount: 0,
  },
];

const mockMonthlySummary = {
  year: 2026,
  month: 3,
  days: mockDays,
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('월별 뷰 렌더링', () => {
    it('현재 연월 표시를 렌더링한다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.getByTestId('calendar-year-month')).toBeTruthy();
    });

    it('캘린더 그리드를 렌더링한다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.getByTestId('calendar-grid')).toBeTruthy();
    });

    it('이전/다음 월 이동 버튼이 존재한다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.getByTestId('calendar-prev-month')).toBeTruthy();
      expect(screen.getByTestId('calendar-next-month')).toBeTruthy();
    });

    it('이전 월 버튼 탭 시 onMonthChange 콜백이 호출된다', () => {
      const mockOnMonthChange = jest.fn();
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          onMonthChange={mockOnMonthChange}
        />,
      );

      fireEvent.press(screen.getByTestId('calendar-prev-month'));

      expect(mockOnMonthChange).toHaveBeenCalledWith(2026, 2);
    });

    it('다음 월 버튼 탭 시 onMonthChange 콜백이 호출된다', () => {
      const mockOnMonthChange = jest.fn();
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          onMonthChange={mockOnMonthChange}
        />,
      );

      fireEvent.press(screen.getByTestId('calendar-next-month'));

      expect(mockOnMonthChange).toHaveBeenCalledWith(2026, 4);
    });
  });

  describe('날짜별 요약 표시', () => {
    it('할 일이 있는 날짜에 요약 정보가 표시된다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.getByTestId('calendar-day-2026-03-01')).toBeTruthy();
      expect(screen.getByTestId('calendar-day-2026-03-15')).toBeTruthy();
    });

    it('날짜 셀에 완료율 표시기가 렌더링된다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.getByTestId('day-indicator-2026-03-01')).toBeTruthy();
    });

    it('날짜 선택 시 onDateSelect 콜백이 호출된다', () => {
      const mockOnDateSelect = jest.fn();
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          onDateSelect={mockOnDateSelect}
        />,
      );

      fireEvent.press(screen.getByTestId('calendar-day-2026-03-01'));

      expect(mockOnDateSelect).toHaveBeenCalledWith('2026-03-01');
    });

    it('선택된 날짜에 선택 표시 스타일이 적용된다', () => {
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          selectedDate="2026-03-01"
        />,
      );

      const selectedDay = screen.getByTestId('calendar-day-2026-03-01');
      expect(selectedDay.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('빈 월 처리', () => {
    const emptyMonthlySummary = {
      year: 2026,
      month: 4,
      days: [],
    };

    it('할 일이 없는 월에도 캘린더 그리드가 렌더링된다', () => {
      render(<CalendarScreen monthlySummary={emptyMonthlySummary} />);

      expect(screen.getByTestId('calendar-grid')).toBeTruthy();
    });

    it('할 일이 없는 월에서 빈 상태 메시지를 표시한다', () => {
      render(<CalendarScreen monthlySummary={emptyMonthlySummary} />);

      expect(screen.getByTestId('calendar-empty-state')).toBeTruthy();
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(
        <CalendarScreen monthlySummary={mockMonthlySummary} isLoading={true} />,
      );

      expect(screen.getByTestId('calendar-loading-indicator')).toBeTruthy();
    });

    it('로딩 중이 아닐 때 로딩 인디케이터를 표시하지 않는다', () => {
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          isLoading={false}
        />,
      );

      expect(screen.queryByTestId('calendar-loading-indicator')).toBeNull();
    });
  });

  describe('에러 상태', () => {
    it('에러 메시지가 있을 때 에러를 표시한다', () => {
      render(
        <CalendarScreen
          monthlySummary={mockMonthlySummary}
          error="캘린더 데이터를 불러올 수 없습니다"
        />,
      );

      expect(
        screen.getByText('캘린더 데이터를 불러올 수 없습니다'),
      ).toBeTruthy();
    });

    it('에러가 없을 때 에러 메시지를 표시하지 않는다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      expect(screen.queryByTestId('calendar-error-message')).toBeNull();
    });
  });

  describe('접근성', () => {
    it('이전 월 버튼에 접근성 라벨이 있다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      const prevButton = screen.getByTestId('calendar-prev-month');
      expect(
        prevButton.props.accessibilityLabel || prevButton.props['aria-label'],
      ).toBeTruthy();
    });

    it('다음 월 버튼에 접근성 라벨이 있다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      const nextButton = screen.getByTestId('calendar-next-month');
      expect(
        nextButton.props.accessibilityLabel || nextButton.props['aria-label'],
      ).toBeTruthy();
    });

    it('날짜 셀에 접근성 라벨이 있다', () => {
      render(<CalendarScreen monthlySummary={mockMonthlySummary} />);

      const dayCell = screen.getByTestId('calendar-day-2026-03-01');
      expect(
        dayCell.props.accessibilityLabel || dayCell.props['aria-label'],
      ).toBeTruthy();
    });
  });
});
