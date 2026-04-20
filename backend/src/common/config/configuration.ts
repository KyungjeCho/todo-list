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
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    // WHY: 프로덕션에서 기본값 폴백 방지 — 환경변수 누락 시 즉시 실패
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
