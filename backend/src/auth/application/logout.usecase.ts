import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../infrastructure/auth.repository';
import { UserDeviceRepository } from '../../notification/infrastructure/user-device.repository';

interface LogoutInput {
  refreshToken: string;
  fcmToken: string;
}

interface LogoutOutput {
  message: string;
}

@Injectable()
export class LogoutUsecase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userDeviceRepository: UserDeviceRepository,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutOutput> {
    const session = await this.authRepository.findSessionByRefreshToken(
      input.refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    await this.authRepository.deleteSession(session.id);
    await this.userDeviceRepository.deleteByFcmToken(input.fcmToken);

    return { message: 'Successfully logged out' };
  }
}
