import { apiClient } from './client';
import type {
  UserProfile,
  UpdateSettingsRequest,
  DeviceType,
} from '../../types/user';

// WHY(fix-bug-01 ①/②): Postgres `time` 컬럼이 `HH:mm:ss`로 반환되는 한편, 백엔드 validator와
// 클라이언트 UI는 `HH:mm`만 허용한다. API 경계에서 양방향으로 정규화하여 화면/요청 모두 포맷을
// 일치시키고, 알림 OFF→ON 시 과거 값(`08:00:00`)이 재전송돼 422가 발생하는 문제를 차단한다.
function toHmm(value: string | null): string | null {
  if (value === null) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    planTime: toHmm(profile.planTime),
    reviewTime: toHmm(profile.reviewTime),
  };
}

function normalizeSettingsRequest(
  data: UpdateSettingsRequest,
): UpdateSettingsRequest {
  // WHY: undefined 필드는 "변경하지 않음"이므로 유지하고, null/string만 정규화 대상.
  const next: UpdateSettingsRequest = { ...data };
  if (data.planTime !== undefined) next.planTime = toHmm(data.planTime);
  if (data.reviewTime !== undefined) next.reviewTime = toHmm(data.reviewTime);
  return next;
}

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/users/me');
    return normalizeProfile(response.data);
  },

  async updateSettings(data: UpdateSettingsRequest): Promise<UserProfile> {
    const response = await apiClient.patch<UserProfile>(
      '/users/me/settings',
      normalizeSettingsRequest(data),
    );
    return normalizeProfile(response.data);
  },

  async completeOnboarding(): Promise<UserProfile> {
    const response = await apiClient.post<UserProfile>(
      '/users/me/onboarding/complete',
    );
    return normalizeProfile(response.data);
  },

  async registerDevice(data: {
    fcmToken: string;
    deviceType: DeviceType;
    deviceName?: string;
  }): Promise<void> {
    await apiClient.post('/users/me/devices', data);
  },
};
