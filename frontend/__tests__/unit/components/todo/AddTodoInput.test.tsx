import { render, fireEvent, screen } from '@testing-library/react-native';
import { AddTodoInput } from 'src/components/todo/AddTodoInput';

describe('AddTodoInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('"+" 버튼을 렌더링한다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      expect(screen.getByTestId('add-todo-button')).toBeTruthy();
    });

    it('입력 필드를 렌더링한다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      expect(screen.getByTestId('add-todo-input')).toBeTruthy();
    });

    it('입력 필드에 placeholder가 표시된다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      expect(screen.getByPlaceholderText(/할 일/)).toBeTruthy();
    });
  });

  describe('"+" 버튼 동작', () => {
    it('내용 입력 후 "+" 버튼 탭 시 onAdd 콜백이 호출된다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '새로운 할 일');
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).toHaveBeenCalledWith('새로운 할 일');
    });

    it('할 일 추가 후 입력 필드가 초기화된다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '새로운 할 일');
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(input.props.value).toBe('');
    });

    it('빈 입력 시 "+" 버튼 탭해도 onAdd가 호출되지 않는다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('공백만 입력 시 "+" 버튼 탭해도 onAdd가 호출되지 않는다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '   ');
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe('키보드 제출', () => {
    it('키보드 리턴 키로 할 일을 추가할 수 있다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '키보드로 추가');
      fireEvent(input, 'submitEditing');

      expect(mockOnAdd).toHaveBeenCalledWith('키보드로 추가');
    });
  });

  describe('255자 제한', () => {
    it('255자까지 입력할 수 있다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      const input = screen.getByTestId('add-todo-input');
      const text255 = 'a'.repeat(255);
      fireEvent.changeText(input, text255);

      expect(input.props.value).toBe(text255);
    });

    it('maxLength가 255로 설정되어 있다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      const input = screen.getByTestId('add-todo-input');
      expect(input.props.maxLength).toBe(255);
    });

    it('255자 입력 후 "+" 버튼 탭 시 onAdd가 호출된다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      const text255 = 'a'.repeat(255);
      fireEvent.changeText(input, text255);
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).toHaveBeenCalledWith(text255);
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 "+" 버튼이 비활성화된다', () => {
      render(<AddTodoInput onAdd={jest.fn()} isLoading={true} />);

      const button = screen.getByTestId('add-todo-button');
      expect(
        button.props.accessibilityState?.disabled ?? button.props.disabled,
      ).toBe(true);
    });

    it('로딩 중일 때 입력 필드가 비활성화된다', () => {
      render(<AddTodoInput onAdd={jest.fn()} isLoading={true} />);

      const input = screen.getByTestId('add-todo-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('trim 및 중복 제출 방지', () => {
    it('앞뒤 공백이 있는 입력은 trim 후 전달된다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '  할 일 내용  ');
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).toHaveBeenCalledWith('할 일 내용');
    });

    it('로딩 중 submitEditing 시 onAdd가 호출되지 않는다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} isLoading={true} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '로딩 중 제출');
      fireEvent(input, 'submitEditing');

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('"+" 버튼 연속 탭 시 onAdd가 한 번만 호출된다', () => {
      const mockOnAdd = jest.fn();
      render(<AddTodoInput onAdd={mockOnAdd} />);

      const input = screen.getByTestId('add-todo-input');
      fireEvent.changeText(input, '할 일');
      fireEvent.press(screen.getByTestId('add-todo-button'));
      // 두 번째 탭 — 입력이 초기화된 상태이므로 빈 문자열
      fireEvent.press(screen.getByTestId('add-todo-button'));

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('접근성', () => {
    it('"+" 버튼에 접근성 라벨이 있다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      const button = screen.getByTestId('add-todo-button');
      expect(button.props.accessibilityLabel || button.props['aria-label']).toBeTruthy();
    });

    it('입력 필드에 접근성 라벨이 있다', () => {
      render(<AddTodoInput onAdd={jest.fn()} />);

      const input = screen.getByTestId('add-todo-input');
      expect(input.props.accessibilityLabel || input.props['aria-label']).toBeTruthy();
    });
  });
});
