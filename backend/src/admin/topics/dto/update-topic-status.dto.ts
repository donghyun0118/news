import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TopicStatus {
  PUBLISHED = 'PUBLISHED',
  SUGGESTED = 'SUGGESTED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
  PREPARING = 'PREPARING',
}

export class UpdateTopicStatusDto {
  @ApiProperty({
    description: '토픽 상태',
    enum: TopicStatus,
    example: TopicStatus.PUBLISHED,
  })
  @IsEnum(TopicStatus)
  @IsNotEmpty()
  status!: TopicStatus;
}
