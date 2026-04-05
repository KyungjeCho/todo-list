import { Alert } from 'react-native';
import { render } from '@testing-library/react-native';

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
let beforeRemoveHandler: ((e: { preventDefault: () => void; data: { action: unknown } }) => void) | null = null;

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('src/services/api/todoApi', () => ({
  todoApi: {
    refineText: jest.fn().mockResolvedValue({ refinedText: '장보기' }),
    batchCreateTodos: jest.fn().mockResolvedValue({ created: [] }),
  },
}));

jest.spyOn(Alert, 'alert');

import { VoiceInputScreen } from 'src/screens/voice/VoiceInputScreen';

const createMockRoute = () => ({
  params: { todoDate: '2026-04-04' },
  key: 'VoiceInput-1',
  name: 'VoiceInput' as const,
});

const createMockNavigation = () => ({
  goBack: mockGoBack,
  dispatch: mockDispatch,
  addListener: jest.fn().mockImplementation(
    (event: string, handler: (e: { preventDefault: () => void; data: { action: unknown } }) => void) => {
      if (event === 'beforeRemove') {
        beforeRemoveHandler = handler;
      }
      return jest.fn();
    },
  ),
  navigate: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
  isFocused: jest.fn().mockReturnValue(true),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  pop: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  popTo: jest.fn(),
  popToTop: jest.fn(),
});

describe('VoiceInputScreen - 뒤로가기', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    beforeRemoveHandler = null;
  });

  it('임시 할 일이 0개일 때 뒤로가기하면 다이얼로그 없이 통과한다', () => {
    render(
      <VoiceInputScreen
        route={createMockRoute() as never}
        navigation={createMockNavigation() as never}
      />,
    );

    if (beforeRemoveHandler) {
      const mockEvent = {
        preventDefault: jest.fn(),
        data: { action: { type: 'GO_BACK' } },
      };
      beforeRemoveHandler(mockEvent);

      // drafts가 비어 있으므로 확인 다이얼로그가 표시되지 않음
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('음성 입력 화면을 렌더링한다', () => {
    const { getByText } = render(
      <VoiceInputScreen
        route={createMockRoute() as never}
        navigation={createMockNavigation() as never}
      />,
    );

    expect(getByText('음성 할 일 입력')).toBeTruthy();
  });
});
