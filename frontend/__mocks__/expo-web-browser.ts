export const openAuthSessionAsync = jest.fn().mockResolvedValue({
  type: 'cancel',
});

export const openBrowserAsync = jest.fn().mockResolvedValue({
  type: 'cancel',
});
