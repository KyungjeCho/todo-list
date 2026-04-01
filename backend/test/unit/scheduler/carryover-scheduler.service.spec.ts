import { CarryoverSchedulerService } from 'src/scheduler/carryover-scheduler.service';

describe('CarryoverSchedulerService', () => {
  let service: CarryoverSchedulerService;

  const mockUsecase = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CarryoverSchedulerService(mockUsecase as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCarryover', () => {
    it('should call usecase.execute with current date', async () => {
      mockUsecase.execute.mockResolvedValue(undefined);

      await service.handleCarryover();

      expect(mockUsecase.execute).toHaveBeenCalledTimes(1);
      expect(mockUsecase.execute).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should not throw when usecase fails', async () => {
      mockUsecase.execute.mockRejectedValue(new Error('DB error'));

      await expect(service.handleCarryover()).resolves.not.toThrow();
    });
  });
});
