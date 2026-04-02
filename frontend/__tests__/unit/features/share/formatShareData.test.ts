import {
  formatShareData,
  formatShareTitle,
} from 'src/features/share/formatShareData';
import type { Todo } from 'src/types/todo';

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    todoDate: '2026-03-31',
    content: '운동하기',
    status: 'COMPLETED',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:00:00.000Z',
  },
  {
    id: 'todo-2',
    todoDate: '2026-03-31',
    content: '장보기',
    status: 'ACTIVE',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
  },
  {
    id: 'todo-3',
    todoDate: '2026-03-31',
    content: '이월된 할 일',
    status: 'CARRIED_OVER',
    isCarriedOver: true,
    memos: [],
    createdAt: '2026-03-31T11:00:00.000Z',
    updatedAt: '2026-03-31T11:00:00.000Z',
  },
];

describe('formatShareData', () => {
  describe('텍스트 포맷 변환', () => {
    it('할 일 목록을 텍스트 형식으로 변환한다', () => {
      const result = formatShareData(mockTodos, '2026-03-31');

      expect(result).toContain('운동하기');
      expect(result).toContain('장보기');
      expect(result).toContain('이월된 할 일');
    });

    it('날짜가 포맷된 텍스트에 포함된다', () => {
      const result = formatShareData(mockTodos, '2026-03-31');

      expect(result).toContain('2026-03-31');
    });

    it('완료된 항목에 완료 표시가 포함된다', () => {
      const result = formatShareData(mockTodos, '2026-03-31');

      const lines = result.split('\n');
      const completedLine = lines.find((line: string) =>
        line.includes('운동하기'),
      );
      expect(completedLine).toBeDefined();
      expect(completedLine).toMatch(/[✓✅☑\[x\]\[X\]]/);
    });

    it('미완료 항목에 미완료 표시가 포함된다', () => {
      const result = formatShareData(mockTodos, '2026-03-31');

      const lines = result.split('\n');
      const activeLine = lines.find((line: string) => line.includes('장보기'));
      expect(activeLine).toBeDefined();
      expect(activeLine).toMatch(/[☐◻\[ \]◯○]/);
    });

    it('이월된 항목에 이월 표시가 포함된다', () => {
      const result = formatShareData(mockTodos, '2026-03-31');

      const lines = result.split('\n');
      const carriedOverLine = lines.find((line: string) =>
        line.includes('이월된 할 일'),
      );
      expect(carriedOverLine).toBeDefined();
      expect(carriedOverLine).toMatch(/[→➡↪🔄]/);
    });
  });

  describe('빈 목록 처리', () => {
    it('빈 할 일 목록은 빈 문자열을 반환한다', () => {
      const result = formatShareData([], '2026-03-31');

      expect(result).toBe('');
    });
  });

  describe('단일 항목', () => {
    it('단일 할 일을 올바르게 포맷한다', () => {
      const singleTodo: Todo[] = [mockTodos[0]];
      const result = formatShareData(singleTodo, '2026-03-31');

      expect(result).toContain('운동하기');
      expect(result).toContain('2026-03-31');
    });
  });
});

describe('formatShareTitle', () => {
  it('날짜가 포함된 제목을 생성한다', () => {
    const title = formatShareTitle('2026-03-31');

    expect(title).toContain('2026-03-31');
  });

  it('빈 문자열이 아닌 제목을 반환한다', () => {
    const title = formatShareTitle('2026-03-31');

    expect(title.length).toBeGreaterThan(0);
  });
});
