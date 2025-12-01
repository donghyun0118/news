import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';

export enum NotificationType {
  NEW_TOPIC = 'NEW_TOPIC',
  BREAKING_NEWS = 'BREAKING_NEWS',
  EXCLUSIVE_NEWS = 'EXCLUSIVE_NEWS',
  ADMIN_NOTICE = 'ADMIN_NOTICE',
  TOPIC_RESULT = 'TOPIC_RESULT',
}

export class SendNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    description: '알림의 종류',
    example: NotificationType.BREAKING_NEWS,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  notification_type: NotificationType;

  @ApiProperty({
    description: '알림에 포함될 데이터 객체',
    example: {
      title: '속보: 새로운 이벤트 발생',
      source: '메인 뉴스',
      url: 'https://example.com/news/123',
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
