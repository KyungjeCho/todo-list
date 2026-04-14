import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { GetProfileUsecase } from './application/get-profile.usecase';
import { UpdateSettingsUsecase } from './application/update-settings.usecase';
import { CompleteOnboardingUsecase } from './application/complete-onboarding.usecase';
import { UserRepository } from './infrastructure/user.repository';
import { User } from './domain/user.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationModule],
  controllers: [UserController],
  providers: [
    GetProfileUsecase,
    UpdateSettingsUsecase,
    CompleteOnboardingUsecase,
    UserRepository,
  ],
  exports: [UserRepository],
})
export class UserModule {}
