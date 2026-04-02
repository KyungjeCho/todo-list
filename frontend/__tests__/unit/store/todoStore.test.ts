import { useTodoStore } from 'src/store/todoStore';
import type { Todo, TodoMemo } from 'src/types/todo';

describe('TodoStore', () => {
  const mockTodo: Todo = {
    id: 'todo-uuid-1',
    todoDate: '2026-03-28',
    content: '프로젝트 회의 준비',
    status: 'ACTIVE',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-28T09:00:00.000Z',
    updatedAt: '2026-03-28T09:00:00.000Z',
  };

  const mockTodo2: Todo = {
    id: 'todo-uuid-2',
    todoDate: '2026-03-28',
    content: '코드 리뷰',
    status: 'ACTIVE',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-28T10:00:00.000Z',
    updatedAt: '2026-03-28T10:00:00.000Z',
  };

  const mockMemo: TodoMemo = {
    id: 'memo-uuid-1',
    todoId: 'todo-uuid-1',
    content: '발표 자료 확인',
    createdAt: '2026-03-28T09:30:00.000Z',
    updatedAt: '2026-03-28T09:30:00.000Z',
  };

  beforeEach(() => {
    useTodoStore.setState({
      todos: [],
      selectedDate: '2026-03-28',
      memos: {},
      isLoading: false,
      error: null,
    });
  });

  describe('초기 상태', () => {
    it('todos가 빈 배열이다', () => {
      expect(useTodoStore.getState().todos).toEqual([]);
    });

    it('selectedDate가 오늘 날짜이다', () => {
      expect(useTodoStore.getState().selectedDate).toBe('2026-03-28');
    });

    it('memos가 빈 객체이다', () => {
      expect(useTodoStore.getState().memos).toEqual({});
    });

    it('isLoading이 false이다', () => {
      expect(useTodoStore.getState().isLoading).toBe(false);
    });

    it('error가 null이다', () => {
      expect(useTodoStore.getState().error).toBeNull();
    });
  });

  describe('setTodos', () => {
    it('할 일 목록을 설정한다', () => {
      useTodoStore.getState().setTodos([mockTodo, mockTodo2]);

      expect(useTodoStore.getState().todos).toEqual([mockTodo, mockTodo2]);
    });

    it('기존 목록을 완전히 교체한다', () => {
      useTodoStore.getState().setTodos([mockTodo]);
      useTodoStore.getState().setTodos([mockTodo2]);

      expect(useTodoStore.getState().todos).toEqual([mockTodo2]);
    });

    it('빈 배열로 설정할 수 있다', () => {
      useTodoStore.getState().setTodos([mockTodo]);
      useTodoStore.getState().setTodos([]);

      expect(useTodoStore.getState().todos).toEqual([]);
    });
  });

  describe('addTodo', () => {
    it('새로운 할 일을 목록에 추가한다', () => {
      useTodoStore.getState().addTodo(mockTodo);

      expect(useTodoStore.getState().todos).toHaveLength(1);
      expect(useTodoStore.getState().todos[0]).toEqual(mockTodo);
    });

    it('기존 목록 끝에 추가한다', () => {
      useTodoStore.getState().addTodo(mockTodo);
      useTodoStore.getState().addTodo(mockTodo2);

      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(2);
      expect(todos[0].id).toBe('todo-uuid-1');
      expect(todos[1].id).toBe('todo-uuid-2');
    });
  });

  describe('updateTodo', () => {
    beforeEach(() => {
      useTodoStore.getState().setTodos([mockTodo, mockTodo2]);
    });

    it('특정 할 일의 content를 수정한다', () => {
      useTodoStore
        .getState()
        .updateTodo('todo-uuid-1', { content: '수정된 내용' });

      const updated = useTodoStore
        .getState()
        .todos.find((t) => t.id === 'todo-uuid-1');
      expect(updated?.content).toBe('수정된 내용');
    });

    it('특정 할 일의 status를 변경한다', () => {
      useTodoStore
        .getState()
        .updateTodo('todo-uuid-1', { status: 'COMPLETED' });

      const updated = useTodoStore
        .getState()
        .todos.find((t) => t.id === 'todo-uuid-1');
      expect(updated?.status).toBe('COMPLETED');
    });

    it('다른 할 일에 영향을 주지 않는다', () => {
      useTodoStore.getState().updateTodo('todo-uuid-1', { content: '수정됨' });

      const other = useTodoStore
        .getState()
        .todos.find((t) => t.id === 'todo-uuid-2');
      expect(other?.content).toBe('코드 리뷰');
    });

    it('존재하지 않는 ID로 호출하면 목록이 변경되지 않는다', () => {
      const before = useTodoStore.getState().todos;
      useTodoStore
        .getState()
        .updateTodo('non-existent', { content: '없는 항목' });

      expect(useTodoStore.getState().todos).toEqual(before);
    });

    it('여러 필드를 동시에 업데이트할 수 있다 (옵티미스틱 업데이트)', () => {
      useTodoStore.getState().updateTodo('todo-uuid-1', {
        content: '수정된 내용',
        status: 'COMPLETED',
      });

      const updated = useTodoStore
        .getState()
        .todos.find((t) => t.id === 'todo-uuid-1');
      expect(updated?.content).toBe('수정된 내용');
      expect(updated?.status).toBe('COMPLETED');
    });
  });

  describe('removeTodo', () => {
    beforeEach(() => {
      useTodoStore.getState().setTodos([mockTodo, mockTodo2]);
    });

    it('특정 할 일을 목록에서 제거한다', () => {
      useTodoStore.getState().removeTodo('todo-uuid-1');

      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(1);
      expect(todos[0].id).toBe('todo-uuid-2');
    });

    it('존재하지 않는 ID로 호출하면 목록이 변경되지 않는다', () => {
      useTodoStore.getState().removeTodo('non-existent');

      expect(useTodoStore.getState().todos).toHaveLength(2);
    });

    it('마지막 항목을 제거하면 빈 배열이 된다', () => {
      useTodoStore.getState().setTodos([mockTodo]);
      useTodoStore.getState().removeTodo('todo-uuid-1');

      expect(useTodoStore.getState().todos).toEqual([]);
    });
  });

  describe('setSelectedDate', () => {
    it('선택된 날짜를 변경한다', () => {
      useTodoStore.getState().setSelectedDate('2026-04-01');

      expect(useTodoStore.getState().selectedDate).toBe('2026-04-01');
    });
  });

  describe('setMemos', () => {
    it('특정 할 일의 메모를 설정한다', () => {
      useTodoStore.getState().setMemos('todo-uuid-1', [mockMemo]);

      expect(useTodoStore.getState().memos['todo-uuid-1']).toEqual([mockMemo]);
    });

    it('다른 할 일의 메모에 영향을 주지 않는다', () => {
      const otherMemo: TodoMemo = {
        id: 'memo-uuid-2',
        todoId: 'todo-uuid-2',
        content: '다른 메모',
        createdAt: '2026-03-28T10:00:00.000Z',
        updatedAt: '2026-03-28T10:00:00.000Z',
      };

      useTodoStore.getState().setMemos('todo-uuid-1', [mockMemo]);
      useTodoStore.getState().setMemos('todo-uuid-2', [otherMemo]);

      expect(useTodoStore.getState().memos['todo-uuid-1']).toEqual([mockMemo]);
      expect(useTodoStore.getState().memos['todo-uuid-2']).toEqual([otherMemo]);
    });
  });

  describe('setLoading / setError', () => {
    it('로딩 상태를 설정한다', () => {
      useTodoStore.getState().setLoading(true);

      expect(useTodoStore.getState().isLoading).toBe(true);
    });

    it('에러 메시지를 설정한다', () => {
      useTodoStore.getState().setError('네트워크 에러');

      expect(useTodoStore.getState().error).toBe('네트워크 에러');
    });

    it('에러를 null로 초기화한다', () => {
      useTodoStore.getState().setError('에러');
      useTodoStore.getState().setError(null);

      expect(useTodoStore.getState().error).toBeNull();
    });
  });

  describe('상태 전이 시나리오', () => {
    it('ACTIVE → COMPLETED 상태 전이', () => {
      useTodoStore.getState().addTodo(mockTodo);
      useTodoStore
        .getState()
        .updateTodo('todo-uuid-1', { status: 'COMPLETED' });

      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe('COMPLETED');
    });

    it('ACTIVE → INACTIVE 상태 전이', () => {
      useTodoStore.getState().addTodo(mockTodo);
      useTodoStore.getState().updateTodo('todo-uuid-1', { status: 'INACTIVE' });

      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe('INACTIVE');
    });

    it('INACTIVE → ACTIVE 재활성화', () => {
      const inactiveTodo: Todo = { ...mockTodo, status: 'INACTIVE' };
      useTodoStore.getState().addTodo(inactiveTodo);
      useTodoStore.getState().updateTodo('todo-uuid-1', { status: 'ACTIVE' });

      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe('ACTIVE');
    });

    it('COMPLETED → ACTIVE 완료 취소', () => {
      const completedTodo: Todo = { ...mockTodo, status: 'COMPLETED' };
      useTodoStore.getState().addTodo(completedTodo);
      useTodoStore.getState().updateTodo('todo-uuid-1', { status: 'ACTIVE' });

      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe('ACTIVE');
    });
  });

  describe('state 조작 롤백 시뮬레이션', () => {
    it('할 일 추가 후 제거하면 빈 배열로 돌아간다', () => {
      useTodoStore.getState().addTodo(mockTodo);
      expect(useTodoStore.getState().todos).toHaveLength(1);

      useTodoStore.getState().removeTodo(mockTodo.id);
      expect(useTodoStore.getState().todos).toHaveLength(0);
    });

    it('할 일 상태 변경 후 원래 상태로 되돌릴 수 있다', () => {
      useTodoStore.getState().addTodo(mockTodo);

      useTodoStore
        .getState()
        .updateTodo('todo-uuid-1', { status: 'COMPLETED' });
      expect(useTodoStore.getState().todos[0].status).toBe('COMPLETED');

      useTodoStore.getState().updateTodo('todo-uuid-1', { status: 'ACTIVE' });
      expect(useTodoStore.getState().todos[0].status).toBe('ACTIVE');
    });

    it('할 일 삭제 후 재추가하면 원래 데이터가 복원된다', () => {
      useTodoStore.getState().addTodo(mockTodo);
      const savedTodo = useTodoStore.getState().todos[0];

      useTodoStore.getState().removeTodo('todo-uuid-1');
      expect(useTodoStore.getState().todos).toHaveLength(0);

      useTodoStore.getState().addTodo(savedTodo);
      expect(useTodoStore.getState().todos).toHaveLength(1);
      expect(useTodoStore.getState().todos[0]).toEqual(savedTodo);
    });
  });

  describe('날짜 변경 시 상태 리셋', () => {
    it('selectedDate 변경 시 todos가 빈 배열로 리셋된다', () => {
      useTodoStore.getState().addTodo(mockTodo);

      useTodoStore.getState().setSelectedDate('2026-04-01');

      expect(useTodoStore.getState().selectedDate).toBe('2026-04-01');
      expect(useTodoStore.getState().todos).toEqual([]);
    });

    it('selectedDate 변경 시 isLoading이 false로 리셋된다', () => {
      useTodoStore.getState().setLoading(true);

      useTodoStore.getState().setSelectedDate('2026-04-01');

      expect(useTodoStore.getState().isLoading).toBe(false);
    });

    it('selectedDate 변경 시 error가 null로 리셋된다', () => {
      useTodoStore.getState().setError('이전 에러');

      useTodoStore.getState().setSelectedDate('2026-04-01');

      expect(useTodoStore.getState().error).toBeNull();
    });
  });

  describe('중복 방지', () => {
    it('동일 id의 todo를 addTodo하면 중복 추가되지 않는다', () => {
      useTodoStore.getState().addTodo(mockTodo);
      useTodoStore.getState().addTodo(mockTodo);

      expect(useTodoStore.getState().todos).toHaveLength(1);
    });

    it('다른 id의 todo는 정상 추가된다', () => {
      useTodoStore.getState().addTodo(mockTodo);
      useTodoStore.getState().addTodo(mockTodo2);

      expect(useTodoStore.getState().todos).toHaveLength(2);
    });
  });
});
