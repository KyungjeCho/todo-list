export enum WebBrowserResultType {
  CANCEL = 'cancel',
  DISMISS = 'dismiss',
  LOCKED = 'locked',
  OPENED = 'opened',
}

export const openAuthSessionAsync = jest.fn().mockResolvedValue({
  type: 'cancel',
});

export const openBrowserAsync = jest.fn().mockResolvedValue({
  type: 'cancel',
});
