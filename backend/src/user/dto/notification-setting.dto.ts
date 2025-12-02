import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  NEW_TOPIC = 'NEW_TOPIC',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  VOTE_REMINDER = 'VOTE_REMINDER',
  ADMIN_NOTICE = 'ADMIN_NOTICE',
  BREAKING_NEWS = 'BREAKING_NEWS',
  EXCLUSIVE_NEWS = 'EXCLUSIVE_NEWS',
}

export class NotificationSettingDto {
  @ApiProperty({
    enum: NotificationType,
    description: '알림 유형',
    example: NotificationType.NEW_TOPIC,
  })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiProperty({
    description: '알림 사용 여부',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;
}
