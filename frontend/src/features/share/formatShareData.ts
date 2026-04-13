import type { Todo, TodoStatus } from '../../types/todo';
import i18n from '../../i18n';

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

  const header = i18n.t('share.shareHeader', { date });
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
  return i18n.t('share.shareTitle', { date });
}
