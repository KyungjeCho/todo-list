import { apiClient } from './client';
import type { UserProfile, UpdateSettingsRequest } from '../../types/user';

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  async updateSettings(data: UpdateSettingsRequest): Promise<UserProfile> {
    const response = await apiClient.patch('/users/me/settings', data);
    return response.data;
  },
};
