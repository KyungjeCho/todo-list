export enum DraftTodoStatus {
  REFINING = 'refining',
  READY = 'ready',
  ERROR = 'error',
}

export interface DraftTodo {
  id: string;
  rawText: string;
  refinedText: string | null;
  status: DraftTodoStatus;
}
