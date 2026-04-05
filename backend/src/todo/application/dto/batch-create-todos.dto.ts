import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Matches,
  MaxLength,
} from 'class-validator';

export class BatchCreateTodoItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  content!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'todoDate must be YYYY-MM-DD format',
  })
  todoDate!: string;
}

export class BatchCreateTodosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BatchCreateTodoItemDto)
  todos!: BatchCreateTodoItemDto[];
}
