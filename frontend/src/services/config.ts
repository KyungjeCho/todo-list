interface AppConfig {
  apiBaseUrl: string;
}

const config: AppConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000',
};

export default config;
