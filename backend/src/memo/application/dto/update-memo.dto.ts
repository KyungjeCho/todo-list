import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMemoDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
