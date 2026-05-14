function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export default () => ({
  app: {
    port: parseInt(process.env.APP_PORT || '3000', 10),
    deepLinkScheme: process.env.APP_DEEP_LINK_SCHEME || 'todolist',
    allowedRedirectUris: process.env.APP_ALLOWED_REDIRECT_URIS || '',
  },
  // WHY: Lambda 런타임은 단일 DATABASE_URL 만 SSM 로 주입. 로컬/CI 는 HOST/PORT/USER
  // 개별 env. URL 이 있으면 그 값을 그대로 노출하고 개별 필드는 강제하지 않는다.
  // 다만 production 에서 둘 다 없으면 NestJS 가 localhost 폴백으로 부팅돼 침묵 실패
  // 하는 것을 막기 위해 즉시 throw. (INFRA_SPEC.md §3.2)
  database: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        name: process.env.DATABASE_NAME || 'postgres',
      }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username:
          process.env.NODE_ENV === 'production'
            ? getRequiredEnv('DATABASE_USERNAME')
            : process.env.DATABASE_USERNAME || 'postgres',
        password:
          process.env.NODE_ENV === 'production'
            ? getRequiredEnv('DATABASE_PASSWORD')
            : process.env.DATABASE_PASSWORD || 'postgres',
        name: process.env.DATABASE_NAME || 'todolist',
      },
  jwt: {
    secret: getRequiredEnv('JWT_SECRET'),
    refreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  oauth: {
    stateSecret: getRequiredEnv('OAUTH_STATE_SECRET'),
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      callbackUrl: process.env.NAVER_CALLBACK_URL,
    },
    kakao: {
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackUrl: process.env.KAKAO_CALLBACK_URL,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackUrl: process.env.APPLE_CALLBACK_URL,
    },
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
});
