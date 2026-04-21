import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'fcm_device_install_id';

/**
 * WHY(R-004): 같은 사용자가 같은 모델 iPhone 2 대를 쓰면 `Device.modelName` 만으로는
 * 구분이 안 되어 백엔드 soft-delete 가 한 대 행을 지워버린다. 앱 설치당 1 회 생성되어
 * 해당 설치가 사라질 때까지 유지되는 UUID 를 SecureStore 에 보관하고, 이를 포함한
 * `deviceName` 문자열로 백엔드 스코핑 키를 고유화한다.
 *
 * SecureStore 는 iOS Keychain / Android Keystore 에 저장되므로 앱 삭제 시 함께 사라지는
 * per-install 식별자 특성이 자연스럽게 확보된다.
 */
function generateUuidV4(): string {
  // WHY: RN 0.83 + Hermes 에서 `crypto.randomUUID` 가 환경에 따라 없을 수 있어 의존성 없이
  // Math.random 으로 v4 포맷을 합성한다. 디바이스 식별자 용도이므로 암호학적 강도는 불요.
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}

export async function getOrCreateInstallId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(STORAGE_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }
  const fresh = generateUuidV4();
  await SecureStore.setItemAsync(STORAGE_KEY, fresh);
  return fresh;
}
