import { apiClient } from './client';
import type {
  UserProfile,
  UpdateSettingsRequest,
  DeviceType,
} from '../../types/user';

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  async updateSettings(data: UpdateSettingsRequest): Promise<UserProfile> {
    const response = await apiClient.patch('/users/me/settings', data);
    return response.data;
  },

  async registerDevice(data: {
    fcmToken: string;
    deviceType: DeviceType;
    deviceName?: string;
  }): Promise<void> {
    await apiClient.post('/users/me/devices', data);
  },
};
