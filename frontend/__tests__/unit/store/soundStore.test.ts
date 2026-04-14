import * as SecureStore from 'expo-secure-store';
import { useSoundStore } from 'src/store/soundStore';

const STORAGE_KEY = 'ui.buttonClickSound.enabled';

describe('soundStore', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    useSoundStore.setState({ enabled: true, hydrated: false });
    jest.restoreAllMocks();
  });

  it('기본값은 enabled=true, hydrated=false', () => {
    const state = useSoundStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.hydrated).toBe(false);
  });

  it('hydrate()가 저장된 "false"를 읽어 메모리 상태를 갱신한다', async () => {
    await SecureStore.setItemAsync(STORAGE_KEY, 'false');

    await useSoundStore.getState().hydrate();

    const state = useSoundStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.hydrated).toBe(true);
  });

  it('hydrate()가 저장된 "true"를 그대로 반영한다', async () => {
    await SecureStore.setItemAsync(STORAGE_KEY, 'true');

    await useSoundStore.getState().hydrate();

    expect(useSoundStore.getState().enabled).toBe(true);
    expect(useSoundStore.getState().hydrated).toBe(true);
  });

  it('저장된 값이 손상되면 enabled=true로 폴백하고 저장소를 치유한다', async () => {
    await SecureStore.setItemAsync(STORAGE_KEY, 'garbage');

    await useSoundStore.getState().hydrate();

    expect(useSoundStore.getState().enabled).toBe(true);
    const healed = await SecureStore.getItemAsync(STORAGE_KEY);
    expect(healed).toBe('true');
  });

  it('secure-store 읽기 실패 시에도 enabled=true로 폴백한다', async () => {
    jest
      .spyOn(SecureStore, 'getItemAsync')
      .mockRejectedValueOnce(new Error('read fail'));

    await useSoundStore.getState().hydrate();

    expect(useSoundStore.getState().enabled).toBe(true);
    expect(useSoundStore.getState().hydrated).toBe(true);
  });

  it('setEnabled(false)는 메모리 상태를 즉시 갱신하고 secure-store에 저장한다', async () => {
    const writeSpy = jest.spyOn(SecureStore, 'setItemAsync');

    await useSoundStore.getState().setEnabled(false);

    expect(useSoundStore.getState().enabled).toBe(false);
    expect(writeSpy).toHaveBeenCalledWith(STORAGE_KEY, 'false');
  });

  it('setEnabled(true)는 "true" 문자열을 저장한다', async () => {
    const writeSpy = jest.spyOn(SecureStore, 'setItemAsync');

    await useSoundStore.getState().setEnabled(true);

    expect(useSoundStore.getState().enabled).toBe(true);
    expect(writeSpy).toHaveBeenCalledWith(STORAGE_KEY, 'true');
  });

  it('setEnabled의 쓰기 실패는 throw하지 않으며 메모리 상태는 유지된다', async () => {
    jest
      .spyOn(SecureStore, 'setItemAsync')
      .mockRejectedValueOnce(new Error('write fail'));

    await expect(
      useSoundStore.getState().setEnabled(false),
    ).resolves.toBeUndefined();

    expect(useSoundStore.getState().enabled).toBe(false);
  });
});
