import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  setupFiles: ['<rootDir>/test/setup.ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    // WHY: TS nodenext 는 동적 import 에 `.js` 확장자를 강제하지만, ts-jest 의
    // 기본 resolver 는 `.js` → `.ts` 매핑을 자동으로 못 한다. 상대 경로의 `.js`
    // 접미사를 벗겨서 Jest 가 `.ts` 원본을 찾게 한다.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
