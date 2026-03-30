import { IsDateString, IsNotEmpty } from 'class-validator';
import type { TodoStatsDto } from './todo-response.dto';

export class CompleteDayDto {
  @IsDateString()
  @IsNotEmpty()
  date!: string;
}

export interface CarriedOverTodoDto {
  fromTodoId: string;
  toTodoId: string;
  content: string;
}

export interface CompleteDayResponseDto {
  date: string;
  stats: TodoStatsDto;
  carriedOverCount: number;
  carriedOverTodos: CarriedOverTodoDto[];
}
