import { IsNotEmpty, IsString, Matches } from 'class-validator';
import type { TodoItemDto } from './todo-response.dto';

export class VoiceTodoDateDto {
  @IsNotEmpty({ message: 'todoDate is required' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'todoDate must be YYYY-MM-DD format',
  })
  todoDate!: string;
}

export interface VoiceTodoResponseDto extends TodoItemDto {
  rawText: string;
}
