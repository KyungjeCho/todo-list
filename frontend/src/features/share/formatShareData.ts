import type { Todo, TodoStatus } from '../../types/todo';

const STATUS_ICONS: Record<TodoStatus, string> = {
  COMPLETED: '✓',
  ACTIVE: '☐',
  INACTIVE: '☐',
  CARRIED_OVER: '→',
};

/**
 * 할 일 목록을 공유용 텍스트 형식으로 변환한다.
 */
export function formatShareData(todos: Todo[], date: string): string {
  if (todos.length === 0) {
    return '';
  }

  const header = `${date} 할 일 목록`;
  const lines = todos.map((todo) => {
    const icon = STATUS_ICONS[todo.status];
    return `${icon} ${todo.content}`;
  });

  return [header, '', ...lines].join('\n');
}

/**
 * 공유 제목을 생성한다.
 */
export function formatShareTitle(date: string): string {
  return `${date} 할 일 목록`;
}
