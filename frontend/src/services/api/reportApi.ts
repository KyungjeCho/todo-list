import { apiClient } from './client';

export interface DaySummary {
  date: string;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  carriedOverCount: number;
}

export interface MonthlySummaryResponse {
  year: number;
  month: number;
  days: DaySummary[];
}

export const reportApi = {
  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<MonthlySummaryResponse> {
    const response = await apiClient.get('/todos/report/summary', {
      params: { year, month },
    });
    return response.data as MonthlySummaryResponse;
  },
};
