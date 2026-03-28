import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserSettableStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

export class ChangeTodoStatusDto {
  @IsNotEmpty()
  @IsEnum(UserSettableStatus, {
    message: 'status must be one of: ACTIVE, INACTIVE, COMPLETED',
  })
  status!: UserSettableStatus;
}
