import { IsString, MinLength, MaxLength } from 'class-validator';

export class RefineTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;
}
