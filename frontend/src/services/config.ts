interface AppConfig {
  apiBaseUrl: string;
}

const apiBaseUrl: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  'http://localhost:3000';

if (!__DEV__ && apiBaseUrl.startsWith('http://')) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL must use HTTPS in production builds',
  );
}

const config: AppConfig = {
  apiBaseUrl,
};

export default config;
