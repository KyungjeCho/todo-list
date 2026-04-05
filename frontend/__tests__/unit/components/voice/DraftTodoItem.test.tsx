import { render, fireEvent } from '@testing-library/react-native';
import { DraftTodoItem } from 'src/components/voice/DraftTodoItem';
import { DraftTodoStatus } from 'src/features/voice/types';
import type { DraftTodo } from 'src/features/voice/types';

describe('DraftTodoItem', () => {
  const baseDraft: DraftTodo = {
    id: 'draft-1',
    rawText: '장보기 가야 돼',
    refinedText: '내일까지 장보기',
    status: DraftTodoStatus.READY,
  };

  it('ready 상태일 때 정리된 텍스트를 표시한다', () => {
    const { getByText } = render(
      <DraftTodoItem draft={baseDraft} onRemove={jest.fn()} />,
    );

    expect(getByText('내일까지 장보기')).toBeTruthy();
  });

  it('refining 상태일 때 로딩 스피너를 표시한다', () => {
    const draft: DraftTodo = {
      ...baseDraft,
      refinedText: null,
      status: DraftTodoStatus.REFINING,
    };

    const { getByTestId, getByText } = render(
      <DraftTodoItem draft={draft} onRemove={jest.fn()} />,
    );

    expect(getByTestId('draft-loading-spinner')).toBeTruthy();
    expect(getByText('장보기 가야 돼')).toBeTruthy();
  });

  it('error 상태일 때 "정리 실패" 라벨을 표시한다', () => {
    const draft: DraftTodo = {
      ...baseDraft,
      refinedText: '장보기 가야 돼',
      status: DraftTodoStatus.ERROR,
    };

    const { getByText } = render(
      <DraftTodoItem draft={draft} onRemove={jest.fn()} />,
    );

    expect(getByText('정리 실패')).toBeTruthy();
    expect(getByText('장보기 가야 돼')).toBeTruthy();
  });

  it('X 버튼 탭 시 onRemove 콜백을 즉시 호출한다', () => {
    const onRemove = jest.fn();

    const { getByTestId } = render(
      <DraftTodoItem draft={baseDraft} onRemove={onRemove} />,
    );

    fireEvent.press(getByTestId('draft-remove-draft-1'));

    expect(onRemove).toHaveBeenCalledWith('draft-1');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
