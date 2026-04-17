import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import configuration from './common/config/configuration';
import { databaseConfig } from './common/config/database.config';
import { RequestContextInterceptor } from './common/context/request-context.interceptor';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TodoModule } from './todo/todo.module';
import { MemoModule } from './memo/memo.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        ...configService.get<TypeOrmModuleOptions>('database')!,
      }),
    }),
    // WHY: 계층별 rate limit으로 DDoS/브루트포스를 완화한다.
    // short(1초 3회): 버스트 요청 차단, medium(10초 20회): 지속적 남용 방지,
    // long(1분 100회): 전체 처리량 상한. 엔드포인트별 @Throttle로 더 엄격한 제한 가능.
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UserModule,
    TodoModule,
    MemoModule,
    SchedulerModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
