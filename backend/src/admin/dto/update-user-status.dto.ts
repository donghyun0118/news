import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: UserStatus, description: '사용자 상태' })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ description: '경고 횟수' })
  @IsInt()
  @IsOptional()
  warning_count?: number;
}
