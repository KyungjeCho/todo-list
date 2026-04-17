/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { UserValidationService } from '../../../../src/common/services/user-validation.service';
import { UserRepository } from '../../../../src/user/infrastructure/user.repository';
import { ERROR_CODES } from '../../../../src/common/constants/error-codes';

describe('UserValidationService', () => {
  let service: UserValidationService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = {
      findByUserAuthId: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    service = new UserValidationService(userRepository);
  });

  describe('ensureUserExists', () => {
    it('should return the user when found', async () => {
      const mockUser = { id: 'user-1', userAuthId: 'auth-1', userName: 'Test' };
      userRepository.findByUserAuthId.mockResolvedValue(mockUser as never);

      const result = await service.ensureUserExists('auth-1');

      expect(result).toBe(mockUser);
      expect(userRepository.findByUserAuthId).toHaveBeenCalledWith('auth-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(service.ensureUserExists('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.ensureUserExists('nonexistent')).rejects.toThrow(
        ERROR_CODES.USER_NOT_FOUND,
      );
    });
  });
});
