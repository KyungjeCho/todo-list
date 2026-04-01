import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMonthlySummaryQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'year must be an integer' })
  @Min(2000, { message: 'year must be at least 2000' })
  year!: number;

  @Type(() => Number)
  @IsInt({ message: 'month must be an integer' })
  @Min(1, { message: 'month must be between 1 and 12' })
  @Max(12, { message: 'month must be between 1 and 12' })
  month!: number;
}

export interface DaySummaryDto {
  date: string;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  carriedOverCount: number;
}

export interface MonthlySummaryResponseDto {
  year: number;
  month: number;
  days: DaySummaryDto[];
}
