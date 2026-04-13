export class OAuthCallbackDto {
  provider!: string;
  providerUserId!: string;
  providerUserEmail!: string;
  providerUserName!: string;
  fcmToken?: string;
  deviceType!: 'IOS' | 'ANDROID';
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  timezone?: string;
  language?: string;
}

export class OAuthCallbackResponseDto {
  accessToken!: string;
  refreshToken!: string;
  isNewUser!: boolean;
}
