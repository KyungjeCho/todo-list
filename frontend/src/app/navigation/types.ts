export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: { mode?: 'PLAN' | 'REVIEW' } | undefined;
  Settings: undefined;
  VoiceInput: { todoDate: string };
  TimezoneSelect: { current: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Settings: undefined;
};
