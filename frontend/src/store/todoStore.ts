import { create } from 'zustand';
import type { Todo, TodoMemo } from '../types/todo';
import { getCurrentDate } from '../features/todo/getCurrentDate';

interface TodoState {
  todos: Todo[];
  selectedDate: string;
  memos: Record<string, TodoMemo[]>;
  isLoading: boolean;
  error: string | null;

  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  removeTodo: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setMemos: (todoId: string, memos: TodoMemo[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  selectedDate: getCurrentDate(),
  memos: {},
  isLoading: false,
  error: null,

  setTodos: (todos) => set({ todos }),

  addTodo: (todo) =>
    set((state) => {
      if (state.todos.some((t) => t.id === todo.id)) {
        return state;
      }
      return { todos: [...state.todos, todo] };
    }),

  updateTodo: (id, updates) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    })),

  setSelectedDate: (date) =>
    set({ selectedDate: date, todos: [], isLoading: false, error: null }),

  setMemos: (todoId, memos) =>
    set((state) => ({
      memos: { ...state.memos, [todoId]: memos },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
