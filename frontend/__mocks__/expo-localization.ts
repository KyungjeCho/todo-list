export const getLocales = jest.fn().mockReturnValue([
  { languageCode: 'ko', languageTag: 'ko-KR' },
]);

export const getCalendars = jest.fn().mockReturnValue([
  { timeZone: 'Asia/Seoul' },
]);
