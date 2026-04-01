import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetTodosQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be YYYY-MM-DD format',
  })
  date!: string;
}
