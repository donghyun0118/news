import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TopicType {
  VOTING = 'VOTING',
  DEFAULT = 'DEFAULT',
}

export class CreateTopicDto {
  @ApiProperty({ description: '토픽 제목', example: '2024 총선' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: '핵심 키워드', example: '총선' })
  @IsString()
  @IsNotEmpty()
  core_keyword!: string;

  @ApiProperty({
    description: '검색 키워드 (콤마로 구분)',
    example: '총선,국회의원,선거',
  })
  @IsString()
  @IsNotEmpty()
  search_keywords!: string;

  @ApiPropertyOptional({
    description: '부연 설명',
    example: '제22대 국회의원 선거',
  })
  @IsString()
  @IsOptional()
  sub_description?: string;

  @ApiPropertyOptional({
    description: '토픽 유형',
    enum: TopicType,
    default: TopicType.VOTING,
  })
  @IsEnum(TopicType)
  @IsOptional()
  topic_type?: TopicType;
}
