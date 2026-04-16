import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMemoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
