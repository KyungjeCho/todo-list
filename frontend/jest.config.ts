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
    'node_modules/(?!(@react-native|react-native|react-native-svg|@react-native-community|@react-native-firebase)/)',
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
    '^expo-clipboard$': '<rootDir>/__mocks__/expo-clipboard.ts',
    '^expo-audio$': '<rootDir>/__mocks__/expo-audio.ts',
    '^expo-localization$': '<rootDir>/__mocks__/expo-localization.ts',
    '^@react-native-community/datetimepicker$': '<rootDir>/__mocks__/@react-native-community/datetimepicker.tsx',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.tsx',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.tsx',
    '\\.(mp3|wav|m4a|ogg)$': '<rootDir>/__mocks__/audio-asset.ts',
  },
};

export default config;
