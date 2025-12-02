import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationType } from '../../notifications/dto/send-notification.dto';

export class AdminNotificationDto {
  @ApiPropertyOptional({
    description: '수신자 ID (생략 시 전체 발송)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  user_id?: number;

  @ApiProperty({ description: '알림 메시지', example: '서버 점검 안내' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: '관련 URL', example: '/notice/1' })
  @IsString()
  @IsOptional()
  related_url?: string;

  @ApiPropertyOptional({
    description: '알림 유형',
    enum: NotificationType,
    default: NotificationType.ADMIN_NOTICE,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}
