import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('soundService.ts — 오디오 세션 기본 정책 준수', () => {
  const sourcePath = resolve(
    __dirname,
    '../../../../src/features/sound/soundService.ts',
  );
  const source = readFileSync(sourcePath, 'utf8');

  it('setAudioModeAsync를 import/호출하지 않는다 (research.md R2)', () => {
    expect(source).not.toMatch(/setAudioModeAsync/);
  });

  it('AudioModule/AudioSession 관련 커스텀 설정을 하지 않는다', () => {
    expect(source).not.toMatch(/AudioModule/);
    expect(source).not.toMatch(/setAudioMode/);
  });
});
