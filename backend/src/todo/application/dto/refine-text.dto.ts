import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RefineTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}
