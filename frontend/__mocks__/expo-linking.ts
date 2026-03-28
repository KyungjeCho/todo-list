export const createURL = jest.fn((path: string) => `todolist://${path}`);

export const parse = jest.fn((url: string) => {
  const parsed = new URL(url);
  const queryParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  return { queryParams };
});
