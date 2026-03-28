import type { Config } from 'jest';

const config: Config = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  testRegex: '(/__tests__/.*\\.(test|spec))\\.(ts|tsx)$',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: './coverage',
  setupFiles: ['./jest.setup.ts'],
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^expo-web-browser$': '<rootDir>/__mocks__/expo-web-browser.ts',
    '^expo-linking$': '<rootDir>/__mocks__/expo-linking.ts',
  },
};

export default config;
