import { togglePlanNotification } from 'src/features/notification/planNotificationToggle';

describe('togglePlanNotification', () => {
  const baseInput = {
    defaultPlanTime: '08:00',
  };

  it('OFF→ON optimistic 후 성공 시 롤백 호출 없음', async () => {
    const optimistic = jest.fn();
    const rollback = jest.fn();
    const updateSettings = jest.fn().mockResolvedValue({});

    await togglePlanNotification({
      ...baseInput,
      next: true,
      updateSettings,
      onOptimistic: optimistic,
      onRollback: rollback,
    });

    expect(optimistic).toHaveBeenCalledWith(true);
    expect(updateSettings).toHaveBeenCalledWith({ planTime: '08:00' });
    expect(rollback).not.toHaveBeenCalled();
  });

  it('ON→OFF optimistic은 planTime: null 저장을 호출한다', async () => {
    const optimistic = jest.fn();
    const updateSettings = jest.fn().mockResolvedValue({});

    await togglePlanNotification({
      ...baseInput,
      next: false,
      updateSettings,
      onOptimistic: optimistic,
      onRollback: jest.fn(),
    });

    expect(updateSettings).toHaveBeenCalledWith({ planTime: null });
  });

  it('저장 실패 시 이전 값으로 롤백되고 에러가 전파된다', async () => {
    const optimistic = jest.fn();
    const rollback = jest.fn();
    const onError = jest.fn();
    const err = new Error('network');
    const updateSettings = jest.fn().mockRejectedValue(err);

    await expect(
      togglePlanNotification({
        ...baseInput,
        next: true,
        updateSettings,
        onOptimistic: optimistic,
        onRollback: rollback,
        onError,
      }),
    ).rejects.toThrow('network');

    expect(optimistic).toHaveBeenCalledWith(true);
    expect(rollback).toHaveBeenCalledWith(false);
    expect(onError).toHaveBeenCalledWith(err);
  });
});
