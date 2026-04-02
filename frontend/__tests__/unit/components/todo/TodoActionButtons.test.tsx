import { render, fireEvent, screen } from '@testing-library/react-native';
import { TodoActionButtons } from 'src/components/todo/TodoActionButtons';

describe('TodoActionButtons', () => {
  const defaultProps = {
    onDelete: jest.fn(),
    onDeactivate: jest.fn(),
    onAddMemo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('3개 버튼(삭제, 비활성화, 메모)이 렌더링된다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      expect(screen.getByTestId('action-delete-button')).toBeTruthy();
      expect(screen.getByTestId('action-deactivate-button')).toBeTruthy();
      expect(screen.getByTestId('action-add-memo-button')).toBeTruthy();
    });

    it('삭제 버튼에 "삭제" 텍스트가 표시된다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      expect(screen.getByText('삭제')).toBeTruthy();
    });

    it('비활성화 버튼에 "비활성화" 텍스트가 표시된다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      expect(screen.getByText('비활성화')).toBeTruthy();
    });

    it('메모 추가 버튼에 "+ 메모" 텍스트가 표시된다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      expect(screen.getByText('+ 메모')).toBeTruthy();
    });
  });

  describe('스타일 검증', () => {
    it('버튼 컨테이너에 paddingLeft 55px이 적용된다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const container = screen.getByTestId('action-buttons-container');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flatStyle.paddingLeft).toBe(55);
    });

    it('삭제 버튼의 텍스트 색상이 error(#EF4444)이다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const deleteText = screen.getByText('삭제');
      const flatStyle = Array.isArray(deleteText.props.style)
        ? Object.assign({}, ...deleteText.props.style)
        : deleteText.props.style;
      expect(flatStyle.color).toBe('#EF4444');
    });

    it('비활성화 버튼의 텍스트 색상이 secondaryText(#64748B)이다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const deactivateText = screen.getByText('비활성화');
      const flatStyle = Array.isArray(deactivateText.props.style)
        ? Object.assign({}, ...deactivateText.props.style)
        : deactivateText.props.style;
      expect(flatStyle.color).toBe('#64748B');
    });

    it('메모 추가 버튼의 텍스트 색상이 primary(#6366F1)이다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const memoText = screen.getByText('+ 메모');
      const flatStyle = Array.isArray(memoText.props.style)
        ? Object.assign({}, ...memoText.props.style)
        : memoText.props.style;
      expect(flatStyle.color).toBe('#6366F1');
    });
  });

  describe('콜백 호출', () => {
    it('삭제 버튼 탭 시 onDelete가 호출된다', () => {
      const onDelete = jest.fn();
      render(<TodoActionButtons {...defaultProps} onDelete={onDelete} />);

      fireEvent.press(screen.getByTestId('action-delete-button'));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('비활성화 버튼 탭 시 onDeactivate가 호출된다', () => {
      const onDeactivate = jest.fn();
      render(
        <TodoActionButtons {...defaultProps} onDeactivate={onDeactivate} />,
      );

      fireEvent.press(screen.getByTestId('action-deactivate-button'));

      expect(onDeactivate).toHaveBeenCalledTimes(1);
    });

    it('메모 추가 버튼 탭 시 onAddMemo가 호출된다', () => {
      const onAddMemo = jest.fn();
      render(<TodoActionButtons {...defaultProps} onAddMemo={onAddMemo} />);

      fireEvent.press(screen.getByTestId('action-add-memo-button'));

      expect(onAddMemo).toHaveBeenCalledTimes(1);
    });
  });

  describe('접근성', () => {
    it('삭제 버튼에 접근성 라벨이 있다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const btn = screen.getByTestId('action-delete-button');
      expect(
        btn.props.accessibilityLabel || btn.props['aria-label'],
      ).toBeTruthy();
    });

    it('비활성화 버튼에 접근성 라벨이 있다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const btn = screen.getByTestId('action-deactivate-button');
      expect(
        btn.props.accessibilityLabel || btn.props['aria-label'],
      ).toBeTruthy();
    });

    it('메모 추가 버튼에 접근성 라벨이 있다', () => {
      render(<TodoActionButtons {...defaultProps} />);

      const btn = screen.getByTestId('action-add-memo-button');
      expect(
        btn.props.accessibilityLabel || btn.props['aria-label'],
      ).toBeTruthy();
    });
  });
});
