import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextStore {
  currentUserId: string;
}

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export class RequestContext {
  private static readonly storage =
    new AsyncLocalStorage<RequestContextStore>();

  static run(store: RequestContextStore, callback: () => void): void {
    this.storage.run(store, callback);
  }

  static getCurrentUserId(): string {
    return this.storage.getStore()?.currentUserId ?? SYSTEM_USER_ID;
  }
}
