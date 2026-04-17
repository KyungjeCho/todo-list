import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMemoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
