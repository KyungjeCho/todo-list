import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import helmet from 'helmet';
import type { Callback, Context, Handler } from 'aws-lambda';
import type { Express } from 'express';
import { AppModule } from './app.module';
import { loadSecretsFromSsm } from './common/config/ssm-loader';

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
  // WHY: NestFactory.create 가 AppModule 초기화 중 DB/JWT 시크릿을 읽으므로
  // 부트스트랩 전에 SSM 에서 process.env 로 주입되어야 한다.
  await loadSecretsFromSsm();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  return serverlessExpress({ app: expressApp }) as unknown as Handler;
}

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback) as Promise<unknown>;
};
